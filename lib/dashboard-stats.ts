/* =============================================================================
 * lib/dashboard-stats.ts — dashboard metric builders (pure helpers)
 * -----------------------------------------------------------------------------
 * Role: Turns raw lesson/submission rows into stat cards and time-of-day
 *       greeting text. No I/O — easy to reason about and test in isolation.
 * Dependencies: lib/time (all "today"/hour reasoning is in the app timezone —
 *               this module runs on the server, where local time is UTC)
 * Used by: lib/dashboard-data.ts, features/dashboard AnalyticsClient (types)
 * Inputs: Class IDs, lesson rows, submission rows, student user IDs
 * Outputs: DashboardStat[], greetingForHour(firstName)
 * ========================================================================== */
import { dayKeyInZone, hourInZone } from "@/lib/time";

export type DashboardStat = {
  label: string;
  value: string | number;
  delta?: string;
  deltaTone?: "up" | "down" | "accent" | "warn" | "muted";
};

type LessonRow = { class_id: string; status: string; scheduled_at: string };
type SubmissionRow = { homework_id: string; grade: string | null; student_id?: string };

function lessonAttendance(lessons: LessonRow[]) {
  const completed = lessons.filter((l) => l.status === "completed").length;
  const missed = lessons.filter((l) => l.status === "missed").length;
  const concluded = completed + missed;
  const pct = concluded > 0 ? Math.round((completed / concluded) * 100) : null;
  return { completed, missed, concluded, pct };
}

function todaySessionCount(lessons: LessonRow[]) {
  const todayKey = dayKeyInZone(new Date());
  return lessons.filter(
    (l) => l.status === "scheduled" && dayKeyInZone(new Date(l.scheduled_at)) === todayKey
  ).length;
}

export function greetingForHour(firstName: string): string {
  const h = hourInZone(new Date());
  const period = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
  return firstName ? `Good ${period}, ${firstName}` : `Good ${period}`;
}

export function buildDashboardStats({
  teachingClassIds,
  attendingClassIds,
  studentUserIds,
  lessons,
  tutorSubmissions,
  homeworkIds,
  myPendingFeedback,
}: {
  teachingClassIds: string[];
  attendingClassIds: string[];
  studentUserIds: string[];
  lessons: LessonRow[];
  tutorSubmissions: SubmissionRow[];
  homeworkIds: string[];
  myPendingFeedback: number;
}): { stats: DashboardStat[]; greetingSub: string } {
  const isTutor = teachingClassIds.length > 0;

  const tutorLessons = lessons.filter((l) => teachingClassIds.includes(l.class_id));
  const studentLessons = lessons.filter((l) => attendingClassIds.includes(l.class_id));
  const toGrade = tutorSubmissions.filter((s) => homeworkIds.includes(s.homework_id) && !s.grade).length;
  const todaySessions = todaySessionCount(tutorLessons);

  if (isTutor) {
    const { pct, concluded } = lessonAttendance(tutorLessons);
    const studentCount = new Set(studentUserIds).size;

    const stats: DashboardStat[] = [
      {
        label: "Active classes",
        value: teachingClassIds.length,
        delta: teachingClassIds.length > 0 ? "All on schedule" : "Create your first class",
        deltaTone: "muted",
      },
      {
        label: "Students",
        value: studentCount,
        delta: studentCount > 0 ? "Across your classes" : "Invite from a class",
        deltaTone: studentCount > 0 ? "up" : "muted",
      },
      {
        label: "Avg. attendance",
        value: pct != null ? `${pct}%` : "—",
        delta: concluded > 0 ? `${concluded} lessons tracked` : "No completed lessons yet",
        deltaTone: pct != null && pct >= 90 ? "up" : "muted",
      },
      {
        label: "To grade",
        value: toGrade,
        delta: toGrade > 0 ? "Needs feedback" : "All caught up",
        deltaTone: toGrade > 0 ? "warn" : "up",
      },
    ];

    const parts: string[] = [];
    if (todaySessions > 0) {
      parts.push(`${todaySessions} session${todaySessions === 1 ? "" : "s"} today`);
    }
    if (toGrade > 0) {
      parts.push(`${toGrade} submission${toGrade === 1 ? "" : "s"} to grade`);
    }
    const greetingSub =
      parts.length > 0
        ? `You have ${parts.join(" and ")}.`
        : teachingClassIds.length > 0
          ? "You're all caught up for today."
          : "Create a class to get started.";

    return { stats, greetingSub };
  }

  const { pct, concluded } = lessonAttendance(studentLessons);
  const classCount = attendingClassIds.length;

  const stats: DashboardStat[] = [
    {
      label: "Active classes",
      value: classCount,
      delta: classCount > 0 ? "Enrolled" : "Join via invite",
      deltaTone: "muted",
    },
    {
      label: "Students",
      value: "—",
      delta: "Tutor metric",
      deltaTone: "muted",
    },
    {
      label: "Avg. attendance",
      value: pct != null ? `${pct}%` : "—",
      delta: concluded > 0 ? `${concluded} lessons tracked` : "No lessons yet",
      deltaTone: pct != null && pct >= 90 ? "up" : "muted",
    },
    {
      label: "To grade",
      value: myPendingFeedback,
      delta: myPendingFeedback > 0 ? "Awaiting tutor feedback" : "All caught up",
      deltaTone: myPendingFeedback > 0 ? "warn" : "up",
    },
  ];

  const greetingSub =
    classCount > 0
      ? `You're enrolled in ${classCount} ${classCount === 1 ? "class" : "classes"}.`
      : "Accept an invite or ask your tutor to add you.";

  return { stats, greetingSub };
}
