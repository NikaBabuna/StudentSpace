import { buildDashboardStats, greetingForHour, type DashboardStat } from "@/lib/dashboard-stats";
import { getServerClient, getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

const FALLBACK_ID = "00000000-0000-0000-0000-000000000000";

const CLASS_DOTS = [
  "oklch(0.62 0.1 250)",
  "oklch(0.62 0.1 150)",
  "oklch(0.62 0.1 40)",
  "oklch(0.62 0.1 320)",
  "oklch(0.62 0.1 200)",
  "oklch(0.62 0.1 90)",
];

export type DashboardClassRow = {
  id: string;
  title: string;
  subject?: string | null;
  level?: string | null;
  description?: string | null;
  tutor_notes?: string | null;
  cycle_hours: number;
  role: string;
  member_count: number;
  student_count: number;
  isCreator: boolean;
  paymentAmount: number | null;
  paymentCurrency: string;
  dotColor: string;
  nextSession: string | null;
};

export type TodaySessionRow = {
  id: string;
  classId: string;
  time: string;
  duration: string;
  title: string;
  sub: string;
  kind: string;
  tagTone: "accent" | "neutral";
};

export type HomeworkAttentionRow = {
  id: string;
  classId: string;
  title: string;
  classTitle: string;
  sub: string;
  due: string;
  dueTone: "warn" | "ok" | "neutral";
  cta: string;
  ctaVariant: "primary" | "secondary";
  dotColor: string;
};

export type DashboardData = {
  userId: string;
  firstName: string;
  fullName: string;
  userInitials: string;
  greeting: string;
  greetingSub: string;
  stats: DashboardStat[];
  allClasses: DashboardClassRow[];
  teaching: DashboardClassRow[];
  attending: DashboardClassRow[];
  observing: DashboardClassRow[];
  todaySessions: TodaySessionRow[];
  homeworkAttention: HomeworkAttentionRow[];
  classesHeading: string;
  homeworkHeading: string;
  isTutor: boolean;
};

function classDotColor(classId: string) {
  let hash = 0;
  for (const ch of classId) hash = (hash + ch.charCodeAt(0)) % CLASS_DOTS.length;
  return CLASS_DOTS[hash]!;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatTime(d: Date) {
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatNextSession(at: Date, now: Date) {
  if (isSameDay(at, now)) return `Today ${formatTime(at)}`;
  const atDay = new Date(at);
  atDay.setHours(0, 0, 0, 0);
  const nowDay = new Date(now);
  nowDay.setHours(0, 0, 0, 0);
  const diffDays = Math.round((atDay.getTime() - nowDay.getTime()) / 86400000);
  if (diffDays === 1) return `Tomorrow ${formatTime(at)}`;
  const weekday = at.toLocaleDateString(undefined, { weekday: "short" });
  return `${weekday} ${formatTime(at)}`;
}

function formatDurationHours(hours: number) {
  const mins = Math.round(hours * 60);
  return `${mins} min`;
}

function daysUntil(deadline: Date, now: Date) {
  const a = new Date(deadline);
  a.setHours(0, 0, 0, 0);
  const b = new Date(now);
  b.setHours(0, 0, 0, 0);
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

function buildTodaySessions(
  lessons: { id: string; class_id: string; scheduled_at: string; duration_hours: number; status: string }[],
  classMap: Map<string, { title: string; subject?: string | null; level?: string | null }>,
  now: Date
): TodaySessionRow[] {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  return lessons
    .filter((l) => {
      if (l.status !== "scheduled") return false;
      const at = new Date(l.scheduled_at);
      return at >= start && at <= end;
    })
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    .map((l) => {
      const cls = classMap.get(l.class_id);
      const at = new Date(l.scheduled_at);
      const meta = [cls?.subject, cls?.level].filter(Boolean).join(" · ");
      return {
        id: l.id,
        classId: l.class_id,
        time: formatTime(at),
        duration: formatDurationHours(l.duration_hours ?? 1),
        title: cls?.title ?? "Class session",
        sub: meta || "Scheduled lesson",
        kind: "Live session",
        tagTone: "accent" as const,
      };
    });
}

function buildHomeworkAttention({
  homework,
  submissions,
  classMap,
  studentCountMap,
  teachingClassIds,
  attendingClassIds,
  observingClassIds,
  userId,
  now,
}: {
  homework: { id: string; class_id: string; title: string; deadline: string }[];
  submissions: { homework_id: string; student_id: string; grade: string | null }[];
  classMap: Map<string, { title: string; id: string }>;
  studentCountMap: Record<string, number>;
  teachingClassIds: string[];
  attendingClassIds: string[];
  observingClassIds: string[];
  userId: string;
  now: Date;
}): HomeworkAttentionRow[] {
  const isTutor = teachingClassIds.length > 0;
  const relevantClassIds = new Set(
    isTutor ? teachingClassIds : [...attendingClassIds, ...observingClassIds]
  );
  const rows: HomeworkAttentionRow[] = [];

  for (const hw of homework) {
    if (!relevantClassIds.has(hw.class_id)) continue;
    const cls = classMap.get(hw.class_id);
    if (!cls) continue;

    const hwSubs = submissions.filter((s) => s.homework_id === hw.id);
    const deadline = new Date(hw.deadline);
    const past = deadline < now;
    const dayDiff = daysUntil(deadline, now);

    if (isTutor) {
      const totalStudents = studentCountMap[hw.class_id] ?? 0;
      const submittedCount = new Set(hwSubs.map((s) => s.student_id)).size;
      const ungraded = hwSubs.filter((s) => !s.grade).length;
      const gradedCount = hwSubs.filter((s) => s.grade).length;

      let due: string;
      let dueTone: "warn" | "ok" | "neutral";
      if (past && gradedCount > 0 && ungraded === 0) {
        due = "Closed";
        dueTone = "ok";
      } else if (dayDiff === 0) {
        due = "Due today";
        dueTone = "warn";
      } else if (dayDiff > 0 && dayDiff <= 7) {
        due = `Due in ${dayDiff} day${dayDiff === 1 ? "" : "s"}`;
        dueTone = "neutral";
      } else if (past) {
        due = `Closed ${deadline.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
        dueTone = "ok";
      } else {
        due = deadline.toLocaleDateString(undefined, { month: "short", day: "numeric" });
        dueTone = "neutral";
      }

      let cta: string;
      let ctaVariant: "primary" | "secondary";
      if (ungraded > 0) {
        cta = "Grade";
        ctaVariant = "primary";
      } else if (past && gradedCount > 0) {
        cta = "Review";
        ctaVariant = "secondary";
      } else {
        cta = "Open";
        ctaVariant = "secondary";
      }

      const sub =
        totalStudents > 0
          ? `${submittedCount} / ${totalStudents} submitted`
          : submittedCount > 0
            ? `${submittedCount} submitted`
            : "No submissions yet";

      rows.push({
        id: hw.id,
        classId: hw.class_id,
        title: hw.title,
        classTitle: cls.title,
        sub,
        due,
        dueTone,
        cta,
        ctaVariant,
        dotColor: classDotColor(hw.class_id),
      });
    } else {
      const mine = hwSubs.some((s) => s.student_id === userId);
      const myGrade = hwSubs.find((s) => s.student_id === userId)?.grade;

      let due: string;
      let dueTone: "warn" | "ok" | "neutral";
      if (myGrade) {
        due = "Graded";
        dueTone = "ok";
      } else if (past) {
        due = "Past due";
        dueTone = "warn";
      } else if (dayDiff === 0) {
        due = "Due today";
        dueTone = "warn";
      } else if (dayDiff > 0 && dayDiff <= 7) {
        due = `Due in ${dayDiff} day${dayDiff === 1 ? "" : "s"}`;
        dueTone = "neutral";
      } else {
        due = deadline.toLocaleDateString(undefined, { month: "short", day: "numeric" });
        dueTone = "neutral";
      }

      let cta: string;
      let ctaVariant: "primary" | "secondary";
      if (myGrade) {
        cta = "Review";
        ctaVariant = "secondary";
      } else if (!mine && !past) {
        cta = "Submit";
        ctaVariant = "primary";
      } else {
        cta = "Open";
        ctaVariant = "secondary";
      }

      rows.push({
        id: hw.id,
        classId: hw.class_id,
        title: hw.title,
        classTitle: cls.title,
        sub: mine ? (myGrade ? "Feedback received" : "Submitted — awaiting feedback") : "Not submitted",
        due,
        dueTone,
        cta,
        ctaVariant,
        dotColor: classDotColor(hw.class_id),
      });
    }
  }

  return rows
    .sort((a, b) => {
      const toneRank = { warn: 0, neutral: 1, ok: 2 };
      const diff = toneRank[a.dueTone] - toneRank[b.dueTone];
      if (diff !== 0) return diff;
      return a.title.localeCompare(b.title);
    })
    .slice(0, 6);
}

export async function loadDashboardData(): Promise<DashboardData> {
  const supabase = await getServerClient();

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // profile (employer redirect + name) and memberships are independent.
  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from("users").select("full_name, is_employer").eq("id", user.id).single(),
    supabase
      .from("class_members")
      .select(
        `role, classes (id, title, subject, level, cycle_hours, description, tutor_notes, created_by, deleted_at)`
      )
      .eq("user_id", user.id),
  ]);

  if (profile?.is_employer) redirect("/employer");

  const classIds = (memberships ?? []).map((m: any) => m.classes?.id).filter(Boolean);
  const inClassIds = classIds.length > 0 ? classIds : [FALLBACK_ID];
  const now = new Date();

  // memberRows / openCycles / allLessons / homeworkRows depend only on the set
  // of class ids and not on each other — fetch them in a single parallel batch.
  const [{ data: memberRows }, { data: openCycles }, { data: allLessons }, { data: homeworkRows }] =
    await Promise.all([
      supabase.from("class_members").select("class_id, role").in("class_id", inClassIds),
      supabase
        .from("payment_cycles")
        .select("id, class_id, payment_amount, payment_currency")
        .in("class_id", inClassIds)
        .is("closed_at", null),
      supabase
        .from("lessons")
        .select("id, class_id, status, scheduled_at, duration_hours")
        .in("class_id", inClassIds)
        .is("deleted_at", null),
      supabase
        .from("homework")
        .select("id, class_id, title, deadline")
        .in("class_id", inClassIds)
        .is("deleted_at", null)
        .order("deadline", { ascending: true }),
    ]);

  const countMap: Record<string, number> = {};
  const studentCountMap: Record<string, number> = {};
  for (const row of memberRows ?? []) {
    countMap[row.class_id] = (countMap[row.class_id] ?? 0) + 1;
    if (row.role === "student") {
      studentCountMap[row.class_id] = (studentCountMap[row.class_id] ?? 0) + 1;
    }
  }

  const cycleMap: Record<string, { amount: number | null; currency: string }> = {};
  for (const c of openCycles ?? []) {
    cycleMap[c.class_id] = { amount: c.payment_amount, currency: c.payment_currency ?? "GEL" };
  }

  const nextLessonMap: Record<string, string> = {};
  const nextLessonAt: Record<string, Date> = {};
  for (const lesson of allLessons ?? []) {
    if (lesson.status !== "scheduled") continue;
    const at = new Date(lesson.scheduled_at);
    if (at < now) continue;
    const prev = nextLessonAt[lesson.class_id];
    if (!prev || at < prev) nextLessonAt[lesson.class_id] = at;
  }
  for (const [classId, at] of Object.entries(nextLessonAt)) {
    nextLessonMap[classId] = formatNextSession(at, now);
  }

  const allClasses: DashboardClassRow[] = (memberships ?? [])
    .filter((m: any) => m.classes && !m.classes.deleted_at)
    .map((m: any) => ({
      ...m.classes,
      role: m.role,
      member_count: countMap[m.classes.id] ?? 1,
      student_count: studentCountMap[m.classes.id] ?? 0,
      isCreator: m.classes.created_by === user.id,
      paymentAmount: cycleMap[m.classes.id]?.amount ?? null,
      paymentCurrency: cycleMap[m.classes.id]?.currency ?? "GEL",
      dotColor: classDotColor(m.classes.id),
      nextSession: nextLessonMap[m.classes.id] ?? null,
    }));

  const teaching = allClasses.filter((c) => c.role === "tutor");
  const attending = allClasses.filter((c) => c.role === "student");
  const observing = allClasses.filter((c) => c.role === "parent" || c.role === "employer");
  const observingClassIds = observing.map((c) => c.id);

  const teachingClassIds = teaching.map((c) => c.id);
  const attendingClassIds = attending.map((c) => c.id);
  const isTutor = teachingClassIds.length > 0;

  const classMap = new Map(allClasses.map((c) => [c.id, c]));

  const hwIds = (homeworkRows ?? []).map((h) => h.id);

  // submissions depend on homework ids; tutorStudents on the teaching classes —
  // independent of each other, so fetch them together.
  const [{ data: allSubmissions }, { data: tutorStudents }] = await Promise.all([
    supabase
      .from("submissions")
      .select("homework_id, grade, student_id")
      .in("homework_id", hwIds.length > 0 ? hwIds : [FALLBACK_ID]),
    supabase
      .from("class_members")
      .select("user_id")
      .in("class_id", teachingClassIds.length > 0 ? teachingClassIds : [FALLBACK_ID])
      .eq("role", "student"),
  ]);

  const studentHwIds = (homeworkRows ?? [])
    .filter((h) => attendingClassIds.includes(h.class_id))
    .map((h) => h.id);

  const tutorHwIds = (homeworkRows ?? [])
    .filter((h) => teachingClassIds.includes(h.class_id))
    .map((h) => h.id);

  const myPendingFeedback = (allSubmissions ?? []).filter(
    (s) => studentHwIds.includes(s.homework_id) && s.student_id === user.id && !s.grade
  ).length;

  const { stats, greetingSub } = buildDashboardStats({
    teachingClassIds,
    attendingClassIds,
    studentUserIds: (tutorStudents ?? []).map((s) => s.user_id),
    lessons: allLessons ?? [],
    tutorSubmissions: (allSubmissions ?? []).filter((s) => tutorHwIds.includes(s.homework_id)),
    homeworkIds: tutorHwIds,
    myPendingFeedback,
  });

  const todaySessions = buildTodaySessions(allLessons ?? [], classMap, now);

  const homeworkAttention = buildHomeworkAttention({
    homework: homeworkRows ?? [],
    submissions: allSubmissions ?? [],
    classMap,
    studentCountMap,
    teachingClassIds,
    attendingClassIds,
    observingClassIds,
    userId: user.id,
    now,
  });

  const firstName = profile?.full_name?.trim().split(" ")[0] ?? "";
  const fullName = profile?.full_name ?? "";
  const userInitials = fullName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return {
    userId: user.id,
    firstName,
    fullName,
    userInitials,
    greeting: greetingForHour(firstName),
    greetingSub,
    stats,
    allClasses,
    teaching,
    attending,
    observing,
    todaySessions,
    homeworkAttention,
    classesHeading: isTutor ? "Your classes" : "My classes",
    homeworkHeading: isTutor ? "Homework that needs you" : "Your homework",
    isTutor,
  };
}
