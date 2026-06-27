/* =============================================================================
 * features/calendar/lib/calendar-utils.ts — calendar math + class colors (pure)
 * -----------------------------------------------------------------------------
 * Role: Week/day geometry, time<->pixel mapping, drag snapping, overlap column
 *       packing, and a stable per-class color. No React, no Supabase.
 * Dependencies: schedule-utils (monthGrid/toDateKey reuse)
 * Used by: CalendarClient and the calendar dialogs
 * ========================================================================== */
/* ---- Class colors -------------------------------------------------------- */

/** Mid-tone hues (oklch works in both themes); tint is the same hue, low alpha. */
export interface ClassColor {
  bar: string; // solid — text, left border, legend swatch
  tint: string; // translucent — block background
}

const CLASS_PALETTE: ClassColor[] = [
  { bar: "oklch(0.65 0.14 255)", tint: "oklch(0.65 0.14 255 / 0.18)" }, // blue
  { bar: "oklch(0.68 0.14 155)", tint: "oklch(0.68 0.14 155 / 0.18)" }, // green
  { bar: "oklch(0.7 0.14 50)", tint: "oklch(0.7 0.14 50 / 0.18)" }, // amber
  { bar: "oklch(0.66 0.15 330)", tint: "oklch(0.66 0.15 330 / 0.18)" }, // magenta
  { bar: "oklch(0.68 0.13 200)", tint: "oklch(0.68 0.13 200 / 0.18)" }, // cyan
  { bar: "oklch(0.66 0.15 295)", tint: "oklch(0.66 0.15 295 / 0.18)" }, // violet
  { bar: "oklch(0.66 0.16 20)", tint: "oklch(0.66 0.16 20 / 0.18)" }, // red-orange
];

/** Deterministic color for a class id (stable across renders and sessions). */
export function classColor(classId: string): ClassColor {
  let hash = 0;
  for (let i = 0; i < classId.length; i++) hash = (hash * 31 + classId.charCodeAt(i)) >>> 0;
  return CLASS_PALETTE[hash % CLASS_PALETTE.length];
}

/* ---- Week / day geometry ------------------------------------------------- */

export function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const mondayFirst = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - mondayFirst);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function weekDays(ref: Date): Date[] {
  const start = startOfWeek(ref);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** "23 – 29 June 2026", collapsing month/year when the week doesn't span them. */
export function formatWeekRange(ref: Date): string {
  const days = weekDays(ref);
  const a = days[0];
  const b = days[6];
  const sameMonth = a.getMonth() === b.getMonth();
  const sameYear = a.getFullYear() === b.getFullYear();
  const monthYear = (d: Date) =>
    d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  if (sameMonth && sameYear) return `${a.getDate()} – ${b.getDate()} ${monthYear(a)}`;
  if (sameYear) {
    return `${a.getDate()} ${a.toLocaleDateString("en-GB", { month: "short" })} – ${b.getDate()} ${monthYear(b)}`;
  }
  const short = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return `${short(a)} – ${short(b)}`;
}

export function formatMonthTitle(ref: Date): string {
  return ref.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

/** Vertical window (in hours) the week grid spans, padded around the day's lessons. */
export function dayWindow(weekLessons: { scheduled_at: string; duration_hours: number }[]): {
  startHour: number;
  endHour: number;
} {
  let min = 24;
  let max = 0;
  for (const l of weekLessons) {
    const d = new Date(l.scheduled_at);
    const s = d.getHours() + d.getMinutes() / 60;
    min = Math.min(min, s);
    max = Math.max(max, s + l.duration_hours);
  }
  if (max <= min) {
    min = 12;
    max = 20;
  }
  let startHour = Math.max(0, Math.floor(min) - 1);
  let endHour = Math.min(24, Math.ceil(max) + 1);
  const MIN_SPAN = 9;
  if (endHour - startHour < MIN_SPAN) {
    const pad = MIN_SPAN - (endHour - startHour);
    endHour = Math.min(24, endHour + Math.ceil(pad / 2));
    startHour = Math.max(0, startHour - (MIN_SPAN - (endHour - startHour)));
  }
  return { startHour, endHour };
}

/** Minutes-from-midnight of a lesson's start. */
export function lessonStartMinutes(l: { scheduled_at: string }): number {
  const d = new Date(l.scheduled_at);
  return d.getHours() * 60 + d.getMinutes();
}

/** Convert a pixel offset inside the grid body to minutes-from-midnight, snapped. */
export function minutesFromY(y: number, startHour: number, pph: number, snap = 15): number {
  const raw = startHour * 60 + (y / pph) * 60;
  return Math.round(raw / snap) * snap;
}

/** A Date for `day` at `minutes` from midnight (local). */
export function dateAtMinutes(day: Date, minutes: number): Date {
  const d = new Date(day);
  d.setHours(0, 0, 0, 0);
  d.setMinutes(minutes);
  return d;
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/* ---- Overlap column packing --------------------------------------------- */

export interface Positioned<T> {
  item: T;
  col: number;
  cols: number;
}

/**
 * Lay out a single day's events into side-by-side columns so overlapping
 * lessons never cover each other. Standard interval-partitioning by cluster.
 */
export function layoutDayEvents<T>(
  events: T[],
  getStart: (e: T) => number,
  getEnd: (e: T) => number
): Positioned<T>[] {
  const sorted = [...events].sort((a, b) => getStart(a) - getStart(b) || getEnd(a) - getEnd(b));
  const result: Positioned<T>[] = [];
  let cluster: { item: T; col: number; end: number; start: number }[] = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    const cols = cluster.reduce((m, e) => Math.max(m, e.col + 1), 0);
    for (const e of cluster) result.push({ item: e.item, col: e.col, cols });
    cluster = [];
  };

  for (const ev of sorted) {
    const start = getStart(ev);
    const end = getEnd(ev);
    if (cluster.length && start >= clusterEnd) {
      flush();
      clusterEnd = -Infinity;
    }
    const used = new Set(cluster.filter((e) => e.end > start).map((e) => e.col));
    let col = 0;
    while (used.has(col)) col++;
    cluster.push({ item: ev, col, start, end });
    clusterEnd = Math.max(clusterEnd, end);
  }
  flush();
  return result;
}
