/* =============================================================================
 * app/classes/[id]/layout.tsx — shell for a single class
 * -----------------------------------------------------------------------------
 * Session AppShell with class header in main content. In-class navigation lives
 * in the sidebar only — no duplicate horizontal tab bar.
 * ========================================================================== */
import { redirect } from "next/navigation";
import Link from "next/link";

import { getServerClient, requireAuth, getClassRow, getClassMembership } from "@/lib/auth";
import { AppShell } from "@/components/shell/app-shell";
import { PageContainer } from "@/components/shell/page-container";
import { Button } from "@/components/ui/button";
import MembersButton from "@/features/classes/components/MembersButton";
import RecordClassVisit from "@/features/classes/components/RecordClassVisit";

export default async function ClassLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireAuth();

  // Dedup: getClassRow + getClassMembership are request-cached, so the child
  // page reuses these results instead of re-querying. Both are independent of
  // each other, so fetch them together.
  const [cls, membership] = await Promise.all([
    getClassRow(id),
    getClassMembership(id, user.id),
  ]);

  if (!cls) redirect("/dashboard");
  if (!membership) redirect("/dashboard");

  const supabase = await getServerClient();

  // The remaining reads have no dependency on each other — run them in one batch.
  const [{ data: profile }, { data: allCycles }, { data: completedLessons }, { data: classMembers }] =
    await Promise.all([
      supabase.from("users").select("full_name").eq("id", user.id).single(),
      supabase
        .from("payment_cycles")
        .select("id, cycle_number, closed_at, payment_amount, payment_currency")
        .eq("class_id", id)
        .order("cycle_number", { ascending: true }),
      supabase
        .from("lessons")
        .select("id, duration_hours, payment_cycle_id")
        .eq("class_id", id)
        .eq("status", "completed")
        .is("deleted_at", null),
      supabase.from("class_members").select("user_id, role, users (full_name)").eq("class_id", id),
    ]);

  const members = (classMembers ?? []).map((m: { user_id: string; role: string; users?: { full_name?: string } | null }) => ({
    id: m.user_id,
    full_name: m.users?.full_name ?? "Unknown",
    role: m.role,
  }));

  const studentCount = members.filter((m) => m.role === "student").length;

  const cycles = allCycles ?? [];
  const lessons = completedLessons ?? [];
  const cycleTarget = cls.cycle_hours;

  const openCycle = cycles.find((c) => !c.closed_at);
  let cycleHoursCompleted = 0;
  if (openCycle) {
    cycleHoursCompleted = lessons
      .filter((l) => l.payment_cycle_id === openCycle.id)
      .reduce((sum, l) => sum + (l.duration_hours ?? 0), 0);
  }

  const initials = cls.title.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
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
    paymentAmount: openCycle?.payment_amount ?? null,
    paymentCurrency: openCycle?.payment_currency ?? "GEL",
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
      <RecordClassVisit classId={id} />
      <PageContainer className="pb-16 pt-[34px]">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
          <div className="flex items-start gap-4">
            <div className="flex size-[52px] shrink-0 items-center justify-center rounded-[14px] border border-line bg-accent-tint font-mono text-[13px] font-semibold text-accent">
              {tile}
            </div>
            <div className="min-w-0">
              {eyebrow ? (
                <div className="mb-1.5 font-mono text-[12px] uppercase tracking-[0.05em] text-muted">
                  {eyebrow}
                </div>
              ) : null}
              <h1 className="font-serif text-[24px] leading-[1.05] tracking-[-0.01em] text-ink sm:text-[30px]">
                {cls.title}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13.5px] text-ink-2">
                <span>
                  {studentCount} {studentCount === 1 ? "student" : "students"}
                </span>
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

        {children}
      </PageContainer>
    </AppShell>
  );
}
