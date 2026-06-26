/* =============================================================================
 * features/dashboard/actions.ts — class settings mutations
 * -----------------------------------------------------------------------------
 * Role: Updates class metadata (title, subject, payment on open cycle) and
 *       soft-deletes a class. Only the class creator may call these.
 * Dependencies: lib/supabase/server.ts
 * Used by: components/shell/class-settings-modal.tsx
 * Inputs: classId + editable fields, or classId for delete
 * Outputs: { error: string | null }; revalidates dashboard and class routes
 * ========================================================================== */
"use server";

import { createClient } from "@/lib/supabase/server";

type Result = { error: string | null };

async function requireClassCreator(classId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in.", supabase, user: null };

  const { data: cls } = await supabase
    .from("classes")
    .select("created_by")
    .eq("id", classId)
    .single();
  if (!cls) return { error: "Class not found.", supabase, user: null };
  if (cls.created_by !== user.id) return { error: "Only the class creator can do this.", supabase, user: null };

  return { error: null, supabase, user };
}

export async function updateClass(input: {
  classId: string;
  title: string;
  subject?: string;
  level?: string;
  description?: string;
  tutorNotes?: string;
  cycleHours: number;
  paymentAmount?: number | null;
  paymentCurrency?: string;
}): Promise<Result> {
  if (!input.title.trim()) return { error: "Title is required." };

  const ctx = await requireClassCreator(input.classId);
  if (ctx.error) return { error: ctx.error };

  const { error } = await ctx.supabase.from("classes").update({
    title: input.title.trim(),
    subject: input.subject?.trim() || null,
    level: input.level?.trim() || null,
    description: input.description?.trim() || null,
    tutor_notes: input.tutorNotes?.trim() || null,
    cycle_hours: input.cycleHours,
  }).eq("id", input.classId);
  if (error) return { error: error.message };

  if (input.paymentAmount != null) {
    await ctx.supabase
      .from("payment_cycles")
      .update({
        payment_amount: input.paymentAmount || null,
        payment_currency: input.paymentCurrency ?? "GEL",
      })
      .eq("class_id", input.classId)
      .is("closed_at", null);
  }

  return { error: null };
}

export async function deleteClass(classId: string): Promise<Result> {
  const ctx = await requireClassCreator(classId);
  if (ctx.error) return { error: ctx.error };
  const { supabase } = ctx;
  const now = new Date().toISOString();

  await supabase.from("lessons").update({ deleted_at: now }).eq("class_id", classId);
  await supabase.from("homework").update({ deleted_at: now }).eq("class_id", classId);
  await supabase.from("materials").update({ deleted_at: now }).eq("class_id", classId);
  await supabase.from("material_groups").update({ deleted_at: now }).eq("class_id", classId);
  await supabase.from("class_members").delete().eq("class_id", classId);
  const { error } = await supabase.from("classes").update({ deleted_at: now }).eq("id", classId);

  return { error: error?.message ?? null };
}
