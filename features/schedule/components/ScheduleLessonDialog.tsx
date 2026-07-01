/* =============================================================================
 * features/schedule/components/ScheduleLessonDialog.tsx — add lessons modal
 * -----------------------------------------------------------------------------
 * Role: Portal dialog to schedule a one-off lesson or create a recurring weekly
 *       slot. Validates via LessonScheduleFields helpers.
 * Dependencies: schedule/actions, LessonScheduleFields, components/ui
 * Used by: ScheduleClient, NewClassForm
 * Inputs: classId, timezone, open/onClose callbacks
 * Outputs: Modal form; calls scheduleLesson or createRecurringSchedule
 * ========================================================================== */
"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import {
  LessonScheduleFields,
  isLessonScheduleValid,
} from "@/features/schedule/components/LessonScheduleFields";
import {
  type Lesson,
  browserTimeZone,
  buildScheduledAt,
  lessonTime,
  toDateKey,
} from "@/features/schedule/lib/schedule-utils";

export type AddLessonsPayload =
  | { mode: "once"; scheduledAt: string; durationHours: number; makeupForId?: string }
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

type AddLessonsDialogProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: AddLessonsPayload) => Promise<void>;
  missedNeedingMakeup: Lesson[];
  /** When set, the dialog is scheduling a makeup — locked to one-off mode. */
  initialMakeupForId?: string;
};

const controlClass =
  "h-11 w-full rounded-xl border border-line-2 bg-surface px-3.5 text-sm text-ink outline-none transition-colors hover:bg-surface-2 focus-visible:border-accent focus-visible:bg-surface focus-visible:ring-2 focus-visible:ring-accent/30";

export function AddLessonsDialog({
  open,
  onClose,
  onSubmit,
  missedNeedingMakeup,
  initialMakeupForId = "",
}: AddLessonsDialogProps) {
  const isMakeup = !!initialMakeupForId;

  const [mode, setMode] = useState<"once" | "repeat">("once");
  const [time, setTime] = useState("16:00");
  const [durationHours, setDurationHours] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dateKey, setDateKey] = useState(() => toDateKey(new Date()));
  const [makeupForId, setMakeupForId] = useState("");

  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [intervalWeeks, setIntervalWeeks] = useState(1);
  const [hasUntil, setHasUntil] = useState(false);
  const [untilDate, setUntilDate] = useState("");

  useEffect(() => {
    if (!open) return;
    setMode("once");
    setTime("16:00");
    setDurationHours(1);
    setDateKey(toDateKey(new Date()));
    setMakeupForId(initialMakeupForId);
    setWeekdays([new Date().getDay()]);
    setIntervalWeeks(1);
    setHasUntil(false);
    setUntilDate("");
    setError(null);
  }, [open, initialMakeupForId]);

  function toggleWeekday(dow: number) {
    setWeekdays((prev) => (prev.includes(dow) ? prev.filter((d) => d !== dow) : [...prev, dow]));
  }

  const showRepeat = mode === "repeat" && !isMakeup;
  const scheduleValid = useMemo(
    () => isLessonScheduleValid(mode, { dateKey, time, weekdays }),
    [mode, dateKey, time, weekdays]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      if (showRepeat) {
        if (!isLessonScheduleValid("repeat", { dateKey, time, weekdays })) {
          setError("Pick at least one day of the week.");
          return;
        }
        setLoading(true);
        await onSubmit({
          mode: "repeat",
          weekdays,
          startTime: time,
          durationHours,
          intervalWeeks,
          anchorDate: toDateKey(new Date()),
          untilDate: hasUntil && untilDate ? untilDate : null,
          timezone: browserTimeZone(),
        });
      } else {
        if (!isLessonScheduleValid("once", { dateKey, time, weekdays })) {
          setError("Pick a date and time.");
          return;
        }
        setLoading(true);
        const scheduledAt = new Date(buildScheduledAt(dateKey, time)).toISOString();
        await onSubmit({ mode: "once", scheduledAt, durationHours, makeupForId: makeupForId || undefined });
      }
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
        aria-labelledby="schedule-dialog-title"
      >
        <div className="shrink-0 border-b border-line px-5 py-4">
          <h2 id="schedule-dialog-title" className="text-[17px] font-semibold text-ink">
            {isMakeup ? "Schedule makeup" : "Add lessons"}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {isMakeup
              ? "Pick when the makeup session happens."
              : showRepeat
                ? "Set a weekly pattern — the calendar fills itself."
                : "Add a single session."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 overflow-y-auto p-5">
          <LessonScheduleFields
            mode={isMakeup ? "once" : mode}
            onModeChange={setMode}
            showModeToggle={!isMakeup}
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

          {!isMakeup && mode === "once" && missedNeedingMakeup.length > 0 ? (
            <Field label="Makeup for" optional>
              <select
                value={makeupForId}
                onChange={(e) => setMakeupForId(e.target.value)}
                className={cn(controlClass, "cursor-pointer")}
              >
                <option value="">Not a makeup</option>
                {missedNeedingMakeup.map((l) => (
                  <option key={l.id} value={l.id}>
                    {new Date(l.scheduled_at).toLocaleDateString("en-GB", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}{" "}
                    · {lessonTime(l)}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

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
              {isMakeup ? "Schedule makeup" : showRepeat ? "Add weekly lessons" : "Schedule lesson"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
