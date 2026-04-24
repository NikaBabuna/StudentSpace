import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import EmployerLayout from "./EmployerLayout";
import EmployerClient from "./EmployerClient";

export default async function EmployerDashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users").select("full_name, is_employer").eq("id", user.id).single();

  if (!profile?.is_employer) redirect("/dashboard");

  const { data: memberships } = await supabase
    .from("class_members")
    .select(`role, classes (id, title, subject, level, cycle_hours, deleted_at, created_by)`)
    .eq("user_id", user.id).eq("role", "employer");

  const classes = (memberships ?? [])
    .filter((m: any) => m.classes && !m.classes.deleted_at)
    .map((m: any) => m.classes);

  const classIds = classes.map((c: any) => c.id);
  const fallback = ["00000000-0000-0000-0000-000000000000"];

  const { data: allMembers } = await supabase
    .from("class_members").select("class_id, user_id, role")
    .in("class_id", classIds.length > 0 ? classIds : fallback);

  const tutorIds = [...new Set((allMembers ?? []).filter(m => m.role === "tutor").map(m => m.user_id))];
  const studentIds = [...new Set((allMembers ?? []).filter(m => m.role === "student").map(m => m.user_id))];
  const allUserIds = [...new Set([...tutorIds, ...studentIds])];

  const { data: userProfiles } = await supabase
    .from("users").select("id, full_name, email")
    .in("id", allUserIds.length > 0 ? allUserIds : fallback);

  const profileMap: Record<string, { full_name: string; email: string }> = {};
  for (const u of userProfiles ?? []) profileMap[u.id] = { full_name: u.full_name, email: u.email };

  const tutors = tutorIds.map(tid => ({
    id: tid,
    full_name: profileMap[tid]?.full_name ?? "Unknown",
    email: profileMap[tid]?.email ?? "",
    classes: classes.filter((c: any) =>
      (allMembers ?? []).some(m => m.class_id === c.id && m.user_id === tid && m.role === "tutor")
    ),
  }));

  const students = studentIds.map(sid => ({
    id: sid,
    full_name: profileMap[sid]?.full_name ?? "Unknown",
    email: profileMap[sid]?.email ?? "",
    classes: classes.filter((c: any) =>
      (allMembers ?? []).some(m => m.class_id === c.id && m.user_id === sid && m.role === "student")
    ),
  }));

  const fullName = profile.full_name ?? "";
  const firstName = fullName.split(" ")[0] ?? "there";
  const userInitials = fullName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <EmployerLayout fullName={fullName} userInitials={userInitials} userId={user.id}>
      <EmployerClient
        firstName={firstName}
        tutors={tutors}
        students={students}
        totalClasses={classes.length}
      />
    </EmployerLayout>
  );
}