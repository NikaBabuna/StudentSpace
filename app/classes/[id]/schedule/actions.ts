"use server";

import { createClient } from "@/utils/supabase/server";
import { sumCompletedHours, computeCycleClose } from "@/lib/payments";
import { lessonSchema, firstError } from "@/lib/validation";

type Result = { error: string | null };

async function getTutorContext(lessonId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." as string, supabase, user: null, lesson: null };

  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, class_id, duration_hours, scheduled_at, status, payment_cycle_id")
    .eq("id", lessonId)
    .single();
  if (!lesson) return { error: "Lesson not found.", supabase, user, lesson: null };

  const { data: membership } = await supabase
    .from("class_members")
    .select("role")
    .eq("class_id", lesson.class_id)
    .eq("user_id", user.id)
    .single();
  if (membership?.role !== "tutor") return { error: "Only tutors can modify lessons.", supabase, user, lesson: null };

  return { error: null, supabase, user, lesson };
}

export async function completeLesson(lessonId: string): Promise<Result> {
  const ctx = await getTutorContext(lessonId);
  if (ctx.error) return { error: ctx.error };
  const { supabase, lesson } = ctx;

  const { data: activeCycle } = await supabase
    .from("payment_cycles")
    .select("id, cycle_number")
    .eq("class_id", lesson!.class_id)
    .is("closed_at", null)
    .single();

  const { data: allLessons } = await supabase
    .from("lessons")
    .select("duration_hours, status, payment_cycle_id")
    .eq("class_id", lesson!.class_id)
    .is("deleted_at", null);

  const { data: classRow } = await supabase
    .from("classes")
    .select("cycle_hours")
    .eq("id", lesson!.class_id)
    .single();

  const cycleHours = classRow?.cycle_hours ?? 8;
  const hoursInCycle = activeCycle ? sumCompletedHours(allLessons ?? [], activeCycle.id) : 0;
  const { closesCycle, overflowHours } = computeCycleClose({
    hoursInCycle,
    lessonHours: lesson!.duration_hours,
    cycleTarget: cycleHours,
  });

  if (activeCycle && closesCycle) {
    const { error: e1 } = await supabase
      .from("lessons")
      .update({ status: "completed", payment_cycle_id: activeCycle.id })
      .eq("id", lessonId);
    if (e1) return { error: e1.message };

    const { error: e2 } = await supabase
      .from("payment_cycles")
      .update({ closed_at: new Date().toISOString() })
      .eq("id", activeCycle.id);
    if (e2) return { error: e2.message };

    const { data: newCycle, error: e3 } = await supabase
      .from("payment_cycles")
      .insert({ class_id: lesson!.class_id, cycle_number: activeCycle.cycle_number + 1 })
      .select()
      .single();
    if (e3) return { error: e3.message };

    if (overflowHours > 0 && newCycle) {
      await supabase.from("lessons").insert({
        class_id: lesson!.class_id,
        scheduled_at: lesson!.scheduled_at,
        duration_hours: overflowHours,
        status: "completed",
        payment_cycle_id: newCycle.id,
      });
    }
  } else {
    const { error } = await supabase
      .from("lessons")
      .update({ status: "completed", payment_cycle_id: activeCycle?.id ?? null })
      .eq("id", lessonId);
    if (error) return { error: error.message };
  }

  return { error: null };
}

export async function missLesson(lessonId: string): Promise<Result> {
  const ctx = await getTutorContext(lessonId);
  if (ctx.error) return { error: ctx.error };
  const { error } = await ctx.supabase.from("lessons").update({ status: "missed" }).eq("id", lessonId);
  return { error: error?.message ?? null };
}

export async function cancelLesson(lessonId: string): Promise<Result> {
  const ctx = await getTutorContext(lessonId);
  if (ctx.error) return { error: ctx.error };
  const { error } = await ctx.supabase.from("lessons").update({ status: "cancelled" }).eq("id", lessonId);
  return { error: error?.message ?? null };
}

export async function deleteLesson(lessonId: string): Promise<Result> {
  const ctx = await getTutorContext(lessonId);
  if (ctx.error) return { error: ctx.error };
  const { error } = await ctx.supabase
    .from("lessons")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", lessonId);
  return { error: error?.message ?? null };
}

export async function scheduleLesson(input: {
  classId: string;
  scheduledAt: string;
  durationHours: number;
  makeupForId?: string;
}): Promise<Result> {
  const parsed = lessonSchema.safeParse({ scheduledAt: input.scheduledAt, durationHours: input.durationHours });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: membership } = await supabase
    .from("class_members")
    .select("role")
    .eq("class_id", input.classId)
    .eq("user_id", user.id)
    .single();
  if (membership?.role !== "tutor") return { error: "Only tutors can schedule lessons." };

  const { error } = await supabase.from("lessons").insert({
    class_id: input.classId,
    scheduled_at: new Date(input.scheduledAt).toISOString(),
    duration_hours: input.durationHours,
    status: "scheduled",
    replaces_lesson_id: input.makeupForId || null,
  });

  return { error: error?.message ?? null };
}

export async function markCyclePaid(cycleId: string, classId: string): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: membership } = await supabase
    .from("class_members")
    .select("role")
    .eq("class_id", classId)
    .eq("user_id", user.id)
    .single();
  if (membership?.role !== "tutor") return { error: "Only tutors can mark cycles as paid." };

  const { error } = await supabase
    .from("payment_cycles")
    .update({ paid_at: new Date().toISOString() })
    .eq("id", cycleId);

  return { error: error?.message ?? null };
}
