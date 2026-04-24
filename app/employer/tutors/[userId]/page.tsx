import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import EmployerLayout from "../../EmployerLayout";
import PersonDetailClient from "../../PersonDetailClient";

export default async function TutorDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users").select("full_name, is_employer").eq("id", user.id).single();
  if (!profile?.is_employer) redirect("/dashboard");

  const { data: personProfile } = await supabase
    .from("users").select("full_name, email").eq("id", userId).single();

  // Employer's classes
  const { data: employerMemberships } = await supabase
    .from("class_members")
    .select(`class_id, classes (id, title, subject, level, cycle_hours, deleted_at)`)
    .eq("user_id", user.id).eq("role", "employer");

  const employerClassIds = (employerMemberships ?? [])
    .filter((m: any) => m.classes && !m.classes.deleted_at)
    .map((m: any) => m.class_id);

  // Shared classes where this person is a tutor
  const { data: personMemberships } = await supabase
    .from("class_members").select("class_id")
    .eq("user_id", userId).eq("role", "tutor")
    .in("class_id", employerClassIds.length > 0 ? employerClassIds : ["00000000-0000-0000-0000-000000000000"]);

  const sharedClassIds = (personMemberships ?? []).map(m => m.class_id);
  const sharedClasses = (employerMemberships ?? [])
    .filter((m: any) => sharedClassIds.includes(m.class_id) && m.classes && !m.classes.deleted_at)
    .map((m: any) => m.classes);

  const fullName = profile.full_name ?? "";
  const userInitials = fullName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <EmployerLayout fullName={fullName} userInitials={userInitials} userId={user.id}>
      <PersonDetailClient
        person={{ id: userId, full_name: personProfile?.full_name ?? "Unknown", email: personProfile?.email ?? "" }}
        classes={sharedClasses}
        role="tutor"
        backHref="/employer"
      />
    </EmployerLayout>
  );
}