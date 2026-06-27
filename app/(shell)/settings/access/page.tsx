/* =============================================================================
 * app/(shell)/settings/access/page.tsx — parent-child linking settings
 * -----------------------------------------------------------------------------
 * Role: Loads parent_students links and renders AccessClient.
 * Shell lives in app/(shell)/layout.tsx.
 * ========================================================================== */
import { redirect } from "next/navigation";
import { getServerClient, getCurrentUser } from "@/lib/auth";
import AccessClient from "@/features/settings/components/AccessClient";

export default async function AccessPage() {
  const supabase = await getServerClient();

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [{ data: children }, { data: parents }, { data: sentRequests }] =
    await Promise.all([
      supabase
        .from("parent_students")
        .select(`student:users!parent_students_student_id_fkey (id, full_name)`)
        .eq("parent_id", user.id),
      supabase
        .from("parent_students")
        .select(`parent:users!parent_students_parent_id_fkey (id, full_name)`)
        .eq("student_id", user.id),
      supabase
        .from("parent_requests")
        .select(`
          id, status, created_at,
          student:users!parent_requests_student_id_fkey (id, full_name)
        `)
        .eq("parent_id", user.id)
        .eq("status", "pending"),
    ]);

  return (
    <AccessClient
      userId={user.id}
      children={children ?? []}
      parents={parents ?? []}
      sentRequests={sentRequests ?? []}
    />
  );
}
