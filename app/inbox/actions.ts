"use server";

import { createClient } from "@/utils/supabase/server";

type Result = { error: string | null };

/**
 * Accept or decline a class invite. The invite is looked up server-side and
 * verified to belong to the current user; the role written into class_members
 * comes from the invite row (not the client) so it can't be tampered with.
 */
export async function respondInvite(inviteId: string, accept: boolean): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: invite } = await supabase
    .from("invites")
    .select("id, class_id, invited_user_id, role, status")
    .eq("id", inviteId)
    .single();

  if (!invite) return { error: "Invite not found." };
  if (invite.invited_user_id !== user.id) return { error: "This invite isn't yours." };
  if (invite.status !== "pending") return { error: "This invite has already been answered." };

  if (accept) {
    const { error } = await supabase.from("class_members").insert({
      class_id: invite.class_id,
      user_id: user.id,
      role: invite.role,
    });
    if (error) return { error: error.message };
  }

  const { error } = await supabase
    .from("invites")
    .update({ status: accept ? "accepted" : "declined" })
    .eq("id", inviteId);

  return { error: error?.message ?? null };
}

/**
 * Accept or decline a parent-link request. Verified server-side that the
 * current user is the student the request targets; the parent_id written
 * comes from the request row, not the client.
 */
export async function respondParentRequest(reqId: string, accept: boolean): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: req } = await supabase
    .from("parent_requests")
    .select("id, parent_id, student_id, status")
    .eq("id", reqId)
    .single();

  if (!req) return { error: "Request not found." };
  if (req.student_id !== user.id) return { error: "This request isn't yours." };
  if (req.status !== "pending") return { error: "This request has already been answered." };

  const { error } = await supabase
    .from("parent_requests")
    .update({ status: accept ? "accepted" : "declined" })
    .eq("id", reqId);
  if (error) return { error: error.message };

  if (accept) {
    const { error: linkErr } = await supabase.from("parent_students").insert({
      parent_id: req.parent_id,
      student_id: user.id,
    });
    if (linkErr) return { error: linkErr.message };
  }

  return { error: null };
}
