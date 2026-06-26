/* =============================================================================
 * app/inbox/page.tsx — invites and parent-link requests inbox
 * -----------------------------------------------------------------------------
 * Role: Loads pending class invites and parent_requests for the current user;
 *       renders AppShell + InboxClient.
 * Dependencies: lib/auth, AppShell, InboxClient
 * Used by: Route /inbox
 * Inputs: Session user id
 * Outputs: InboxClient with invites and parentRequests arrays
 * ========================================================================== */
import { redirect } from "next/navigation";
import { getServerClient, getCurrentUser } from "@/lib/auth";
import { AppShell } from "@/components/shell/app-shell";
import InboxClient from "@/features/inbox/components/InboxClient";

export default async function InboxPage() {
  const supabase = await getServerClient();

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // All three reads depend only on the user — one batch.
  const [{ data: profile }, { data: invites }, { data: parentRequests }] = await Promise.all([
    supabase.from("users").select("full_name").eq("id", user.id).single(),
    supabase
      .from("invites")
      .select(`
        id, role, status, created_at,
        classes (id, title, subject, level),
        invited_by_user:users!invites_invited_by_fkey (full_name)
      `)
      .eq("invited_user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("parent_requests")
      .select(`
        id, status, created_at,
        parent:users!parent_requests_parent_id_fkey (id, full_name)
      `)
      .eq("student_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const fullName = profile?.full_name ?? "";
  const userInitials = fullName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <AppShell mode="dashboard" tutorInitials={userInitials} tutorName={fullName} role="tutor" breadcrumb={{ root: "Inbox" }}>
      <InboxClient invites={invites ?? []} parentRequests={parentRequests ?? []} />
    </AppShell>
  );
}