/* =============================================================================
 * features/inbox/actions.ts — accept/decline pending requests
 * -----------------------------------------------------------------------------
 * Role: Responds to class invites and parent-child link requests. On accept,
 *       creates class_members or parent_students rows; on decline, updates status.
 * Dependencies: lib/supabase/server.ts
 * Used by: features/inbox/components/InboxClient.tsx
 * Inputs: inviteId or parent request id, accept boolean
 * Outputs: { error: string | null }
 * ========================================================================== */
"use server";

import { createClient } from "@/lib/supabase/server";
import { actionFail } from "@/lib/log";

type Result = { error: string | null };

/**
 * Accept or decline a class invite. The invite is looked up server-side and
 * verified to belong to the current user; the role written into class_members
 * comes from the invite row (not the client) so it can't be tampered with.
 */
export async function respondInvite(inviteId: string, accept: boolean): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return actionFail("SS-AUTH-01", null, { action: "respondInvite" });

  const { data: invite } = await supabase
    .from("invites")
    .select("id, class_id, invited_user_id, role, status")
    .eq("id", inviteId)
    .single();

  if (!invite) return actionFail("SS-NF-04", null, { action: "respondInvite", inviteId });
  if (invite.invited_user_id !== user.id) {
    return actionFail("SS-AUTH-05", null, { action: "respondInvite", inviteId });
  }
  if (invite.status !== "pending") return { error: "This invite has already been answered." };

  if (accept) {
    const { error } = await supabase.from("class_members").insert({
      class_id: invite.class_id,
      user_id: user.id,
      role: invite.role,
    });
    if (error) return actionFail("SS-INBOX-01", error.message, { inviteId, classId: invite.class_id });
  }

  const { error } = await supabase
    .from("invites")
    .update({ status: accept ? "accepted" : "declined" })
    .eq("id", inviteId);
  if (error) return actionFail("SS-INBOX-02", error.message, { inviteId });

  return { error: null };
}

/**
 * Accept or decline a parent-link request. Verified server-side that the
 * current user is the student the request targets; the parent_id written
 * comes from the request row, not the client.
 */
export async function respondParentRequest(reqId: string, accept: boolean): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return actionFail("SS-AUTH-01", null, { action: "respondParentRequest" });

  const { data: req } = await supabase
    .from("parent_requests")
    .select("id, parent_id, student_id, status")
    .eq("id", reqId)
    .single();

  if (!req) return actionFail("SS-NF-05", null, { action: "respondParentRequest", reqId });
  if (req.student_id !== user.id) {
    return actionFail("SS-AUTH-05", null, { action: "respondParentRequest", reqId });
  }
  if (req.status !== "pending") return { error: "This request has already been answered." };

  const { error } = await supabase
    .from("parent_requests")
    .update({ status: accept ? "accepted" : "declined" })
    .eq("id", reqId);
  if (error) return actionFail("SS-INBOX-03", error.message, { reqId });

  if (accept) {
    const { error: linkErr } = await supabase.from("parent_students").insert({
      parent_id: req.parent_id,
      student_id: user.id,
    });
    if (linkErr) return actionFail("SS-INBOX-04", linkErr.message, { reqId });
  }

  return { error: null };
}
