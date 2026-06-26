/* =============================================================================
 * app/employer/inbox/page.tsx — employer inbox (shared InboxClient)
 * -----------------------------------------------------------------------------
 * Role: Same invite/request inbox as /inbox but inside employer layout shell.
 * Dependencies: lib/auth, InboxClient
 * Used by: Route /employer/inbox
 * Inputs: Pending invites and parent_requests for user
 * Outputs: InboxClient without main AppShell (employer layout wraps it)
 * ========================================================================== */
import { redirect } from "next/navigation";
import { getCurrentUser, getServerClient } from "@/lib/auth";
import InboxClient from "@/features/inbox/components/InboxClient";

export default async function EmployerInboxPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await getServerClient();

  const { data: invites } = await supabase
    .from("invites")
    .select(`
      id, role, status, created_at,
      classes (id, title, subject, level),
      invited_by_user:users!invites_invited_by_fkey (full_name)
    `)
    .eq("invited_user_id", user.id)
    .order("created_at", { ascending: false });

  return <InboxClient invites={invites ?? []} parentRequests={[]} />;
}
