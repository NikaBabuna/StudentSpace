/* =============================================================================
 * app/(shell)/inbox/page.tsx — invites and parent-link requests inbox
 * -----------------------------------------------------------------------------
 * Role: Loads pending class invites and parent_requests for the current user.
 * Shell lives in app/(shell)/layout.tsx.
 * ========================================================================== */
import { redirect } from "next/navigation";
import { getServerClient, getCurrentUser } from "@/lib/auth";
import InboxClient from "@/features/inbox/components/InboxClient";

export default async function InboxPage() {
  const supabase = await getServerClient();

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [{ data: invites }, { data: parentRequests }] = await Promise.all([
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

  return (
    <InboxClient invites={invites ?? []} parentRequests={parentRequests ?? []} />
  );
}
