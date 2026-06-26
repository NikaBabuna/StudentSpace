export interface Lesson {
  id: string;
  scheduled_at: string;
  duration_hours: number;
  status: string;
  payment_cycle_id: string | null;
  replaces_lesson_id: string | null;
}

export interface Cycle {
  id: string;
  cycle_number: number;
  closed_at: string | null;
  paid_at: string | null;
}

export const DURATION_OPTIONS = [
  { value: 0.5, label: "30 min" },
  { value: 1, label: "1 hr" },
  { value: 1.5, label: "1.5 hr" },
  { value: 2, label: "2 hr" },
  { value: 2.5, label: "2.5 hr" },
  { value: 3, label: "3 hr" },
] as const;

export const TIME_SLOTS = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
] as const;

export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function upcomingDates(count = 21): Date[] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

export function formatDateChip(d: Date, today: Date): string {
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (d.getTime() === today.getTime()) return "Today";
  if (d.getTime() === tomorrow.getTime()) return "Tomorrow";
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric" });
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
