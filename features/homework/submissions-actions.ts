/* =============================================================================
 * features/homework/submissions-actions.ts — grade student submissions
 * -----------------------------------------------------------------------------
 * Role: Tutor writes feedback text (grade column) on a submission row.
 * Dependencies: lib/supabase/server.ts
 * Used by: features/homework/components/SubmissionsClient.tsx
 * Inputs: submissionId, grade text, classId (for revalidation)
 * Outputs: { error: string | null }
 * ========================================================================== */
"use server";

import { createClient } from "@/lib/supabase/server";
import { actionFail } from "@/lib/log";

type Result = { error: string | null };

export async function gradeSubmission(submissionId: string, grade: string, classId: string): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return actionFail("SS-AUTH-01", null, { action: "gradeSubmission" });

  const { data: membership } = await supabase
    .from("class_members")
    .select("role")
    .eq("class_id", classId)
    .eq("user_id", user.id)
    .single();
  if (membership?.role !== "tutor") {
    return actionFail("SS-AUTH-03", null, { action: "gradeSubmission", classId });
  }

  const { error } = await supabase
    .from("submissions")
    .update({ grade })
    .eq("id", submissionId);
  if (error) return actionFail("SS-SUB-02", error.message, { classId, submissionId });

  return { error: null };
}
