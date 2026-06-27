/* =============================================================================
 * features/calendar/components/AddLessonDialog.tsx — add a lesson from calendar
 * -----------------------------------------------------------------------------
 * Role: Like the schedule tab's add dialog, but first picks which class the
 *       lesson belongs to (the calendar spans all of them). Reuses the shared
 *       LessonScheduleFields for one-off + recurring input.
 * Dependencies: schedule/actions, LessonScheduleFields, schedule-utils, ui
 * Used by: CalendarClient (tutor only)
 * ========================================================================== */
"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import {
  LessonScheduleFields,
  isLessonScheduleValid,
} from "@/features/schedule/components/LessonScheduleFields";
import { createRecurringSchedule, scheduleLesson } from "@/features/schedule/actions";
import { browserTimeZone, buildScheduledAt, toDateKey } from "@/features/schedule/lib/schedule-utils";

const controlClass =
  "h-11 w-full rounded-xl border border-line-2 bg-surface px-3.5 text-sm text-ink outline-none transition-colors focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30";

type Props = {
  open: boolean;
  onClose: () => void;
  classes: { id: string; title: string }[];
  /** Day pre-selected from the grid (yyyy-mm-dd), if any. */
  initialDateKey?: string;
  onDone: () => void;
};

export function AddLessonDialog({ open, onClose, classes, initialDateKey, onDone }: Props) {
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [mode, setMode] = useState<"once" | "repeat">("once");
  const [time, setTime] = useState("16:00");
  const [durationHours, setDurationHours] = useState(1);
  const [dateKey, setDateKey] = useState(() => initialDateKey ?? toDateKey(new Date()));
  const [weekdays, setWeekdays] = useState<number[]>(() => [
    new Date(initialDateKey ? `${initialDateKey}T00:00:00` : Date.now()).getDay(),
  ]);
  const [intervalWeeks, setIntervalWeeks] = useState(1);
  const [hasUntil, setHasUntil] = useState(false);
  const [untilDate, setUntilDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleWeekday(dow: number) {
    setWeekdays((prev) => (prev.includes(dow) ? prev.filter((d) => d !== dow) : [...prev, dow]));
  }

  const scheduleValid = useMemo(
    () => !!classId && isLessonScheduleValid(mode, { dateKey, time, weekdays }),
    [classId, mode, dateKey, time, weekdays]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!classId) return setError("Pick a class.");
    setError(null);
    setLoading(true);
    try {
      if (mode === "repeat") {
        const { error: err } = await createRecurringSchedule({
          classId,
          weekdays,
          startTime: time,
          durationHours,
          intervalWeeks,
          anchorDate: toDateKey(new Date()),
          untilDate: hasUntil && untilDate ? untilDate : null,
          timezone: browserTimeZone(),
        });
        if (err) throw new Error(err);
      } else {
        const scheduledAt = new Date(buildScheduledAt(dateKey, time)).toISOString();
        const { error: err } = await scheduleLesson({ classId, scheduledAt, durationHours });
        if (err) throw new Error(err);
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-[460px] flex-col overflow-hidden rounded-2xl border border-line bg-bg shadow-[var(--shadow)]"
        role="dialog"
        aria-labelledby="calendar-add-title"
      >
        <div className="shrink-0 border-b border-line px-5 py-4">
          <h2 id="calendar-add-title" className="text-[17px] font-semibold text-ink">
            Add lesson
          </h2>
          <p className="mt-1 text-sm text-muted">
            {mode === "repeat" ? "Set a weekly pattern for a class." : "Add a single session to a class."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 overflow-y-auto p-5">
          <Field label="Class">
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className={cn(controlClass, "cursor-pointer")}
              aria-label="Class"
            >
              {classes.length === 0 ? <option value="">No classes you teach</option> : null}
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </Field>

          <LessonScheduleFields
            mode={mode}
            onModeChange={setMode}
            time={time}
            onTimeChange={setTime}
            durationHours={durationHours}
            onDurationHoursChange={setDurationHours}
            dateKey={dateKey}
            onDateKeyChange={setDateKey}
            weekdays={weekdays}
            onToggleWeekday={toggleWeekday}
            intervalWeeks={intervalWeeks}
            onIntervalWeeksChange={setIntervalWeeks}
            hasUntil={hasUntil}
            onHasUntilChange={setHasUntil}
            untilDate={untilDate}
            onUntilDateChange={setUntilDate}
          />

          {error ? (
            <p className="rounded-xl border border-danger/30 bg-danger-tint px-3 py-2 text-[12px] text-danger">
              {error}
            </p>
          ) : null}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" busy={loading} disabled={!scheduleValid}>
              {mode === "repeat" ? "Add weekly lessons" : "Schedule lesson"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
