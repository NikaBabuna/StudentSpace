/* =============================================================================
 * features/classes/actions/members.ts — roster management
 * -----------------------------------------------------------------------------
 * Role: Removes a user from class_members. Tutor-only; cannot remove self.
 * Dependencies: lib/supabase/server.ts
 * Used by: features/classes/components/MembersButton.tsx
 * Inputs: classId, userId to remove
 * Outputs: { error: string | null }
 * ========================================================================== */
"use server";

import { createClient } from "@/lib/supabase/server";
import { actionFail } from "@/lib/log";

type Result = { error: string | null };

/** Remove a member from a class. Only the class tutor may do this. */
export async function removeMember(classId: string, userId: string): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return actionFail("SS-AUTH-01", null, { action: "removeMember" });

  const { data: membership } = await supabase
    .from("class_members")
    .select("role")
    .eq("class_id", classId)
    .eq("user_id", user.id)
    .single();
  if (membership?.role !== "tutor") {
    return actionFail("SS-AUTH-03", null, { action: "removeMember", classId });
  }

  if (userId === user.id) return { error: "You can't remove yourself here." };

  const { error } = await supabase
    .from("class_members")
    .delete()
    .eq("class_id", classId)
    .eq("user_id", userId);
  if (error) return actionFail("SS-MEMBER-01", error.message, { classId });

  return { error: null };
}
