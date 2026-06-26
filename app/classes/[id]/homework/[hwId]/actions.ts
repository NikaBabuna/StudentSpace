"use server";

import { createClient } from "@/utils/supabase/server";

type Result = { error: string | null };

export async function gradeSubmission(submissionId: string, grade: string, classId: string): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: membership } = await supabase
    .from("class_members")
    .select("role")
    .eq("class_id", classId)
    .eq("user_id", user.id)
    .single();
  if (membership?.role !== "tutor") return { error: "Only tutors can give feedback." };

  const { error } = await supabase
    .from("submissions")
    .update({ grade })
    .eq("id", submissionId);

  return { error: error?.message ?? null };
}
