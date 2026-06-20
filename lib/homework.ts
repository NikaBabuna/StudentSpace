// Pure homework deadline logic. No React/Supabase so it's unit-testable and
// shareable between the client UI and server-side submission guards.

export type DeadlineStatus = "overdue" | "today" | "soon" | "upcoming";

/**
 * Classify a deadline relative to `now` (injectable for tests).
 * overdue = past, today = within 24h, soon = within 3 days, else upcoming.
 */
export function deadlineStatus(
  deadline: string,
  now: Date = new Date()
): DeadlineStatus {
  const due = new Date(deadline);
  const diffMs = due.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffMs < 0) return "overdue";
  if (diffHours < 24) return "today";
  if (diffDays < 3) return "soon";
  return "upcoming";
}

/** Submissions are locked once the deadline has passed. */
export function canSubmit(deadline: string, now: Date = new Date()): boolean {
  return new Date(deadline).getTime() > now.getTime();
}
