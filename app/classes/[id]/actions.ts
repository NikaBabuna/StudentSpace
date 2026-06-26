"use server";

import { createClient } from "@/utils/supabase/server";

type Result = { error: string | null };

/** Remove a member from a class. Only the class tutor may do this. */
export async function removeMember(classId: string, userId: string): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: membership } = await supabase
    .from("class_members")
    .select("role")
    .eq("class_id", classId)
    .eq("user_id", user.id)
    .single();
  if (membership?.role !== "tutor") return { error: "Only tutors can remove members." };

  if (userId === user.id) return { error: "You can't remove yourself here." };

  const { error } = await supabase
    .from("class_members")
    .delete()
    .eq("class_id", classId)
    .eq("user_id", userId);

  return { error: error?.message ?? null };
}
