/* =============================================================================
 * lib/validation.ts — Zod schemas for forms and server actions
 * -----------------------------------------------------------------------------
 * Role: Single source of validation rules for signup, class create, homework,
 *       and lessons. Used client-side for instant feedback and server-side
 *       so rules cannot be bypassed.
 * Dependencies: zod
 * Used by: Login/signup forms, NewClassForm, homework/schedule actions
 * Exports: signupSchema, classCreateSchema, homeworkSchema, lessonSchema,
 *          firstError(ZodError) → first message string
 * ========================================================================== */
import { z } from "zod";

export const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(100),
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  bio: z.string().max(500).optional(),
});

export const classCreateSchema = z.object({
  title: z.string().trim().min(1, "Class title is required").max(120),
  subject: z.string().trim().max(80).optional(),
  level: z.string().trim().max(80).optional(),
  description: z.string().max(2000).optional(),
  cycleHours: z
    .number({ message: "Cycle hours must be a number" })
    .int("Cycle hours must be a whole number")
    .positive("Cycle hours must be greater than 0"),
});

export const homeworkSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().max(5000).optional(),
  deadline: z.string().min(1, "Deadline is required"),
});

export const lessonSchema = z.object({
  scheduledAt: z.string().min(1, "Date and time are required"),
  durationHours: z
    .number({ message: "Duration must be a number" })
    .positive("Duration must be greater than 0"),
});

/** Returns the first validation message from a failed safeParse, for the UI. */
export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid input";
}
