import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import SessionTabs from "@/components/layout/SessionTabs";

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

  // Fetch class details
  const { data: cls } = await supabase
    .from("classes")
    .select("id, title, subject, level, cycle_hours")
    .eq("id", id)
    .single();

  if (!cls) redirect("/dashboard");

  // Fetch user's membership in this class
  const { data: membership } = await supabase
    .from("class_members")
    .select("role")
    .eq("class_id", id)
    .eq("user_id", user.id)
    .single();

  if (!membership) redirect("/dashboard");

  // Fetch user profile
  const { data: profile } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", user.id)
    .single();

  // Fetch open payment cycle
  const { data: cycle } = await supabase
    .from("payment_cycles")
    .select("id, cycle_number, closed_at")
    .eq("class_id", id)
    .is("closed_at", null)
    .order("cycle_number", { ascending: false })
    .limit(1)
    .single();

  // Compute hours in current cycle
  let cycleHours = 0;
  if (cycle) {
    const { data: lessons } = await supabase
      .from("lessons")
      .select("duration_hours")
      .eq("class_id", id)
      .eq("payment_cycle_id", cycle.id)
      .eq("status", "completed")
      .is("deleted_at", null);

    cycleHours = (lessons ?? []).reduce((sum, l) => sum + (l.duration_hours ?? 0), 0);
  }

  const initials = cls.title.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
  const fullName = profile?.full_name ?? "";
  const userInitials = fullName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  const student = {
    id,
    name: cls.title,
    initials,
    grade: [cls.subject, cls.level].filter(Boolean).join(" · ") || "",
    cycleNumber: cycle?.cycle_number ?? 1,
    cycleHours,
    cycleTotal: cls.cycle_hours,
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
        <div className="px-6 pt-5">
          <div className="text-[11px] mb-3" style={{ color: "var(--color-ss-text-ghost)" }}>
            Classes{" "}
            <span style={{ color: "#8a7a60" }}>› {cls.title} ›</span>
          </div>
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