/* =============================================================================
 * app/classes/[id]/overview/page.tsx — class overview tab (server-rendered)
 * -----------------------------------------------------------------------------
 * Role: Role-aware summary for one class: stats, next lesson, payment cycle,
 *       homework attention (tutor) or active homework (student). Heavy server
 *       component with batched Supabase reads — no separate client wrapper.
 * Dependencies: lib/auth, components/ui (StatCard, Badge, etc.)
 * Used by: Route /classes/[id]/overview (default class tab)
 * Inputs: params.id, membership from cached loaders
 * Outputs: Full overview HTML inside class layout
 * ========================================================================== */
import Link from "next/link";

import { getServerClient, requireAuth, getClassMembership, getClassRow } from "@/lib/auth";
import { formatDateInZone, formatTimeInZone, isSameDayInZone } from "@/lib/time";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";

function OverviewPanel({
  title,
  headerRight,
  children,
  className,
}: {
  title: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-line bg-surface p-[22px]", className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
        {headerRight}
      </div>
      {children}
    </section>
  );
}

type HomeworkRow = {
  id: string;
  title: string;
  sub: string;
  due: string;
  dueTone: "warn" | "ok" | "neutral";
  cta: string;
  ctaPrimary: boolean;
};

function studentHomeworkStats(
  studentId: string,
  homework: { id: string; deadline: string }[],
  submissions: { homework_id: string; student_id: string; grade: string | null }[],
  now: Date
): { note: string; noteClass: string; hwPct: number | null } {
  const total = homework.length;
  if (total === 0) {
    return { note: "No homework yet", noteClass: "text-muted", hwPct: null };
  }

  const subs = submissions.filter((s) => s.student_id === studentId);
  const submittedIds = new Set(subs.map((s) => s.homework_id));
  const missed = homework.filter(
    (h) => new Date(h.deadline) < now && !submittedIds.has(h.id)
  ).length;
  const hwPct = Math.round((subs.length / total) * 100);

  if (missed > 0) {
    return { note: `${missed} overdue`, noteClass: "text-warn", hwPct };
  }
  const pendingGrade = subs.some((s) => !s.grade);
  if (pendingGrade) {
    return { note: "Awaiting feedback", noteClass: "text-accent", hwPct };
  }
  if (hwPct === 100) {
    return { note: "All caught up", noteClass: "text-ok", hwPct };
  }
  return { note: "In progress", noteClass: "text-muted", hwPct };
}

function timeUntil(d: string, now: Date) {
  const diff = new Date(d).getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h away`;
  if (hours > 0) return `${hours}h away`;
  return "Starting soon";
}

export default async function OverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAuth();
  const supabase = await getServerClient();
  const FALLBACK = "00000000-0000-0000-0000-000000000000";

  // membership + class are request-cached (already loaded by the layout) — no round-trips here.
  const [membership, cls] = await Promise.all([
    getClassMembership(id, user.id),
    getClassRow(id),
  ]);

  const role = membership?.role ?? "student";
  const isTutor = role === "tutor";

  // Batch 1 — independent reads.
  const [{ data: lessons }, { data: homework }, { data: members }, { data: cycles }] =
    await Promise.all([
      supabase
        .from("lessons")
        .select("id, scheduled_at, duration_hours, status, payment_cycle_id, replaces_lesson_id")
        .eq("class_id", id)
        .is("deleted_at", null)
        .order("scheduled_at", { ascending: true }),
      supabase
        .from("homework")
        .select("id, title, deadline")
        .eq("class_id", id)
        .is("deleted_at", null)
        .order("deadline", { ascending: true }),
      supabase.from("class_members").select("user_id, role").eq("class_id", id),
      supabase
        .from("payment_cycles")
        .select("id, cycle_number, closed_at")
        .eq("class_id", id)
        .order("cycle_number", { ascending: true }),
    ]);

  const hwIds = (homework ?? []).map((h) => h.id);
  const studentIds = (members ?? []).filter((m) => m.role === "student").map((m) => m.user_id);

  // Batch 2 — depends on batch 1 (submissions need homework ids, names need student ids).
  const [{ data: submissions }, { data: studentUsers }] = await Promise.all([
    supabase
      .from("submissions")
      .select("id, homework_id, student_id, grade")
      .in("homework_id", hwIds.length > 0 ? hwIds : [FALLBACK]),
    supabase
      .from("users")
      .select("id, full_name")
      .in("id", studentIds.length > 0 ? studentIds : [FALLBACK]),
  ]);

  const now = new Date();
  const allLessons = lessons ?? [];
  const allHomework = homework ?? [];
  const allSubmissions = submissions ?? [];
  const allCycles = cycles ?? [];
  const cycleHoursTarget = cls?.cycle_hours ?? 8;

  const completedLessons = allLessons.filter((l) => l.status === "completed");
  const missedLessons = allLessons.filter((l) => l.status === "missed");
  const concludedLessons = allLessons.filter((l) => l.status === "completed" || l.status === "missed");
  const nextLesson = allLessons.find(
    (l) => l.status === "scheduled" && new Date(l.scheduled_at) > now
  );
  const makeupLessons = allLessons.filter((l) => l.replaces_lesson_id);
  const missedWithNoMakeup = missedLessons.filter(
    (l) => !makeupLessons.some((m) => m.replaces_lesson_id === l.id)
  );
  const completedCycles = allCycles.filter((c) => c.closed_at).length;
  const totalHours = completedLessons.reduce((sum, l) => sum + (l.duration_hours ?? 0), 0);
  const missedRate =
    concludedLessons.length > 0
      ? Math.round((missedLessons.length / concludedLessons.length) * 100)
      : 0;

  const openCycle = allCycles.find((c) => !c.closed_at);
  const cycleHoursCompleted = openCycle
    ? completedLessons
        .filter((l) => l.payment_cycle_id === openCycle.id)
        .reduce((sum, l) => sum + (l.duration_hours ?? 0), 0)
    : 0;
  const cyclePct =
    cycleHoursTarget > 0
      ? Math.min(Math.round((cycleHoursCompleted / cycleHoursTarget) * 100), 100)
      : 0;

  const pendingGrade = allSubmissions.filter((s) => !s.grade).length;

  // Server component — format in the app timezone, never the host's (UTC).
  const fmtDate = (d: string) =>
    formatDateInZone(new Date(d), { weekday: "short", day: "numeric", month: "short" });
  const fmtTime = (d: string) => formatTimeInZone(new Date(d));

  const mySubmissions = allSubmissions.filter((s) => s.student_id === user.id);
  const myHwSubmitted = allHomework.filter((h) =>
    mySubmissions.some((s) => s.homework_id === h.id)
  );
  const myHwMissed = allHomework.filter((h) => {
    const hasSub = mySubmissions.some((s) => s.homework_id === h.id);
    return !hasSub && new Date(h.deadline) < now;
  });
  const myHwPending = allHomework.filter((h) => {
    const hasSub = mySubmissions.some((s) => s.homework_id === h.id);
    return !hasSub && new Date(h.deadline) >= now;
  });

  const studentRows = studentIds.map((sid) => {
    const name = studentUsers?.find((u) => u.id === sid)?.full_name ?? "Student";
    return { id: sid, name, ...studentHomeworkStats(sid, allHomework, allSubmissions, now) };
  });

  const homeworkRows: HomeworkRow[] = allHomework.map((hw) => {
    const subs = allSubmissions.filter((s) => s.homework_id === hw.id);
    const ungraded = subs.filter((s) => !s.grade).length;
    const submitted = subs.length;
    const isPast = new Date(hw.deadline) < now;
    const missing = Math.max(0, studentIds.length - submitted);

    let due = fmtDate(hw.deadline);
    let dueTone: HomeworkRow["dueTone"] = "neutral";
    if (isPast && missing > 0) {
      due = "Past due";
      dueTone = "warn";
    } else if (isSameDayInZone(new Date(hw.deadline), now)) {
      due = "Due today";
      dueTone = "warn";
    } else if (!isPast) {
      due = `Due ${fmtDate(hw.deadline)}`;
    } else {
      due = "Closed";
      dueTone = "ok";
    }

    const sub =
      ungraded > 0
        ? `${ungraded} to grade`
        : submitted > 0
          ? `${submitted}/${studentIds.length || submitted} submitted`
          : studentIds.length > 0
            ? `${studentIds.length} students`
            : "No students yet";

    return {
      id: hw.id,
      title: hw.title,
      sub,
      due,
      dueTone,
      cta: ungraded > 0 ? "Grade" : "Open",
      ctaPrimary: ungraded > 0,
    };
  });

  const homeworkAttention = isTutor
    ? (() => {
        const urgent = homeworkRows.filter((hw) => hw.dueTone === "warn" || hw.ctaPrimary);
        return (urgent.length > 0 ? urgent : homeworkRows.slice(-5).reverse()).slice(0, 5);
      })()
    : [];

  const activeHw = allHomework.filter((h) => new Date(h.deadline) >= now);

  const tutorStats = [
    {
      label: "Total hours",
      value: totalHours,
      delta: "completed since start",
      deltaTone: "muted" as const,
    },
    {
      label: "Lessons",
      value: concludedLessons.length,
      delta: missedLessons.length > 0 ? `${missedLessons.length} missed (${missedRate}%)` : "none missed",
      deltaTone: missedLessons.length > 0 ? ("warn" as const) : ("up" as const),
    },
    {
      label: "To grade",
      value: pendingGrade,
      delta: pendingGrade > 0 ? "submissions waiting" : "all reviewed",
      deltaTone: pendingGrade > 0 ? ("warn" as const) : ("up" as const),
    },
    {
      label: "Current cycle",
      value: `${cycleHoursCompleted}/${cycleHoursTarget}h`,
      delta: `Cycle ${openCycle?.cycle_number ?? 1} · ${cyclePct}% full`,
      deltaTone: "muted" as const,
    },
  ];

  const studentStats = [
    {
      label: "Hours learned",
      value: totalHours,
      delta: "completed in this class",
      deltaTone: "muted" as const,
    },
    {
      label: "Homework",
      value: allHomework.length > 0 ? `${myHwSubmitted.length}/${allHomework.length}` : "—",
      delta:
        myHwMissed.length > 0
          ? `${myHwMissed.length} overdue`
          : myHwPending.length > 0
            ? `${myHwPending.length} still open`
            : "all caught up",
      deltaTone: myHwMissed.length > 0 ? ("warn" as const) : ("up" as const),
    },
    {
      label: "Next lesson",
      value: nextLesson ? fmtDate(nextLesson.scheduled_at) : "—",
      delta: nextLesson ? `${fmtTime(nextLesson.scheduled_at)} · ${timeUntil(nextLesson.scheduled_at, now)}` : "nothing scheduled",
      deltaTone: nextLesson ? ("accent" as const) : ("muted" as const),
    },
    {
      label: "Current cycle",
      value: `${cycleHoursCompleted}/${cycleHoursTarget}h`,
      delta: `${cyclePct}% of cycle ${openCycle?.cycle_number ?? 1}`,
      deltaTone: "muted" as const,
    },
  ];

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {(isTutor ? tutorStats : studentStats).map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            delta={stat.delta}
            deltaTone={stat.deltaTone}
          />
        ))}
      </div>

      {isTutor && missedWithNoMakeup.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-warn/30 bg-warn-tint px-4 py-3">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-warn">
            !
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-medium text-ink">
              {missedWithNoMakeup.length} missed{" "}
              {missedWithNoMakeup.length === 1 ? "lesson has" : "lessons have"} no makeup scheduled
            </p>
            <p className="mt-0.5 text-[12px] text-muted">
              {missedWithNoMakeup
                .slice(0, 3)
                .map((l) => fmtDate(l.scheduled_at))
                .join(", ")}
            </p>
          </div>
          <Button asChild variant="secondary" size="sm">
            <Link href={`/classes/${id}/schedule`}>View schedule</Link>
          </Button>
        </div>
      ) : null}

      <div className="grid gap-[18px] lg:grid-cols-2">
        <OverviewPanel
          title="Next lesson"
          headerRight={
            <Link href={`/classes/${id}/schedule`} className="text-[13px] font-semibold text-accent hover:underline">
              View schedule
            </Link>
          }
        >
          {nextLesson ? (
            <div>
              <div className="font-serif text-[28px] leading-none tracking-[-0.01em] text-ink">
                {fmtDate(nextLesson.scheduled_at)}
              </div>
              <p className="mt-2 text-[14px] text-ink-2">
                {fmtTime(nextLesson.scheduled_at)} · {nextLesson.duration_hours}h
              </p>
              <Badge tone="accent" className="mt-3 font-mono text-[11px] uppercase tracking-[0.03em]">
                {timeUntil(nextLesson.scheduled_at, now)}
              </Badge>
            </div>
          ) : (
            <p className="text-sm text-muted">No upcoming lessons scheduled.</p>
          )}
        </OverviewPanel>

        <OverviewPanel
          title="Payment cycle"
          headerRight={
            completedCycles > 0 ? (
              <span className="font-mono text-[12px] text-muted">{completedCycles} completed</span>
            ) : null
          }
        >
          <div className="mb-3 flex items-baseline gap-2">
            <span className="font-serif text-[34px] leading-none tracking-[-0.01em] text-ink">
              {cycleHoursCompleted}/{cycleHoursTarget}h
            </span>
            <span className="text-sm text-muted">this cycle</span>
          </div>
          <Progress value={cyclePct} className="h-2" />
          <p className="mt-3 text-[13px] text-ink-2">
            Cycle {openCycle?.cycle_number ?? 1} is {cyclePct}% complete
            {totalHours > 0 ? ` · ${totalHours}h total taught` : ""}
          </p>
        </OverviewPanel>
      </div>

      <div className="grid gap-[18px] lg:grid-cols-2">
        <OverviewPanel
          title={isTutor ? "Homework" : "Active homework"}
          headerRight={
            <Link href={`/classes/${id}/homework`} className="text-[13px] font-semibold text-accent hover:underline">
              View all
            </Link>
          }
        >
          {isTutor ? (
            homeworkAttention.length === 0 ? (
              <p className="text-sm text-muted">
                {allHomework.length === 0 ? "No homework posted yet." : "Nothing needs attention right now."}
              </p>
            ) : (
              <div className="flex flex-col">
                {homeworkAttention.map((hw) => (
                  <div
                    key={hw.id}
                    className="flex flex-wrap items-center gap-3 border-t border-line py-3.5 first:border-t-0 first:pt-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14.5px] font-semibold text-ink">{hw.title}</div>
                      <div className="text-[12.5px] text-muted">{hw.sub}</div>
                    </div>
                    <Badge tone={hw.dueTone} className="shrink-0 text-[12px] font-semibold">
                      {hw.due}
                    </Badge>
                    <Button
                      asChild
                      variant={hw.ctaPrimary ? "primary" : "secondary"}
                      size="sm"
                      className="h-9 shrink-0 px-4 text-[13px]"
                    >
                      <Link href={`/classes/${id}/homework/${hw.id}`}>{hw.cta}</Link>
                    </Button>
                  </div>
                ))}
              </div>
            )
          ) : activeHw.length === 0 ? (
            <p className="text-sm text-muted">No active homework.</p>
          ) : (
            <div className="flex flex-col">
              {activeHw.slice(0, 5).map((hw) => {
                const sub = mySubmissions.find((s) => s.homework_id === hw.id);
                const isToday = isSameDayInZone(new Date(hw.deadline), now);
                return (
                  <div
                    key={hw.id}
                    className="flex items-center gap-3 border-t border-line py-3.5 first:border-t-0 first:pt-0"
                  >
                    <span
                      className={cn(
                        "size-2 shrink-0 rounded-full",
                        sub ? "bg-ok" : isToday ? "bg-warn" : "bg-muted"
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14.5px] font-semibold text-ink">{hw.title}</div>
                      <div className="text-[12.5px] text-muted">
                        {sub ? "Submitted · awaiting feedback" : `Due ${fmtDate(hw.deadline)}`}
                      </div>
                    </div>
                    {!sub ? (
                      <Button asChild variant="secondary" size="sm">
                        <Link href={`/classes/${id}/homework`}>Submit</Link>
                      </Button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
          {!isTutor && myHwMissed.length > 0 ? (
            <p className="mt-3 text-xs text-danger">
              {myHwMissed.length} past-due assignment{myHwMissed.length === 1 ? "" : "s"}
            </p>
          ) : null}
        </OverviewPanel>

        {isTutor ? (
          <OverviewPanel title="Students">
            {studentRows.length === 0 ? (
              <p className="text-sm text-muted">No students in this class yet.</p>
            ) : (
              <div className="flex flex-col gap-0.5">
                {studentRows.map((su) => (
                  <div key={su.id} className="flex items-center gap-3 py-2.5">
                    <Avatar name={su.name} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-ink">{su.name}</div>
                      <div className={cn("text-xs", su.noteClass)}>{su.note}</div>
                    </div>
                    {su.hwPct !== null ? (
                      <div className="shrink-0 text-right">
                        <div className="font-mono text-[13px] font-medium text-ink">{su.hwPct}%</div>
                        <div className="text-[10px] text-muted">homework</div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </OverviewPanel>
        ) : (
          <OverviewPanel title="Recent feedback">
            {mySubmissions.filter((s) => s.grade).length === 0 ? (
              <p className="text-sm text-muted">No feedback received yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {mySubmissions
                  .filter((s) => s.grade)
                  .slice(0, 4)
                  .map((sub) => {
                    const hw = allHomework.find((h) => h.id === sub.homework_id);
                    return (
                      <div
                        key={sub.id}
                        className="rounded-xl border border-line bg-surface-2 px-3.5 py-3"
                      >
                        <div className="text-[11px] text-muted">{hw?.title ?? "Homework"}</div>
                        <div className="mt-1 text-[13px] text-ok">{sub.grade}</div>
                      </div>
                    );
                  })}
              </div>
            )}
          </OverviewPanel>
        )}
      </div>
    </div>
  );
}
