import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import SessionTabs from "@/components/layout/SessionTabs";
import Link from "next/link";
import MembersButton from "./MembersButton";

export default async function ClassLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: cls } = await supabase
    .from("classes")
    .select("id, title, subject, level, cycle_hours, description, tutor_notes, created_by")
    .eq("id", id)
    .single();

  if (!cls) redirect("/dashboard");

  const { data: membership } = await supabase
    .from("class_members")
    .select("role")
    .eq("class_id", id)
    .eq("user_id", user.id)
    .single();

  if (!membership) redirect("/dashboard");

  const { data: profile } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const { data: allCycles } = await supabase
    .from("payment_cycles")
    .select("id, cycle_number, closed_at")
    .eq("class_id", id)
    .order("cycle_number", { ascending: true });

  const { data: completedLessons } = await supabase
    .from("lessons")
    .select("id, duration_hours, payment_cycle_id")
    .eq("class_id", id)
    .eq("status", "completed")
    .is("deleted_at", null);

  const { data: classMembers } = await supabase
    .from("class_members")
    .select("user_id, role, users (full_name)")
    .eq("class_id", id);

  const members = (classMembers ?? []).map((m: any) => ({
    id: m.user_id,
    full_name: m.users?.full_name ?? "Unknown",
    role: m.role,
  }));

  const cycles = allCycles ?? [];
  const lessons = completedLessons ?? [];
  const cycleTarget = cls.cycle_hours;

  const openCycle = cycles.find(c => !c.closed_at);
  let cycleHoursCompleted = 0;
  if (openCycle) {
    cycleHoursCompleted = lessons
      .filter(l => l.payment_cycle_id === openCycle.id)
      .reduce((sum, l) => sum + (l.duration_hours ?? 0), 0);
  }

  const initials = cls.title.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
  const fullName = profile?.full_name ?? "";
  const userInitials = fullName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  const student = {
    id,
    name: cls.title,
    initials,
    grade: [cls.subject, cls.level].filter(Boolean).join(" · ") || "",
    cycleNumber: openCycle?.cycle_number ?? 1,
    cycleHours: cycleHoursCompleted,
    cycleTotal: cycleTarget,
    subject: cls.subject ?? null,
    level: cls.level ?? null,
    description: cls.description ?? null,
    tutor_notes: cls.tutor_notes ?? null,
    cycleHoursTarget: cycleTarget,
    isCreator: cls.created_by === user.id,
  };

  return (
    <AppLayout
      mode="session"
      student={student}
      tutorInitials={userInitials}
      tutorName={fullName}
      role={membership.role as any}
    >
      <div className="shrink-0" style={{ borderBottom: "0.5px solid var(--color-ss-border)" }}>
        <div className="px-6 pt-5 flex items-center justify-between">
          <div className="text-[11px] mb-3" style={{ color: "var(--color-ss-text-ghost)" }}>
            Classes{" "}
            <span style={{ color: "#8a7a60" }}>› {cls.title} ›</span>
          </div>
          {membership.role === "tutor" && (
            <div className="flex items-center gap-2 mb-3">
              <MembersButton
                classId={id}
                members={members}
                currentUserId={user.id}
              />
              <Link
                href={`/classes/${id}/invite`}
                className="text-[12px] font-medium px-3 py-1 rounded"
                style={{ color: "var(--color-ss-amber-light)", background: "var(--color-ss-amber-dim)", border: "0.5px solid var(--color-ss-amber-border)" }}
              >
                + Invite
              </Link>
            </div>
          )}
        </div>
        <div className="px-6">
          <SessionTabs studentId={id} />
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </AppLayout>
  );
}