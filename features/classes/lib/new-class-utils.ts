/* =============================================================================
 * features/classes/lib/new-class-utils.ts — new-class wizard helpers
 * -----------------------------------------------------------------------------
 * Role: Shared step labels, level chip styling, and effective level string for
 *       the /classes/new multi-step form (no I/O).
 * Dependencies: None
 * Used by: NewClassForm, NewClassStepper
 * Exports: WIZARD_STEPS, chipButtonClass(), effectiveLevel()
 * ========================================================================== */

export const WIZARD_STEPS = [
  { label: "Basics" },
  { label: "Schedule" },
  { label: "Students" },
  { label: "Review" },
] as const;

export const STEP_LEADS = [
  "Name your class and pick the subject and level.",
  "Add a first lesson or set a weekly pattern — or skip for now.",
  "Add students now, or invite them later.",
  "Check everything looks right, then create.",
] as const;

export const SUBJECTS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer Science",
  "Other",
] as const;

export const LEVELS = [
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
  "University",
] as const;

/** Sentinel — when selected, tutor types a free-form level instead. */
export const LEVEL_CUSTOM = "Custom" as const;

export type InviteDraft = {
  email: string;
  name: string;
};

export function chipButtonClass(selected: boolean) {
  return selected
    ? "border-accent bg-accent-tint font-semibold text-accent"
    : "border-line-2 bg-surface-2 font-medium text-ink-2 hover:bg-surface-3";
}

export function effectiveLevel(levelChoice: string, customLevel: string): string {
  if (levelChoice === LEVEL_CUSTOM) return customLevel.trim();
  return levelChoice;
}
