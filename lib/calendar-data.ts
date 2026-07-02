/* =============================================================================
 * lib/calendar-data.ts — all-classes calendar data loader
 * -----------------------------------------------------------------------------
 * Role: Batches the queries for /calendar: the user's class memberships (with
 *       their per-class role) and every lesson across those classes. Mirrors
 *       loadDashboardData's parallel, waterfall-free pattern. Employers are
 *       redirected to their own area (they don't share this shell).
 * Dependencies: lib/auth, next/navigation, lib/types
 * Used by: app/(shell)/calendar/page.tsx
 * Inputs: None (reads the current session)
 * Outputs: loadCalendarData() → user identity, classes (id/title/role), lessons
 * ========================================================================== */
import { redirect } from "next/navigation";
import { getServerClient, getCurrentUser } from "@/lib/auth";
import type { ClassRole } from "@/lib/types";

const FALLBACK_ID = "00000000-0000-0000-0000-000000000000";

export type CalendarClass = {
  id: string;
  title: string;
  subject: string | null;
  level: string | null;
  role: ClassRole;
};

/** Shape of the class_members → classes join used by loadCalendarData. */
type MembershipRow = {
  role: string;
  classes: {
    id: string;
    title: string;
    subject: string | null;
    level: string | null;
    deleted_at: string | null;
  } | null;
};

export type CalendarLesson = {
  id: string;
  class_id: string;
  scheduled_at: string;
  duration_hours: number;
  status: string;
  payment_cycle_id: string | null;
  replaces_lesson_id: string | null;
  recurring_schedule_id: string | null;
};

export type CalendarData = {
  userId: string;
  fullName: string;
  userInitials: string;
  classes: CalendarClass[];
  lessons: CalendarLesson[];
};

export async function loadCalendarData(): Promise<CalendarData> {
  const supabase = await getServerClient();

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Profile (employer redirect + name) and memberships are independent.
  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from("users").select("full_name, is_employer").eq("id", user.id).single(),
    supabase
      .from("class_members")
      .select(`role, classes (id, title, subject, level, deleted_at)`)
      .eq("user_id", user.id),
  ]);

  if (profile?.is_employer) redirect("/employer");

  // Supabase's inferred join type is looser than what the query guarantees
  // (single-object FK join) — narrow it once here instead of casting per use.
  const classes: CalendarClass[] = ((memberships ?? []) as unknown as MembershipRow[])
    .filter((m): m is MembershipRow & { classes: NonNullable<MembershipRow["classes"]> } =>
      Boolean(m.classes && !m.classes.deleted_at)
    )
    .map((m) => ({
      id: m.classes.id,
      title: m.classes.title,
      subject: m.classes.subject,
      level: m.classes.level,
      role: m.role as ClassRole,
    }));

  const classIds = classes.map((c) => c.id);
  const inClassIds = classIds.length > 0 ? classIds : [FALLBACK_ID];

  const { data: lessons } = await supabase
    .from("lessons")
    .select(
      "id, class_id, scheduled_at, duration_hours, status, payment_cycle_id, replaces_lesson_id, recurring_schedule_id"
    )
    .in("class_id", inClassIds)
    .is("deleted_at", null)
    .order("scheduled_at", { ascending: true });

  const fullName = profile?.full_name ?? "";
  const userInitials = fullName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return {
    userId: user.id,
    fullName,
    userInitials,
    classes,
    lessons: (lessons ?? []) as CalendarLesson[],
  };
}
