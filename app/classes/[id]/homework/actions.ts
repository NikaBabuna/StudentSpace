"use server";

import { createClient } from "@/utils/supabase/server";
import { canSubmit } from "@/lib/homework";
import type { Attachment } from "@/lib/types";

/**
 * Server-side homework submission. The deadline check runs here, on the
 * server, so it cannot be bypassed by a client calling Supabase directly
 * (RLS protects rows and roles, but not the time-based deadline rule).
 *
 * Files are still uploaded from the browser; this action only records the
 * submission row once the rules pass.
 */
export async function submitHomework(input: {
  homeworkId: string;
  attachments: Attachment[];
}): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const { data: hw } = await supabase
    .from("homework")
    .select("id, class_id, deadline, deleted_at")
    .eq("id", input.homeworkId)
    .single();
  if (!hw || hw.deleted_at) return { error: "Homework not found." };

  // Must be a student member of the class.
  const { data: membership } = await supabase
    .from("class_members")
    .select("role")
    .eq("class_id", hw.class_id)
    .eq("user_id", user.id)
    .single();
  if (membership?.role !== "student") {
    return { error: "Only students can submit homework." };
  }

  // The rule that RLS can't express: no submissions after the deadline.
  if (!canSubmit(hw.deadline)) {
    return { error: "The deadline has passed — submissions are closed." };
  }

  const { error } = await supabase.from("submissions").insert({
    homework_id: input.homeworkId,
    student_id: user.id,
    attachments: input.attachments,
  });
  if (error) return { error: error.message };

  return { error: null };
}
