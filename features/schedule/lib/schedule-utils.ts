/* =============================================================================
 * features/schedule/lib/schedule-utils.ts — schedule UI helpers (pure)
 * -----------------------------------------------------------------------------
 * Role: Date/time formatting, lesson status badges, recurrence summaries, and
 *       calendar chip styles for ScheduleClient. No Supabase calls.
 * Dependencies: None
 * Used by: ScheduleClient, ScheduleLessonDialog, LessonScheduleFields
 * Inputs: Lesson/RecurringSchedule shapes, date keys, durations
 * Outputs: Formatted strings, CSS class names, boolean helpers (isMakeup, etc.)
 * ========================================================================== */
export interface Lesson {
  id: string;
  scheduled_at: string;
  duration_hours: number;
  status: string;
  payment_cycle_id: string | null;
  replaces_lesson_id: string | null;
  recurring_schedule_id: string | null;
}

export interface Cycle {
  id: string;
  cycle_number: number;
  closed_at: string | null;
  paid_at: string | null;
}

export interface RecurringSchedule {
  id: string;
  weekday: number; // Postgres DOW: 0=Sun .. 6=Sat
  start_time: string; // "18:00:00"
  duration_hours: number;
  interval_weeks: number;
  anchor_date: string; // "2026-06-30"
  until_date: string | null;
  active: boolean;
}

// Postgres DOW indexing (0=Sunday). WEEKDAY_ORDER renders the picker Mon-first.
export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const WEEKDAY_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export function isRecurring(l: Lesson) {
  return !!l.recurring_schedule_id;
}

/** "18:00:00" | "18:00" -> "18:00" */
export function formatStartTime(t: string) {
  return t.slice(0, 5);
}

/** The local timezone of the tutor's browser (falls back to Tbilisi). */
export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Tbilisi";
  } catch {
    return "Asia/Tbilisi";
  }
}

/** Human summary of an existing schedule, e.g. "Mondays · 18:00 · 1.5h". */
export function recurrenceSummary(s: RecurringSchedule): string {
  const cadence = s.interval_weeks > 1 ? `Every ${s.interval_weeks} weeks · ` : "";
  const day = s.interval_weeks > 1 ? WEEKDAY_SHORT[s.weekday] : `${WEEKDAY_FULL[s.weekday]}s`;
  return `${cadence}${day} · ${formatStartTime(s.start_time)} · ${formatHoursShort(s.duration_hours)}`;
}

/** Live summary for the "Repeat weekly" form before the schedule exists. */
export function draftRecurrenceSummary(input: {
  weekdays: number[];
  startTime: string;
  durationHours: number;
  intervalWeeks: number;
}): string | null {
  if (input.weekdays.length === 0 || !input.startTime) return null;
  const days = WEEKDAY_ORDER.filter((d) => input.weekdays.includes(d))
    .map((d) => WEEKDAY_SHORT[d])
    .join(" & ");
  const cadence = input.intervalWeeks > 1 ? `every ${input.intervalWeeks} weeks` : "every week";
  return `${days} at ${formatStartTime(input.startTime)} · ${formatHoursShort(
    input.durationHours
  )} · ${cadence}`;
}

export function formatHoursShort(hours: number) {
  return hours === 1 ? "1h" : `${hours}h`;
}

export const DURATION_OPTIONS = [
  { value: 0.5, label: "30 min" },
  { value: 1, label: "1 hr" },
  { value: 1.5, label: "1.5 hr" },
  { value: 2, label: "2 hr" },
  { value: 2.5, label: "2.5 hr" },
  { value: 3, label: "3 hr" },
] as const;

export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatLongDate(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDuration(hours: number): string {
  if (hours === 0.5) return "30 min";
  if (hours === 1) return "1 hour";
  return `${hours} hours`;
}

export function buildScheduledAt(dateKey: string, time: string): string {
  return `${dateKey}T${time}`;
}

export function addTime(time: string, hours: number) {
  const [h, m] = time.split(":").map(Number);
  const t = h * 60 + m + hours * 60;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

export function lessonTime(l: Lesson) {
  const d = new Date(l.scheduled_at);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function lessonDateLine(l: Lesson) {
  const d = new Date(l.scheduled_at);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export function isMakeup(l: Lesson) {
  return !!l.replaces_lesson_id;
}

export function needsMakeup(l: Lesson, all: Lesson[]) {
  return l.status === "missed" && !all.some((m) => m.replaces_lesson_id === l.id);
}

export function lessonBarClass(l: Lesson): string {
  if (l.status === "completed") return "bg-ok";
  if (l.status === "missed") return "bg-danger";
  if (l.status === "cancelled") return "bg-line-2";
  return "bg-accent";
}

export function statusBadge(l: Lesson): {
  tone: "ok" | "danger" | "warn" | "accent" | "neutral";
  label: string;
} {
  const mu = isMakeup(l);
  if (l.status === "completed" && mu) return { tone: "ok", label: "Makeup · done" };
  if (l.status === "completed") return { tone: "ok", label: "Completed" };
  if (l.status === "missed" && mu) return { tone: "danger", label: "Makeup · missed" };
  if (l.status === "missed") return { tone: "danger", label: "Missed" };
  if (l.status === "scheduled" && mu) return { tone: "accent", label: "Makeup" };
  if (l.status === "cancelled") return { tone: "neutral", label: "Cancelled" };
  return { tone: "warn", label: "Upcoming" };
}

export function cycleBadgeTone(status: "paid" | "closed" | "progress") {
  if (status === "paid") return "ok" as const;
  if (status === "closed") return "accent" as const;
  return "warn" as const;
}

export function chipClass(selected: boolean) {
  return selected
    ? "border-accent bg-accent-tint font-semibold text-accent"
    : "border-line-2 bg-surface-2 font-medium text-ink-2 hover:bg-surface-3";
}

/* -----------------------------------------------------------------------------
 * Recurring collapse + occurrence-calendar helpers
 * -----------------------------------------------------------------------------
 * A weekly schedule materialises ~12 future lesson rows. Showing all of them in
 * the Upcoming list buries everything else, so the list collapses each schedule
 * to a single representative row (its soonest upcoming occurrence) and surfaces
 * the full set of dates in the occurrence dialog instead.
 * -------------------------------------------------------------------------- */

/** A collapsed Upcoming row: a one-off lesson, or one recurring slot's next hit. */
export type UpcomingRow =
  | { kind: "single"; lesson: Lesson }
  | { kind: "recurring"; lesson: Lesson; scheduleId: string; upcomingCount: number };

/**
 * Collapse already-sorted (ascending) upcoming lessons: each recurring schedule
 * becomes one row keyed on its earliest upcoming occurrence; one-off lessons
 * pass straight through. The result is re-sorted by date so recurring and
 * one-off rows interleave naturally.
 */
export function collapseUpcoming(upcoming: Lesson[]): UpcomingRow[] {
  const groups = new Map<string, Lesson[]>();
  const rows: UpcomingRow[] = [];

  for (const l of upcoming) {
    if (l.recurring_schedule_id) {
      const arr = groups.get(l.recurring_schedule_id);
      if (arr) arr.push(l);
      else groups.set(l.recurring_schedule_id, [l]);
    } else {
      rows.push({ kind: "single", lesson: l });
    }
  }

  for (const [scheduleId, arr] of groups) {
    arr.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
    rows.push({ kind: "recurring", lesson: arr[0], scheduleId, upcomingCount: arr.length });
  }

  rows.sort((a, b) => new Date(a.lesson.scheduled_at).getTime() - new Date(b.lesson.scheduled_at).getTime());
  return rows;
}

/** Short cadence label for a collapsed row, e.g. "Mondays" / "Every 2 weeks". */
export function recurrenceCadence(s: RecurringSchedule): string {
  return s.interval_weeks > 1 ? `Every ${s.interval_weeks} weeks` : `${WEEKDAY_FULL[s.weekday]}s`;
}

/** Index lessons by local date key ("yyyy-mm-dd") for O(1) calendar lookups. */
export function lessonsByDateKey(lessons: Lesson[]): Map<string, Lesson> {
  const map = new Map<string, Lesson>();
  for (const l of lessons) map.set(toDateKey(new Date(l.scheduled_at)), l);
  return map;
}

/** Single-letter weekday headers, Monday-first (matches WEEKDAY_ORDER). */
export const WEEKDAY_MIN = ["M", "T", "W", "T", "F", "S", "S"] as const;

export interface MonthCell {
  day: number;
  dateKey: string;
}

/**
 * A Monday-first month grid as rows of 7 cells; null = leading/trailing padding.
 * Pure date math so the occurrence dialog can render any month it pages to.
 */
export function monthGrid(year: number, monthIndex: number): (MonthCell | null)[][] {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const lead = (new Date(year, monthIndex, 1).getDay() + 6) % 7; // shift Sun-first -> Mon-first
  const cells: (MonthCell | null)[] = [];

  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, dateKey: toDateKey(new Date(year, monthIndex, d)) });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (MonthCell | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function monthLabel(year: number, monthIndex: number): string {
  return new Date(year, monthIndex, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

/** Calendar cell style for a day that carries (or lacks) an occurrence. */
export function occurrenceCellClass(lesson: Lesson | undefined): string {
  if (!lesson) return "text-muted/60";
  if (lesson.status === "completed") return "bg-ok-tint/60 font-semibold text-ok";
  if (lesson.status === "missed") return "bg-danger-tint/60 font-semibold text-danger";
  if (lesson.status === "cancelled") return "bg-surface-3 text-muted line-through";
  return "border border-accent/50 font-semibold text-accent"; // scheduled / upcoming
}
