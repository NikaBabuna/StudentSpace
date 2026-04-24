import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import AnalyticsClient from "./AnalyticsClient";

export default async function AnalyticsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users").select("full_name").eq("id", user.id).single();

  const { data: allMemberships } = await supabase
    .from("class_members")
    .select(`role, classes (id, title, subject, level, cycle_hours, deleted_at)`)
    .eq("user_id", user.id);

  const memberships = (allMemberships ?? []).filter((m: any) => m.classes && !m.classes.deleted_at);
  const tutorMemberships = memberships.filter((m: any) => m.role === "tutor");
  const studentMemberships = memberships.filter((m: any) => m.role === "student");

  const tutorClassIds = tutorMemberships.map((m: any) => m.classes.id);
  const studentClassIds = studentMemberships.map((m: any) => m.classes.id);
  const allClassIds = [...new Set([...tutorClassIds, ...studentClassIds])];
  const fallback = ["00000000-0000-0000-0000-000000000000"];

  const { data: allLessons } = await supabase
    .from("lessons")
    .select("id, class_id, duration_hours, status, scheduled_at")
    .in("class_id", allClassIds.length > 0 ? allClassIds : fallback)
    .is("deleted_at", null);

  const { data: allHomework } = await supabase
    .from("homework")
    .select("id, class_id, deadline")
    .in("class_id", allClassIds.length > 0 ? allClassIds : fallback)
    .is("deleted_at", null);

  const hwIds = (allHomework ?? []).map(h => h.id);
  const { data: allSubmissions } = await supabase
    .from("submissions")
    .select("id, homework_id, student_id, grade, created_at")
    .in("homework_id", hwIds.length > 0 ? hwIds : fallback);

  const { data: allCycles } = await supabase
    .from("payment_cycles")
    .select("id, class_id, cycle_number, started_at, closed_at, paid_at, payment_amount, payment_currency")
    .in("class_id", tutorClassIds.length > 0 ? tutorClassIds : fallback)
    .order("started_at", { ascending: true });

  const { data: allCycleMembers } = await supabase
    .from("class_members")
    .select("class_id, user_id, role")
    .in("class_id", allClassIds.length > 0 ? allClassIds : fallback);

  const fullName = profile?.full_name ?? "";
  const userInitials = fullName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  // Fetch children linked to this user (as parent)
const { data: linkedChildren } = await supabase
  .from("parent_students")
  .select(`student:users!parent_students_student_id_fkey (id, full_name)`)
  .eq("parent_id", user.id);

// For each child, find classes where both parent and child are members
const parentClassIds = allMemberships
  ?.filter((m: any) => m.classes && !m.classes.deleted_at)
  .map((m: any) => m.classes.id) ?? [];

const parentChildren = await Promise.all(
  (linkedChildren ?? []).map(async (link: any) => {
    const child = link.student;
    const { data: childMemberships } = await supabase
      .from("class_members")
      .select("class_id")
      .eq("user_id", child.id)
      .in("class_id", parentClassIds.length > 0 ? parentClassIds : ["00000000-0000-0000-0000-000000000000"]);
    return {
      id: child.id,
      full_name: child.full_name,
      sharedClassIds: (childMemberships ?? []).map((m: any) => m.class_id),
    };
  })
);

return (
  <AppLayout mode="dashboard" tutorInitials={userInitials} tutorName={fullName} role="tutor">
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
  </AppLayout>
);
}