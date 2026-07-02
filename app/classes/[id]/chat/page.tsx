/* =============================================================================
 * app/classes/[id]/chat/page.tsx — class chat route
 * -----------------------------------------------------------------------------
 * Role: Loads the chat header data (class title, member count, current user)
 *       server-side and renders the realtime ChatPage. Messages themselves are
 *       fetched client-side inside ChatPage, where the Realtime subscription
 *       lives. Membership is enforced by the class layout.
 * Dependencies: lib/auth (cached helpers), features/chat/components/ChatPage
 * Used by: Route /classes/[id]/chat
 * Inputs: params.id (class UUID)
 * Outputs: ChatPage with server-provided header props
 * ========================================================================== */
import { redirect } from "next/navigation";

import { getServerClient, requireAuth, getClassRow } from "@/lib/auth";
import ChatPage from "@/features/chat/components/ChatPage";

export default async function ChatRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAuth();
  const supabase = await getServerClient();

  // getClassRow is request-cached — the class layout already fetched it.
  const [cls, { count: memberCount }] = await Promise.all([
    getClassRow(id),
    supabase
      .from("class_members")
      .select("id", { count: "exact", head: true })
      .eq("class_id", id),
  ]);

  if (!cls) redirect("/dashboard");

  return (
    <ChatPage
      classId={id}
      classTitle={cls.title}
      memberCount={memberCount ?? 0}
      currentUserId={user.id}
    />
  );
}
