/* =============================================================================
 * features/classes/actions/create-class.ts — class creation pipeline
 * -----------------------------------------------------------------------------
 * Role: Creates a class, initial payment cycle, optional first lesson/recurring
 *       slot, and sends pending invites. Multi-step wizard calls these actions.
 * Dependencies: lib/supabase/server, lib/validation, schedule/actions, invite
 * Used by: features/classes/components/NewClassForm.tsx
 * Inputs: Class metadata, cycle hours, payment, schedule, invite emails
 * Outputs: lookupInviteEmail → user preview; createClass → class id or error
 * ========================================================================== */
"use server";

import { createClient } from "@/lib/supabase/server";
import { classCreateSchema, firstError } from "@/lib/validation";
import {
  createRecurringSchedule,
  scheduleLesson,
} from "@/features/schedule/actions";
import { sendInvite } from "@/features/classes/actions/invite";

export async function lookupInviteEmail(
  email: string
): Promise<{ name: string | null; error: string | null }> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed.includes("@")) return { name: null, error: "Enter a valid email address." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { name: null, error: "Not signed in." };

  const { data } = await supabase
    .from("users")
    .select("id, full_name, email")
    .eq("email", trimmed)
    .is("deleted_at", null)
    .single();

  if (!data) return { name: null, error: "No account found with that email address." };
  if (data.id === user.id) return { name: null, error: "You can't invite yourself." };

  return { name: data.full_name, error: null };
}

export type CreateClassScheduleInput =
  | {
      mode: "once";
      scheduledAt: string;
      durationHours: number;
    }
  | {
      mode: "repeat";
      weekdays: number[];
      startTime: string;
      durationHours: number;
      intervalWeeks: number;
      anchorDate: string;
      untilDate: string | null;
      timezone: string;
    };

export type CreateClassPipelineInput = {
  title: string;
  subject: string;
  level: string;
  description?: string;
  cycleHours: number;
  paymentAmount?: number | null;
  paymentCurrency?: string;
  schedule?: CreateClassScheduleInput;
  inviteEmails?: string[];
};

export type CreateClassPipelineResult = {
  classId: string | null;
  error: string | null;
  inviteErrors?: string[];
};

export async function createClassPipeline(
  input: CreateClassPipelineInput
): Promise<CreateClassPipelineResult> {
  const parsed = classCreateSchema.safeParse({
    title: input.title,
    subject: input.subject,
    level: input.level,
    description: input.description,
    cycleHours: input.cycleHours,
  });
  if (!parsed.success) return { classId: null, error: firstError(parsed.error) };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { classId: null, error: "Not signed in." };

  const { data: newClass, error: classError } = await supabase
    .from("classes")
    .insert({
      created_by: user.id,
      title: input.title,
      subject: input.subject,
      level: input.level,
      description: input.description || null,
      cycle_hours: input.cycleHours,
    })
    .select("id")
    .single();
  if (classError || !newClass) return { classId: null, error: classError?.message ?? "Could not create class." };

  const { error: memberError } = await supabase
    .from("class_members")
    .insert({ class_id: newClass.id, user_id: user.id, role: "tutor" });
  if (memberError) return { classId: null, error: memberError.message };

  const { error: cycleError } = await supabase.from("payment_cycles").insert({
    class_id: newClass.id,
    cycle_number: 1,
    payment_amount: input.paymentAmount ?? null,
    payment_currency: input.paymentCurrency ?? "GEL",
  });
  if (cycleError) return { classId: null, error: cycleError.message };

  if (input.schedule?.mode === "once") {
    const { error: lessonError } = await scheduleLesson({
      classId: newClass.id,
      scheduledAt: input.schedule.scheduledAt,
      durationHours: input.schedule.durationHours,
    });
    if (lessonError) return { classId: null, error: lessonError };
  } else if (input.schedule?.mode === "repeat") {
    const { error: scheduleError } = await createRecurringSchedule({
      classId: newClass.id,
      weekdays: input.schedule.weekdays,
      startTime: input.schedule.startTime,
      durationHours: input.schedule.durationHours,
      intervalWeeks: input.schedule.intervalWeeks,
      anchorDate: input.schedule.anchorDate,
      untilDate: input.schedule.untilDate,
      timezone: input.schedule.timezone,
    });
    if (scheduleError) return { classId: null, error: scheduleError };
  }

  const inviteErrors: string[] = [];
  for (const email of input.inviteEmails ?? []) {
    const { error: inviteError } = await sendInvite(newClass.id, email, "student");
    if (inviteError) inviteErrors.push(`${email}: ${inviteError}`);
  }

  return {
    classId: newClass.id,
    error: null,
    inviteErrors: inviteErrors.length ? inviteErrors : undefined,
  };
}

/** @deprecated Use createClassPipeline — kept for any legacy callers. */
export async function createClass(input: {
  title: string;
  subject?: string;
  level?: string;
  description?: string;
  cycleHours: number;
  paymentAmount?: number | null;
  paymentCurrency?: string;
}): Promise<{ classId: string | null; error: string | null }> {
  const result = await createClassPipeline({
    title: input.title,
    subject: input.subject ?? "",
    level: input.level ?? "",
    description: input.description,
    cycleHours: input.cycleHours,
    paymentAmount: input.paymentAmount,
    paymentCurrency: input.paymentCurrency,
  });
  return { classId: result.classId, error: result.error };
}
