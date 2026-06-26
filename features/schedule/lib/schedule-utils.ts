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
