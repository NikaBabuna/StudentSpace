// Pure payment-cycle business logic. Kept free of React/Supabase so it can be
// unit-tested and reused by both client components and (later) server actions.

export interface CycleLessonInput {
  duration_hours: number;
  status: string;
  payment_cycle_id: string | null;
}

/** Sum completed lesson hours assigned to a given payment cycle. */
export function sumCompletedHours(
  lessons: CycleLessonInput[],
  cycleId: string
): number {
  return lessons
    .filter((l) => l.payment_cycle_id === cycleId && l.status === "completed")
    .reduce((sum, l) => sum + l.duration_hours, 0);
}

/**
 * The "A2 overflow rollover" rule. When a lesson of `lessonHours` is completed
 * in a cycle that already holds `hoursInCycle` completed hours and targets
 * `cycleTarget` hours:
 *   - if the new total reaches/exceeds the target, the cycle closes and the
 *     excess (`overflowHours`) carries into the next cycle;
 *   - otherwise the lesson simply adds to the current cycle.
 */
export function computeCycleClose(args: {
  hoursInCycle: number;
  lessonHours: number;
  cycleTarget: number;
}): { closesCycle: boolean; overflowHours: number } {
  const newTotal = args.hoursInCycle + args.lessonHours;
  if (newTotal >= args.cycleTarget) {
    return { closesCycle: true, overflowHours: newTotal - args.cycleTarget };
  }
  return { closesCycle: false, overflowHours: 0 };
}
