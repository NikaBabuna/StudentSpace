/* =============================================================================
 * features/schedule/actions.ts — lessons, recurring slots, payment cycles
 * -----------------------------------------------------------------------------
 * Role: Full lesson lifecycle (schedule, complete, miss, cancel, delete) plus
 *       recurring_schedules CRUD and markCyclePaid. completeLesson runs A2
 *       overflow rollover via lib/payments.
 * Dependencies: lib/supabase/server, lib/payments, lib/validation
 * Used by: ScheduleClient, ScheduleLessonDialog, create-class pipeline
 * Inputs: lessonId, schedule fields, cycleId/classId
 * Outputs: { error: string | null }; revalidates class schedule route
 * ========================================================================== */
"use server";

import { createClient } from "@/lib/supabase/server";
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

// How many weeks ahead recurring lessons are materialised on create / refresh.
const RECURRENCE_HORIZON_WEEKS = 12;

/** Auth + tutor guard scoped to a class (not a single lesson). */
async function requireTutorForClass(classId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." as string | null, supabase, user: null };

  const { data: membership } = await supabase
    .from("class_members")
    .select("role")
    .eq("class_id", classId)
    .eq("user_id", user.id)
    .single();
  if (membership?.role !== "tutor")
    return { error: "Only tutors can manage schedules." as string | null, supabase, user: null };

  return { error: null as string | null, supabase, user };
}

/**
 * Create one weekly recurring schedule per selected weekday (each weekday is its
 * own slot row), then materialise the next ~12 weeks of lessons from each.
 * Returns how many concrete lessons were created.
 */
export async function createRecurringSchedule(input: {
  classId: string;
  weekdays: number[]; // Postgres DOW: 0=Sun .. 6=Sat
  startTime: string; // "18:00"
  durationHours: number;
  intervalWeeks: number; // >= 1
  anchorDate: string; // "yyyy-mm-dd"
  untilDate?: string | null;
  timezone: string; // tutor's browser timezone, e.g. "Asia/Tbilisi"
}): Promise<{ error: string | null; created: number }> {
  const { error: authError, supabase, user } = await requireTutorForClass(input.classId);
  if (authError || !user) return { error: authError ?? "Not signed in.", created: 0 };

  if (input.weekdays.length === 0) return { error: "Pick at least one day of the week.", created: 0 };
  if (!(input.durationHours > 0)) return { error: "Duration must be greater than 0.", created: 0 };
  if (input.intervalWeeks < 1) return { error: "Repeat interval must be at least 1 week.", created: 0 };

  const startTime = input.startTime.length === 5 ? `${input.startTime}:00` : input.startTime;
  let created = 0;

  for (const weekday of input.weekdays) {
    const { data: schedule, error: insertError } = await supabase
      .from("recurring_schedules")
      .insert({
        class_id: input.classId,
        created_by: user.id,
        weekday,
        start_time: startTime,
        duration_hours: input.durationHours,
        interval_weeks: input.intervalWeeks,
        anchor_date: input.anchorDate,
        until_date: input.untilDate || null,
        timezone: input.timezone,
      })
      .select("id")
      .single();
    if (insertError || !schedule) return { error: insertError?.message ?? "Could not save the schedule.", created };

    const { data: count, error: genError } = await supabase.rpc("generate_recurring_lessons", {
      p_schedule_id: schedule.id,
      p_horizon_weeks: RECURRENCE_HORIZON_WEEKS,
    });
    if (genError) return { error: genError.message, created };
    created += count ?? 0;
  }

  return { error: null, created };
}

/** Pause (and clear future untouched lessons) or resume (and re-generate). */
export async function setRecurringScheduleActive(
  scheduleId: string,
  classId: string,
  active: boolean
): Promise<Result> {
  const { error: authError, supabase } = await requireTutorForClass(classId);
  if (authError) return { error: authError };

  const { error } = await supabase
    .from("recurring_schedules")
    .update({ active })
    .eq("id", scheduleId);
  if (error) return { error: error.message };

  if (active) {
    await supabase.rpc("generate_recurring_lessons", {
      p_schedule_id: scheduleId,
      p_horizon_weeks: RECURRENCE_HORIZON_WEEKS,
    });
  } else {
    await supabase.rpc("clear_future_recurring_lessons", { p_schedule_id: scheduleId });
  }

  return { error: null };
}

/** Retire a schedule: drop its future untouched lessons, keep all history. */
export async function deleteRecurringSchedule(scheduleId: string, classId: string): Promise<Result> {
  const { error: authError, supabase } = await requireTutorForClass(classId);
  if (authError) return { error: authError };

  await supabase.rpc("clear_future_recurring_lessons", { p_schedule_id: scheduleId });
  const { error } = await supabase
    .from("recurring_schedules")
    .update({ deleted_at: new Date().toISOString(), active: false })
    .eq("id", scheduleId);

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
