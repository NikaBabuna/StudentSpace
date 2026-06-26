"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  DURATION_OPTIONS,
  TIME_SLOTS,
  type Lesson,
  buildScheduledAt,
  chipClass,
  formatDateChip,
  formatDuration,
  formatLongDate,
  lessonTime,
  toDateKey,
  upcomingDates,
} from "./schedule-utils";

type ScheduleLessonDialogProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    scheduledAt: string;
    durationHours: number;
    makeupForId?: string;
  }) => Promise<void>;
  missedNeedingMakeup: Lesson[];
  initialMakeupForId?: string;
  title?: string;
  submitLabel?: string;
};

export function ScheduleLessonDialog({
  open,
  onClose,
  onSubmit,
  missedNeedingMakeup,
  initialMakeupForId = "",
  title = "Schedule lesson",
  submitLabel = "Schedule lesson",
}: ScheduleLessonDialogProps) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const dateOptions = useMemo(() => upcomingDates(21), []);

  const [dateKey, setDateKey] = useState(() => toDateKey(new Date()));
  const [time, setTime] = useState("16:00");
  const [useCustomTime, setUseCustomTime] = useState(false);
  const [durationHours, setDurationHours] = useState(1);
  const [makeupForId, setMakeupForId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDateKey(toDateKey(new Date()));
    setTime("16:00");
    setUseCustomTime(false);
    setDurationHours(1);
    setMakeupForId(initialMakeupForId);
    setError(null);
  }, [open, initialMakeupForId]);

  const summary =
    dateKey && time
      ? `${formatLongDate(dateKey)} at ${time} · ${formatDuration(durationHours)}`
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!dateKey || !time) {
      setError("Pick a date and time.");
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        scheduledAt: buildScheduledAt(dateKey, time),
        durationHours,
        makeupForId: makeupForId || undefined,
      });
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
        className="flex max-h-[92vh] w-full max-w-[520px] flex-col overflow-hidden rounded-2xl border border-line bg-bg shadow-[var(--shadow)]"
        role="dialog"
        aria-labelledby="schedule-dialog-title"
      >
        <div className="shrink-0 border-b border-line px-5 py-4">
          <h2 id="schedule-dialog-title" className="text-[17px] font-semibold text-ink">
            {title}
          </h2>
          <p className="mt-1 text-sm text-muted">Pick when the lesson happens — no calendar popup.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 overflow-y-auto p-5">
          <Field label="Date">
            <div className="flex flex-wrap gap-2">
              {dateOptions.map((d) => {
                const key = toDateKey(d);
                const selected = dateKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setDateKey(key)}
                    className={cn(
                      "min-w-[72px] rounded-[10px] border px-3 py-2 text-center text-sm transition-colors",
                      chipClass(selected)
                    )}
                  >
                    <span className="block text-[13px]">{formatDateChip(d, today)}</span>
                    <span className="mt-0.5 block font-mono text-[10px] opacity-70">
                      {d.toLocaleDateString("en-GB", { month: "short" })}
                    </span>
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Start time">
            <div className="flex flex-wrap gap-2">
              {TIME_SLOTS.map((slot) => {
                const selected = !useCustomTime && time === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => {
                      setUseCustomTime(false);
                      setTime(slot);
                    }}
                    className={cn(
                      "rounded-[10px] border px-3.5 py-2 font-mono text-sm transition-colors",
                      chipClass(selected)
                    )}
                  >
                    {slot}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setUseCustomTime(true)}
                className={cn(
                  "rounded-[10px] border px-3.5 py-2 text-sm transition-colors",
                  chipClass(useCustomTime)
                )}
              >
                Other
              </button>
            </div>
            {useCustomTime ? (
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="mt-2 max-w-[160px]"
              />
            ) : null}
          </Field>

          <Field label="Duration">
            <div className="flex flex-wrap gap-2">
              {DURATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDurationHours(opt.value)}
                  className={cn(
                    "rounded-[10px] border px-3.5 py-2 text-sm transition-colors",
                    chipClass(durationHours === opt.value)
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Field>

          {missedNeedingMakeup.length > 0 ? (
            <Field label="Makeup for" optional>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setMakeupForId("")}
                  className={cn(
                    "rounded-[10px] border px-3.5 py-2 text-sm transition-colors",
                    chipClass(!makeupForId)
                  )}
                >
                  Not a makeup
                </button>
                {missedNeedingMakeup.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setMakeupForId(l.id)}
                    className={cn(
                      "rounded-[10px] border px-3.5 py-2 text-left text-sm transition-colors",
                      chipClass(makeupForId === l.id)
                    )}
                  >
                    {new Date(l.scheduled_at).toLocaleDateString("en-GB", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                    <span className="mt-0.5 block font-mono text-[11px] opacity-80">
                      {lessonTime(l)}
                    </span>
                  </button>
                ))}
              </div>
            </Field>
          ) : null}

          {summary ? (
            <div className="rounded-xl border border-line bg-surface-2 px-4 py-3">
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted">
                Summary
              </div>
              <p className="mt-1 text-[15px] font-medium text-ink">{summary}</p>
            </div>
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
            <Button type="submit" className="flex-1" busy={loading} disabled={!dateKey || !time}>
              {submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
