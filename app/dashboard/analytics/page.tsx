/* =============================================================================
 * app/dashboard/analytics/page.tsx — tutor analytics route loader
 * -----------------------------------------------------------------------------
 * Role: Batches lessons, homework, submissions, cycles for the user’s classes;
 *       renders AnalyticsClient inside AppShell.
 * Dependencies: lib/auth, AppShell, AnalyticsClient
 * Used by: Route /dashboard/analytics
 * Inputs: Current user and class memberships
 * Outputs: Serializable analytics dataset for client charts
 * ========================================================================== */
import { redirect } from "next/navigation";
import { getServerClient, getCurrentUser } from "@/lib/auth";
import { AppShell } from "@/components/shell/app-shell";
import AnalyticsClient from "@/features/dashboard/components/AnalyticsClient";

export default async function AnalyticsPage() {
  const supabase = await getServerClient();
  const fallback = ["00000000-0000-0000-0000-000000000000"];

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Batch 1 — all depend only on the user.
  const [{ data: profile }, { data: allMemberships }, { data: linkedChildren }] = await Promise.all([
    supabase.from("users").select("full_name").eq("id", user.id).single(),
    supabase
      .from("class_members")
      .select(`role, classes (id, title, subject, level, cycle_hours, deleted_at)`)
      .eq("user_id", user.id),
    supabase
      .from("parent_students")
      .select(`student:users!parent_students_student_id_fkey (id, full_name)`)
      .eq("parent_id", user.id),
  ]);

  const memberships = (allMemberships ?? []).filter((m: any) => m.classes && !m.classes.deleted_at);
  const tutorMemberships = memberships.filter((m: any) => m.role === "tutor");
  const studentMemberships = memberships.filter((m: any) => m.role === "student");

  const tutorClassIds = tutorMemberships.map((m: any) => m.classes.id);
  const studentClassIds = studentMemberships.map((m: any) => m.classes.id);
  const allClassIds = [...new Set([...tutorClassIds, ...studentClassIds])];
  const inAll = allClassIds.length > 0 ? allClassIds : fallback;
  const parentClassIds = memberships.map((m: any) => m.classes.id);

  // Batch 2 — depend on the class-id sets (and the linked children) from batch 1.
  const [
    { data: allLessons },
    { data: allHomework },
    { data: allCycles },
    { data: allCycleMembers },
    parentChildren,
  ] = await Promise.all([
    supabase
      .from("lessons")
      .select("id, class_id, duration_hours, status, scheduled_at")
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
      .in("class_id", tutorClassIds.length > 0 ? tutorClassIds : fallback)
      .order("started_at", { ascending: true }),
    supabase.from("class_members").select("class_id, user_id, role").in("class_id", inAll),
    Promise.all(
      (linkedChildren ?? []).map(async (link: any) => {
        const child = link.student;
        const { data: childMemberships } = await supabase
          .from("class_members")
          .select("class_id")
          .eq("user_id", child.id)
          .in("class_id", parentClassIds.length > 0 ? parentClassIds : fallback);
        return {
          id: child.id,
          full_name: child.full_name,
          sharedClassIds: (childMemberships ?? []).map((m: any) => m.class_id),
        };
      })
    ),
  ]);

  const hwIds = (allHomework ?? []).map(h => h.id);
  const { data: allSubmissions } = await supabase
    .from("submissions")
    .select("id, homework_id, student_id, grade, created_at")
    .in("homework_id", hwIds.length > 0 ? hwIds : fallback);

  const fullName = profile?.full_name ?? "";
  const userInitials = fullName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

return (
  <AppShell mode="dashboard" tutorInitials={userInitials} tutorName={fullName} role="tutor" breadcrumb={{ root: "Analytics" }}>
    <AnalyticsClient
      userId={user.id}
      tutorClasses={tutorMemberships.map((m: any) => m.classes)}
      studentClasses={studentMemberships.map((m: any) => m.classes)}
      parentChildren={parentChildren}
      lessons={allLessons ?? []}
      homework={allHomework ?? []}
      submissions={allSubmissions ?? []}
      cycles={allCycles ?? []}
      classMembers={allCycleMembers ?? []}
    />
  </AppShell>
);
}