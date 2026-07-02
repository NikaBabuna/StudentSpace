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
import { actionFail } from "@/lib/log";
import { userMessage } from "@/lib/errors";
import { sumCompletedHours, computeCycleClose } from "@/lib/payments";
import { lessonSchema, firstError } from "@/lib/validation";

type Result = { error: string | null };

async function getTutorContext(lessonId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: userMessage("SS-AUTH-01"), supabase, user: null, lesson: null };

  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, class_id, duration_hours, scheduled_at, status, payment_cycle_id")
    .eq("id", lessonId)
    .single();
  if (!lesson) return { error: userMessage("SS-NF-02"), supabase, user, lesson: null };

  const { data: membership } = await supabase
    .from("class_members")
    .select("role")
    .eq("class_id", lesson.class_id)
    .eq("user_id", user.id)
    .single();
  if (membership?.role !== "tutor") return { error: userMessage("SS-AUTH-03"), supabase, user, lesson: null };

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
    if (e1) return actionFail("SS-LESSON-02", e1.message, { lessonId, step: "complete" });

    const { error: e2 } = await supabase
      .from("payment_cycles")
      .update({ closed_at: new Date().toISOString() })
      .eq("id", activeCycle.id);
    if (e2) return actionFail("SS-CYCLE-01", e2.message, { lessonId, step: "close-cycle" });

    const { data: newCycle, error: e3 } = await supabase
      .from("payment_cycles")
      .insert({ class_id: lesson!.class_id, cycle_number: activeCycle.cycle_number + 1 })
      .select()
      .single();
    if (e3) return actionFail("SS-CYCLE-01", e3.message, { lessonId, step: "open-cycle" });

    if (overflowHours > 0 && newCycle) {
      const { error: e4 } = await supabase.from("lessons").insert({
        class_id: lesson!.class_id,
        scheduled_at: lesson!.scheduled_at,
        duration_hours: overflowHours,
        status: "completed",
        payment_cycle_id: newCycle.id,
      });
      if (e4) return actionFail("SS-CYCLE-01", e4.message, { lessonId, step: "overflow-lesson" });
    }
  } else {
    const { error } = await supabase
      .from("lessons")
      .update({ status: "completed", payment_cycle_id: activeCycle?.id ?? null })
      .eq("id", lessonId);
    if (error) return actionFail("SS-LESSON-02", error.message, { lessonId, step: "complete" });
  }

  return { error: null };
}

export async function missLesson(lessonId: string): Promise<Result> {
  const ctx = await getTutorContext(lessonId);
  if (ctx.error) return { error: ctx.error };
  const { error } = await ctx.supabase.from("lessons").update({ status: "missed" }).eq("id", lessonId);
  if (error) return actionFail("SS-LESSON-02", error.message, { lessonId, step: "miss" });
  return { error: null };
}

export async function cancelLesson(lessonId: string): Promise<Result> {
  const ctx = await getTutorContext(lessonId);
  if (ctx.error) return { error: ctx.error };
  const { error } = await ctx.supabase.from("lessons").update({ status: "cancelled" }).eq("id", lessonId);
  if (error) return actionFail("SS-LESSON-02", error.message, { lessonId, step: "cancel" });
  return { error: null };
}

export async function deleteLesson(lessonId: string): Promise<Result> {
  const ctx = await getTutorContext(lessonId);
  if (ctx.error) return { error: ctx.error };
  const { error } = await ctx.supabase
    .from("lessons")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", lessonId);
  if (error) return actionFail("SS-LESSON-03", error.message, { lessonId });
  return { error: null };
}

/**
 * Move and/or resize a single lesson (calendar drag-drop and the edit form).
 * Only `scheduled` lessons can be changed — completed/missed rows are history and
 * may be tied to a payment cycle. Editing one occurrence detaches it from its
 * recurring pattern (recurring_schedule_id → null) so the series generator/clear
 * never clobbers the customised lesson; the watermark guarantees no duplicate is
 * regenerated for the vacated slot.
 */
export async function updateLesson(input: {
  lessonId: string;
  scheduledAt?: string; // ISO string
  durationHours?: number;
}): Promise<Result> {
  const ctx = await getTutorContext(input.lessonId);
  if (ctx.error) return { error: ctx.error };
  const { supabase, lesson } = ctx;

  if (lesson!.status !== "scheduled") {
    return { error: "Only upcoming lessons can be moved or resized." };
  }

  const patch: {
    scheduled_at?: string;
    duration_hours?: number;
    recurring_schedule_id?: null;
  } = {};

  if (input.scheduledAt !== undefined) {
    const at = new Date(input.scheduledAt);
    if (Number.isNaN(at.getTime())) return { error: "Invalid date or time." };
    patch.scheduled_at = at.toISOString();
  }
  if (input.durationHours !== undefined) {
    if (!(input.durationHours > 0)) return { error: "Duration must be greater than 0." };
    patch.duration_hours = input.durationHours;
  }
  if (patch.scheduled_at === undefined && patch.duration_hours === undefined) {
    return { error: null }; // nothing to change
  }

  patch.recurring_schedule_id = null; // a hand-edited occurrence is now a one-off

  const { error } = await supabase.from("lessons").update(patch).eq("id", input.lessonId);
  if (error) return actionFail("SS-LESSON-04", error.message, { lessonId: input.lessonId });
  return { error: null };
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
  if (!user) return actionFail("SS-AUTH-01", null, { action: "scheduleLesson" });

  const { data: membership } = await supabase
    .from("class_members")
    .select("role")
    .eq("class_id", input.classId)
    .eq("user_id", user.id)
    .single();
  if (membership?.role !== "tutor") {
    return actionFail("SS-AUTH-03", null, { action: "scheduleLesson", classId: input.classId });
  }

  const { error } = await supabase.from("lessons").insert({
    class_id: input.classId,
    scheduled_at: new Date(input.scheduledAt).toISOString(),
    duration_hours: input.durationHours,
    status: "scheduled",
    replaces_lesson_id: input.makeupForId || null,
  });
  if (error) return actionFail("SS-LESSON-01", error.message, { classId: input.classId });

  return { error: null };
}

// How many weeks ahead recurring lessons are materialised on create / refresh.
const RECURRENCE_HORIZON_WEEKS = 12;

/** Auth + tutor guard scoped to a class (not a single lesson). */
async function requireTutorForClass(classId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: userMessage("SS-AUTH-01") as string | null, supabase, user: null };

  const { data: membership } = await supabase
    .from("class_members")
    .select("role")
    .eq("class_id", classId)
    .eq("user_id", user.id)
    .single();
  if (membership?.role !== "tutor")
    return { error: userMessage("SS-AUTH-03") as string | null, supabase, user: null };

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
  if (authError || !user) return { error: authError ?? userMessage("SS-AUTH-01"), created: 0 };

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
    if (insertError || !schedule) {
      return { created, ...actionFail("SS-RECUR-01", insertError?.message, { classId: input.classId, weekday }) };
    }

    const { data: count, error: genError } = await supabase.rpc("generate_recurring_lessons", {
      p_schedule_id: schedule.id,
      p_horizon_weeks: RECURRENCE_HORIZON_WEEKS,
    });
    if (genError) {
      return { created, ...actionFail("SS-RECUR-02", genError.message, { scheduleId: schedule.id }) };
    }
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
  if (error) return actionFail("SS-RECUR-03", error.message, { scheduleId, step: "toggle-active" });

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
  if (error) return actionFail("SS-RECUR-03", error.message, { scheduleId, step: "retire" });

  return { error: null };
}

export async function markCyclePaid(cycleId: string, classId: string): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return actionFail("SS-AUTH-01", null, { action: "markCyclePaid" });

  const { data: membership } = await supabase
    .from("class_members")
    .select("role")
    .eq("class_id", classId)
    .eq("user_id", user.id)
    .single();
  if (membership?.role !== "tutor") {
    return actionFail("SS-AUTH-03", null, { action: "markCyclePaid", classId });
  }

  const { error } = await supabase
    .from("payment_cycles")
    .update({ paid_at: new Date().toISOString() })
    .eq("id", cycleId);
  if (error) return actionFail("SS-CYCLE-02", error.message, { classId, cycleId });

  return { error: null };
}
