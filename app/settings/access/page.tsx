/* =============================================================================
 * app/settings/access/page.tsx — parent-child linking settings
 * -----------------------------------------------------------------------------
 * Role: Loads parent_students links and renders AccessClient in AppShell.
 * Dependencies: lib/auth, AppShell, AccessClient
 * Used by: Route /settings/access
 * Inputs: Current user id
 * Outputs: Linked parents/children for AccessClient
 * ========================================================================== */
import { redirect } from "next/navigation";
import { getServerClient, getCurrentUser } from "@/lib/auth";
import { AppShell } from "@/components/shell/app-shell";
import AccessClient from "@/features/settings/components/AccessClient";

export default async function AccessPage() {
  const supabase = await getServerClient();

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // profile + links + requests all depend only on the user — one batch.
  const [{ data: profile }, { data: children }, { data: parents }, { data: sentRequests }] =
    await Promise.all([
      supabase.from("users").select("full_name").eq("id", user.id).single(),
      // Children this user has linked
      supabase
        .from("parent_students")
        .select(`student:users!parent_students_student_id_fkey (id, full_name)`)
        .eq("parent_id", user.id),
      // Parents linked to this user
      supabase
        .from("parent_students")
        .select(`parent:users!parent_students_parent_id_fkey (id, full_name)`)
        .eq("student_id", user.id),
      // Pending requests this user sent (as parent)
      supabase
        .from("parent_requests")
        .select(`
          id, status, created_at,
          student:users!parent_requests_student_id_fkey (id, full_name)
        `)
        .eq("parent_id", user.id)
        .eq("status", "pending"),
    ]);

  const fullName = profile?.full_name ?? "";
  const userInitials = fullName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <AppShell mode="dashboard" tutorInitials={userInitials} tutorName={fullName} role="tutor" breadcrumb={{ root: "Settings", leaf: "Access & accounts" }}>
      <AccessClient
        userId={user.id}
        children={children ?? []}
        parents={parents ?? []}
        sentRequests={sentRequests ?? []}
      />
    </AppShell>
  );
}