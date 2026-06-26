/* =============================================================================
 * features/homework/actions.ts — homework assignment and submission actions
 * -----------------------------------------------------------------------------
 * Role: Tutor CRUD on homework rows; students submit attachments before deadline.
 *       Enforces canSubmit() and Zod homeworkSchema server-side.
 * Dependencies: lib/supabase/server, lib/homework, lib/validation, lib/types
 * Used by: HomeworkClient, SubmissionsClient
 * Inputs: Homework fields, attachments jsonb, hwId/classId
 * Outputs: { error: string | null }
 * ========================================================================== */
"use server";

import { createClient } from "@/lib/supabase/server";
import { canSubmit } from "@/lib/homework";
import { homeworkSchema, firstError } from "@/lib/validation";
import type { Attachment } from "@/lib/types";

type Result = { error: string | null };

async function requireTutorForClass(classId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in.", supabase, user: null };
  const { data: membership } = await supabase
    .from("class_members").select("role")
    .eq("class_id", classId).eq("user_id", user.id).single();
  if (membership?.role !== "tutor") return { error: "Only tutors can do this.", supabase, user: null };
  return { error: null, supabase, user };
}

export async function createHomework(input: {
  classId: string;
  title: string;
  description?: string;
  deadline: string;
  attachments: Attachment[];
}): Promise<Result> {
  const parsed = homeworkSchema.safeParse({ title: input.title, description: input.description, deadline: input.deadline });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const ctx = await requireTutorForClass(input.classId);
  if (ctx.error) return { error: ctx.error };

  const { error } = await ctx.supabase.from("homework").insert({
    class_id: input.classId,
    created_by: ctx.user!.id,
    title: input.title,
    description: input.description || null,
    deadline: new Date(input.deadline).toISOString(),
    attachments: input.attachments,
  });

  return { error: error?.message ?? null };
}

export async function updateHomework(input: {
  hwId: string;
  classId: string;
  title: string;
  description?: string;
  deadline: string;
  attachments: Attachment[];
}): Promise<Result> {
  const parsed = homeworkSchema.safeParse({ title: input.title, description: input.description, deadline: input.deadline });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const ctx = await requireTutorForClass(input.classId);
  if (ctx.error) return { error: ctx.error };

  const { error } = await ctx.supabase.from("homework").update({
    title: input.title,
    description: input.description || null,
    deadline: new Date(input.deadline).toISOString(),
    attachments: input.attachments,
  }).eq("id", input.hwId);

  return { error: error?.message ?? null };
}

export async function deleteHomework(hwId: string, classId: string): Promise<Result> {
  const ctx = await requireTutorForClass(classId);
  if (ctx.error) return { error: ctx.error };

  const { error } = await ctx.supabase
    .from("homework")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", hwId);

  return { error: error?.message ?? null };
}

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
