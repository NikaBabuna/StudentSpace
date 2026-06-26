/* =============================================================================
 * features/settings/actions.ts — parent-child linking actions
 * -----------------------------------------------------------------------------
 * Role: Parent sends link request by child email; either party can remove an
 *       existing parent_students row.
 * Dependencies: lib/supabase/server.ts
 * Used by: features/settings/components/AccessClient.tsx
 * Inputs: child/parent email or user id
 * Outputs: { error: string | null }
 * ========================================================================== */
"use server";

import { createClient } from "@/lib/supabase/server";

type Result = { error: string | null };

/**
 * Send a parent-link request to a student found by email. All lookups and
 * the insert run server-side; the parent_id is always the current user.
 */
export async function sendParentRequest(email: string): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: found } = await supabase
    .from("users")
    .select("id")
    .eq("email", email.trim().toLowerCase())
    .single();

  if (!found) return { error: "No account found with that email." };
  if (found.id === user.id) return { error: "You can't link yourself." };

  const { data: existing } = await supabase
    .from("parent_students")
    .select("id")
    .eq("parent_id", user.id)
    .eq("student_id", found.id)
    .single();
  if (existing) return { error: "Already linked to this person." };

  const { data: existingReq } = await supabase
    .from("parent_requests")
    .select("id")
    .eq("parent_id", user.id)
    .eq("student_id", found.id)
    .eq("status", "pending")
    .single();
  if (existingReq) return { error: "A request is already pending." };

  const { error } = await supabase.from("parent_requests").insert({
    parent_id: user.id,
    student_id: found.id,
    status: "pending",
  });

  return { error: error?.message ?? null };
}

/** Remove a parent→child link where the current user is the parent. */
export async function removeChild(studentId: string): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("parent_students")
    .delete()
    .eq("parent_id", user.id)
    .eq("student_id", studentId);
  return { error: error?.message ?? null };
}

/** Remove a parent→child link where the current user is the child. */
export async function removeParent(parentId: string): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("parent_students")
    .delete()
    .eq("parent_id", parentId)
    .eq("student_id", user.id);
  return { error: error?.message ?? null };
}
