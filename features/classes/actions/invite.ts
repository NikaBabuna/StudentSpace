/* =============================================================================
 * features/classes/actions/invite.ts — send class invite
 * -----------------------------------------------------------------------------
 * Role: Tutor invites an existing user by email to join a class with a role.
 *       Employer accounts are always invited as employer regardless of choice.
 * Dependencies: lib/supabase/server, lib/types (ClassRole)
 * Used by: InviteClient, create-class pipeline
 * Inputs: classId, email, role
 * Outputs: { error: string | null }; creates invites row (pending)
 * ========================================================================== */
"use server";

import { createClient } from "@/lib/supabase/server";
import type { ClassRole } from "@/lib/types";

type Result = { error: string | null };

/**
 * Send a class invite. Verified server-side that the caller is the tutor of
 * the class. The target is re-looked-up by email here (not trusted from the
 * client), and employer accounts are forced to the employer role.
 */
export async function sendInvite(classId: string, email: string, role: ClassRole): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: membership } = await supabase
    .from("class_members")
    .select("role")
    .eq("class_id", classId)
    .eq("user_id", user.id)
    .single();
  if (membership?.role !== "tutor") return { error: "Only tutors can send invites." };

  const { data: target } = await supabase
    .from("users")
    .select("id, is_employer")
    .eq("email", email.trim().toLowerCase())
    .is("deleted_at", null)
    .single();
  if (!target) return { error: "No account found with that email address." };
  if (target.id === user.id) return { error: "You can't invite yourself." };

  const effectiveRole = target.is_employer ? "employer" : role;

  const { data: existing } = await supabase
    .from("class_members")
    .select("id")
    .eq("class_id", classId)
    .eq("user_id", target.id)
    .single();
  if (existing) return { error: "This person is already a member of this class." };

  const { data: existingInvite } = await supabase
    .from("invites")
    .select("id, status")
    .eq("class_id", classId)
    .eq("invited_user_id", target.id)
    .single();
  if (existingInvite?.status === "pending") {
    return { error: "This person already has a pending invite to this class." };
  }

  const { error } = await supabase.from("invites").insert({
    class_id: classId,
    invited_by: user.id,
    invited_user_id: target.id,
    role: effectiveRole,
  });

  return { error: error?.message ?? null };
}
