/* =============================================================================
 * app/classes/[id]/layout.tsx — shell for a single class
 * -----------------------------------------------------------------------------
 * Loads the class, the viewer's membership/role, and payment-cycle progress,
 * then renders the session AppShell with a class header (avatar, subject/level,
 * title, member count) and the in-class tabs. Tab content renders as children.
 *
 * Data fetching is unchanged from before — only the presentation moved to the
 * shell + primitives. Tutor-only actions (members, invite) sit in the header.
 * ========================================================================== */
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

import { AppShell } from "@/components/shell/app-shell";
import { ClassTabs } from "@/components/shell/class-tabs";
import { PageContainer } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
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
  // 3-letter tile mark, derived from the subject when present (e.g. "PHY").
  const tile = (cls.subject ?? cls.title).slice(0, 3).toUpperCase();
  const eyebrow = [cls.subject, cls.level].filter(Boolean).join(" · ");
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
    <AppShell
      mode="session"
      student={student}
      tutorInitials={userInitials}
      tutorName={fullName}
      role={membership.role as "tutor" | "student" | "parent" | "employer"}
      breadcrumb={{ root: "Classes", leaf: cls.title }}
    >
      {/* Class header band — identity, meta, and tutor actions, then the tabs. */}
      <div className="border-b border-line bg-surface">
        <PageContainer className="py-6">
          <div className="flex items-start justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="flex size-[52px] shrink-0 items-center justify-center rounded-2xl border border-line bg-accent-tint font-mono text-[13px] font-semibold text-accent">
                {tile}
              </div>
              <div className="min-w-0">
                {eyebrow ? (
                  <div className="mb-1.5 font-mono text-[12px] uppercase tracking-[0.05em] text-muted">
                    {eyebrow}
                  </div>
                ) : null}
                <h1 className="font-serif text-[28px] leading-[1.05] tracking-[-0.01em] text-ink">
                  {cls.title}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13.5px] text-ink-2">
                  <span>{members.length} {members.length === 1 ? "member" : "members"}</span>
                  {student.cycleTotal > 0 ? (
                    <>
                      <span className="opacity-40">·</span>
                      <span>
                        Cycle {student.cycleNumber} · {student.cycleHours}/{student.cycleTotal}h
                      </span>
                    </>
                  ) : null}
                </div>
              </div>
            </div>

            {membership.role === "tutor" ? (
              <div className="flex shrink-0 items-center gap-2">
                <MembersButton classId={id} members={members} currentUserId={user.id} />
                <Button asChild size="sm">
                  <Link href={`/classes/${id}/invite`}>+ Invite</Link>
                </Button>
              </div>
            ) : null}
          </div>

          <div className="mt-5">
            <ClassTabs classId={id} />
          </div>
        </PageContainer>
      </div>

      {children}
    </AppShell>
  );
}