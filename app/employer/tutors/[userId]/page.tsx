/* =============================================================================
 * app/employer/tutors/[userId]/page.tsx — employer tutor detail route
 * -----------------------------------------------------------------------------
 * Role: Loads one tutor profile and shared classes; PersonDetailClient UI.
 * Dependencies: lib/auth, PersonDetailClient
 * Used by: Route /employer/tutors/[userId]
 * Inputs: params.userId
 * Outputs: Tutor detail with class list (employer read-only)
 * ========================================================================== */
import { redirect } from "next/navigation";
import { getCurrentUser, getServerClient } from "@/lib/auth";
import PersonDetailClient from "@/features/employer/components/PersonDetailClient";

export default async function TutorDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await getServerClient();

  const { data: personProfile } = await supabase
    .from("users")
    .select("full_name, email")
    .eq("id", userId)
    .single();

  const { data: employerMemberships } = await supabase
    .from("class_members")
    .select(`class_id, classes (id, title, subject, level, cycle_hours, deleted_at)`)
    .eq("user_id", user.id)
    .eq("role", "employer");

  const employerClassIds = (employerMemberships ?? [])
    .filter((m) => m.classes && !m.classes.deleted_at)
    .map((m) => m.class_id);

  const { data: personMemberships } = await supabase
    .from("class_members")
    .select("class_id")
    .eq("user_id", userId)
    .eq("role", "tutor")
    .in("class_id", employerClassIds.length > 0 ? employerClassIds : ["00000000-0000-0000-0000-000000000000"]);

  const sharedClassIds = (personMemberships ?? []).map((m) => m.class_id);
  const sharedClasses = (employerMemberships ?? [])
    .filter((m) => sharedClassIds.includes(m.class_id) && m.classes && !m.classes.deleted_at)
    .map((m) => m.classes!);

  return (
    <PersonDetailClient
      person={{
        id: userId,
        full_name: personProfile?.full_name ?? "Unknown",
        email: personProfile?.email ?? "",
      }}
      classes={sharedClasses}
      role="tutor"
      backHref="/employer"
    />
  );
}
