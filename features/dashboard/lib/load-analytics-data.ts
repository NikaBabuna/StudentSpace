/* =============================================================================
 * features/dashboard/lib/load-analytics-data.ts — analytics page server loader
 * ----------------------------------------------------------------------------- */
import { redirect } from "next/navigation";

import { getCurrentUser, getServerClient } from "@/lib/auth";

const FALLBACK_ID = "00000000-0000-0000-0000-000000000000";

export type AnalyticsClass = {
  id: string;
  title: string;
  subject?: string | null;
  level?: string | null;
  cycle_hours?: number;
};

export type AnalyticsLesson = {
  id: string;
  class_id: string;
  duration_hours?: number;
  status: string;
  scheduled_at: string;
  payment_cycle_id?: string | null;
  replaces_lesson_id?: string | null;
};

export type AnalyticsHomework = {
  id: string;
  class_id: string;
  deadline: string;
};

export type AnalyticsSubmission = {
  id: string;
  homework_id: string;
  student_id: string;
  grade: string | null;
  created_at: string;
};

export type AnalyticsCycle = {
  id: string;
  class_id: string;
  cycle_number: number;
  started_at: string;
  closed_at: string | null;
  paid_at: string | null;
  payment_amount: number | null;
  payment_currency: string | null;
};

export type AnalyticsClassMember = {
  class_id: string;
  user_id: string;
  role: string;
};

export type AnalyticsParentChild = {
  id: string;
  full_name: string;
  sharedClassIds: string[];
};

export type AnalyticsPageData = {
  userId: string;
  tutorClasses: AnalyticsClass[];
  studentClasses: AnalyticsClass[];
  /** Classes where the user is a parent member — needed to resolve titles on the parent tab. */
  parentClasses: AnalyticsClass[];
  parentChildren: AnalyticsParentChild[];
  lessons: AnalyticsLesson[];
  homework: AnalyticsHomework[];
  submissions: AnalyticsSubmission[];
  cycles: AnalyticsCycle[];
  classMembers: AnalyticsClassMember[];
};

type MembershipRow = {
  role: string;
  classes: AnalyticsClass & { deleted_at?: string | null };
};

export async function loadAnalyticsData(): Promise<AnalyticsPageData> {
  const supabase = await getServerClient();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("is_employer")
    .eq("id", user.id)
    .single();
  if (profile?.is_employer) redirect("/employer");

  const [{ data: allMemberships }, { data: linkedChildren }] = await Promise.all([
    supabase
      .from("class_members")
      .select(`role, classes (id, title, subject, level, cycle_hours, deleted_at)`)
      .eq("user_id", user.id),
    supabase
      .from("parent_students")
      .select(`student:users!parent_students_student_id_fkey (id, full_name)`)
      .eq("parent_id", user.id),
  ]);

  const memberships = ((allMemberships ?? []) as MembershipRow[]).filter(
    (m) => m.classes && !m.classes.deleted_at
  );
  const tutorMemberships = memberships.filter((m) => m.role === "tutor");
  const studentMemberships = memberships.filter((m) => m.role === "student");
  const parentMemberships = memberships.filter((m) => m.role === "parent");

  const tutorClassIds = tutorMemberships.map((m) => m.classes.id);

  // Lessons/homework must cover every membership (including parent-role
  // classes), otherwise the parent tab has no data for observed classes.
  const allClassIds = [...new Set(memberships.map((m) => m.classes.id))];
  const inAll = allClassIds.length > 0 ? allClassIds : [FALLBACK_ID];
  const parentClassIds = memberships.map((m) => m.classes.id);

  const [
    { data: allLessons },
    { data: allHomework },
    { data: allCycles },
    { data: allCycleMembers },
    parentChildren,
  ] = await Promise.all([
    supabase
      .from("lessons")
      .select("id, class_id, duration_hours, status, scheduled_at, payment_cycle_id, replaces_lesson_id")
      .in("class_id", inAll)
      .is("deleted_at", null),
    supabase
      .from("homework")
      .select("id, class_id, deadline")
      .in("class_id", inAll)
      .is("deleted_at", null),
    supabase
      .from("payment_cycles")
      .select("id, class_id, cycle_number, started_at, closed_at, paid_at, payment_amount, payment_currency")
      .in("class_id", tutorClassIds.length > 0 ? tutorClassIds : [FALLBACK_ID])
      .order("started_at", { ascending: true }),
    supabase.from("class_members").select("class_id, user_id, role").in("class_id", inAll),
    Promise.all(
      (linkedChildren ?? []).map(async (link: { student: { id: string; full_name: string } }) => {
        const child = link.student;
        const { data: childMemberships } = await supabase
          .from("class_members")
          .select("class_id")
          .eq("user_id", child.id)
          .in("class_id", parentClassIds.length > 0 ? parentClassIds : [FALLBACK_ID]);

        return {
          id: child.id,
          full_name: child.full_name,
          sharedClassIds: (childMemberships ?? []).map((m) => m.class_id),
        };
      })
    ),
  ]);

  const hwIds = (allHomework ?? []).map((h) => h.id);
  const { data: allSubmissions } = await supabase
    .from("submissions")
    .select("id, homework_id, student_id, grade, created_at")
    .in("homework_id", hwIds.length > 0 ? hwIds : [FALLBACK_ID]);

  return {
    userId: user.id,
    tutorClasses: tutorMemberships.map((m) => m.classes),
    studentClasses: studentMemberships.map((m) => m.classes),
    parentClasses: parentMemberships.map((m) => m.classes),
    parentChildren,
    lessons: allLessons ?? [],
    homework: allHomework ?? [],
    submissions: allSubmissions ?? [],
    cycles: allCycles ?? [],
    classMembers: allCycleMembers ?? [],
  };
}
