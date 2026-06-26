/* =============================================================================
 * features/chat/actions.ts — class chat server actions
 * -----------------------------------------------------------------------------
 * Role: Persists new messages to the messages table after verifying the sender
 *       is a member of the class.
 * Dependencies: lib/supabase/server.ts
 * Used by: features/chat/components/ChatPage.tsx
 * Inputs: classId, message body (trimmed, non-empty)
 * Outputs: { error: string | null }
 * ========================================================================== */
"use server";

import { createClient } from "@/lib/supabase/server";

type Result = { error: string | null };

/** Post a chat message. Membership is verified server-side before insert. */
export async function postMessage(classId: string, body: string): Promise<Result> {
  const text = body.trim();
  if (!text) return { error: "Message is empty." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: membership } = await supabase
    .from("class_members")
    .select("role")
    .eq("class_id", classId)
    .eq("user_id", user.id)
    .single();
  if (!membership) return { error: "You're not a member of this class." };

  const { error } = await supabase.from("messages").insert({
    class_id: classId,
    author_id: user.id,
    body: text,
  });

  return { error: error?.message ?? null };
}
