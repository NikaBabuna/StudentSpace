/* =============================================================================
 * features/schedule/components/LessonScheduleFields.tsx — shared schedule form
 * -----------------------------------------------------------------------------
 * Role: Reusable date, time, duration, and recurrence fields for scheduling
 *       UI. Exports validation helpers for parent forms/dialogs.
 * Dependencies: schedule-utils, components/ui
 * Used by: ScheduleLessonDialog, NewClassForm
 * Inputs: Controlled field values and onChange handlers
 * Outputs: Form fields + isLessonScheduleValid(), review labels
 * ========================================================================== */
"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RepeatIcon } from "@/components/icons";
import {
  DURATION_OPTIONS,
  WEEKDAY_ORDER,
  WEEKDAY_SHORT,
  chipClass,
  draftRecurrenceSummary,
  formatDuration,
  formatLongDate,
  toDateKey,
} from "@/features/schedule/lib/schedule-utils";

const controlClass =
  "h-11 w-full rounded-xl border border-line-2 bg-surface px-3.5 text-sm text-ink outline-none transition-colors hover:bg-surface-2 focus-visible:border-accent focus-visible:bg-surface focus-visible:ring-2 focus-visible:ring-accent/30";

function addDays(days: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

function Segmented({
  value,
  onChange,
}: {
  value: "once" | "repeat";
  onChange: (v: "once" | "repeat") => void;
}) {
  const opts: { key: "once" | "repeat"; label: React.ReactNode }[] = [
    { key: "once", label: "One-off" },
    {
      key: "repeat",
      label: (
        <span className="flex items-center justify-center gap-1.5">
          <RepeatIcon size={14} /> Repeat weekly
        </span>
      ),
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface-2 p-1">
      {opts.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={cn(
            "rounded-lg py-2 text-[13.5px] font-medium transition-colors",
            value === o.key
              ? "bg-surface text-ink shadow-[var(--shadow-sm)]"
              : "text-muted hover:text-ink-2"
          )}
          aria-pressed={value === o.key}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function DurationSelect({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={cn(controlClass, "cursor-pointer")}
      aria-label="Duration"
    >
      {DURATION_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export type LessonScheduleFieldsProps = {
  mode: "once" | "repeat";
  onModeChange: (mode: "once" | "repeat") => void;
  showModeToggle?: boolean;
  time: string;
  onTimeChange: (time: string) => void;
  durationHours: number;
  onDurationHoursChange: (hours: number) => void;
  dateKey: string;
  onDateKeyChange: (key: string) => void;
  weekdays: number[];
  onToggleWeekday: (dow: number) => void;
  intervalWeeks: number;
  onIntervalWeeksChange: (weeks: number) => void;
  hasUntil: boolean;
  onHasUntilChange: (hasUntil: boolean) => void;
  untilDate: string;
  onUntilDateChange: (date: string) => void;
};

export function LessonScheduleFields({
  mode,
  onModeChange,
  showModeToggle = true,
  time,
  onTimeChange,
  durationHours,
  onDurationHoursChange,
  dateKey,
  onDateKeyChange,
  weekdays,
  onToggleWeekday,
  intervalWeeks,
  onIntervalWeeksChange,
  hasUntil,
  onHasUntilChange,
  untilDate,
  onUntilDateChange,
}: LessonScheduleFieldsProps) {
  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const showRepeat = mode === "repeat";

  const onceSummary =
    dateKey && time ? `${formatLongDate(dateKey)} at ${time} · ${formatDuration(durationHours)}` : null;
  const repeatSummary = draftRecurrenceSummary({
    weekdays,
    startTime: time,
    durationHours,
    intervalWeeks,
  });

  const quickDates: { label: string; key: string }[] = [
    { label: "Today", key: addDays(0) },
    { label: "Tomorrow", key: addDays(1) },
    { label: "Next week", key: addDays(7) },
  ];

  return (
    <div className="flex flex-col gap-5">
      {showModeToggle ? <Segmented value={mode} onChange={onModeChange} /> : null}

      {showRepeat ? (
        <>
          <Field label="Days of the week">
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAY_ORDER.map((dow) => (
                <button
                  key={dow}
                  type="button"
                  onClick={() => onToggleWeekday(dow)}
                  className={cn(
                    "min-w-[48px] rounded-[10px] border px-2.5 py-2 text-center text-[13px] transition-colors",
                    chipClass(weekdays.includes(dow))
                  )}
                  aria-pressed={weekdays.includes(dow)}
                >
                  {WEEKDAY_SHORT[dow]}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Start time">
              <Input type="time" value={time} onChange={(e) => onTimeChange(e.target.value)} />
            </Field>
            <Field label="Duration">
              <DurationSelect value={durationHours} onChange={onDurationHoursChange} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Repeats">
              <select
                value={intervalWeeks}
                onChange={(e) => onIntervalWeeksChange(Number(e.target.value))}
                className={cn(controlClass, "cursor-pointer")}
              >
                <option value={1}>Every week</option>
                <option value={2}>Every 2 weeks</option>
                <option value={3}>Every 3 weeks</option>
                <option value={4}>Every 4 weeks</option>
              </select>
            </Field>
            <Field label="Ends">
              {hasUntil ? (
                <Input
                  type="date"
                  value={untilDate}
                  min={todayKey}
                  onChange={(e) => onUntilDateChange(e.target.value)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => onHasUntilChange(true)}
                  className={cn(controlClass, "cursor-pointer text-left text-muted")}
                >
                  Open-ended
                </button>
              )}
              {hasUntil ? (
                <button
                  type="button"
                  onClick={() => {
                    onHasUntilChange(false);
                    onUntilDateChange("");
                  }}
                  className="mt-1.5 self-start text-[12px] text-muted hover:text-ink-2"
                >
                  Make open-ended
                </button>
              ) : null}
            </Field>
          </div>
        </>
      ) : (
        <>
          <Field label="Date">
            <Input
              type="date"
              value={dateKey}
              min={todayKey}
              onChange={(e) => onDateKeyChange(e.target.value)}
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {quickDates.map((q) => (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => onDateKeyChange(q.key)}
                  className={cn(
                    "rounded-lg border px-2.5 py-1 text-[12px] transition-colors",
                    dateKey === q.key
                      ? "border-accent/40 bg-accent-tint text-accent"
                      : "border-line text-muted hover:bg-surface-2 hover:text-ink-2"
                  )}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Start time">
              <Input type="time" value={time} onChange={(e) => onTimeChange(e.target.value)} />
            </Field>
            <Field label="Duration">
              <DurationSelect value={durationHours} onChange={onDurationHoursChange} />
            </Field>
          </div>
        </>
      )}

      {(showRepeat ? repeatSummary : onceSummary) ? (
        <div className="rounded-xl border border-line bg-surface-2 px-4 py-3">
          <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted">
            {showRepeat ? <RepeatIcon size={12} /> : null}
            {showRepeat ? "Weekly schedule" : "Summary"}
          </div>
          <p className="mt-1 text-[15px] font-medium text-ink">
            {showRepeat ? repeatSummary : onceSummary}
          </p>
          {showRepeat ? (
            <p className="mt-1 text-[12px] text-muted">
              Fills the next 12 weeks now, then tops up as you visit.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Whether the current mode has enough input to create a schedule on submit. */
export function isLessonScheduleValid(
  mode: "once" | "repeat",
  input: {
    dateKey: string;
    time: string;
    weekdays: number[];
  }
) {
  if (mode === "repeat") return input.weekdays.length > 0 && !!input.time;
  return !!input.dateKey && !!input.time;
}

/** Human-readable one-liner for review screens. */
export function lessonScheduleReviewLabel(
  mode: "once" | "repeat",
  input: {
    dateKey: string;
    time: string;
    durationHours: number;
    weekdays: number[];
    intervalWeeks: number;
  }
): string {
  if (mode === "repeat") {
    return (
      draftRecurrenceSummary({
        weekdays: input.weekdays,
        startTime: input.time,
        durationHours: input.durationHours,
        intervalWeeks: input.intervalWeeks,
      }) ?? "—"
    );
  }
  if (!input.dateKey || !input.time) return "—";
  return `${formatLongDate(input.dateKey)} at ${input.time} · ${formatDuration(input.durationHours)}`;
}
