/* =============================================================================
 * features/schedule/components/LessonOccurrenceDialog.tsx — recurring date map
 * -----------------------------------------------------------------------------
 * Role: Pop-up for one recurring slot. Shows every date it lands on as a
 *       month calendar (completed / missed / upcoming), pages months with ‹ ›,
 *       and lets a tutor act on the next occurrence.
 * Dependencies: schedule-utils, components/ui, icons
 * Used by: ScheduleClient (opened from a collapsed recurring row or the rail)
 * Inputs: schedule + its full occurrence list, role, action handlers
 * Outputs: Modal calendar; calls onAction(lessonId, action) for the next hit
 * ========================================================================== */
"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, RepeatIcon } from "@/components/icons";
import {
  type Lesson,
  type RecurringSchedule,
  WEEKDAY_MIN,
  lessonDateLine,
  lessonsByDateKey,
  lessonTime,
  monthGrid,
  monthLabel,
  occurrenceCellClass,
  recurrenceCadence,
  recurrenceSummary,
} from "@/features/schedule/lib/schedule-utils";

type LessonOccurrenceDialogProps = {
  open: boolean;
  onClose: () => void;
  schedule: RecurringSchedule;
  /** All lessons (any status) belonging to this schedule. */
  occurrences: Lesson[];
  isTutor: boolean;
  busy: boolean;
  onAction: (lessonId: string, action: "completed" | "missed" | "cancelled") => void;
};

export function LessonOccurrenceDialog({
  open,
  onClose,
  schedule,
  occurrences,
  isTutor,
  busy,
  onAction,
}: LessonOccurrenceDialogProps) {
  const byKey = useMemo(() => lessonsByDateKey(occurrences), [occurrences]);

  // Soonest upcoming occurrence — the action target and the calendar's anchor.
  const next = useMemo(() => {
    const nowMs = new Date().getTime();
    return [...occurrences]
      .filter((l) => l.status === "scheduled" && new Date(l.scheduled_at).getTime() >= nowMs)
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0];
  }, [occurrences]);

  // Calendar opens on the next occurrence's month (or the most recent past one).
  // The dialog is remounted per schedule (key in the parent), so this lazy
  // initializer re-runs on each open — no re-anchoring effect needed.
  const [cursor, setCursor] = useState(() => {
    if (next) return { year: new Date(next.scheduled_at).getFullYear(), month: new Date(next.scheduled_at).getMonth() };
    const last = [...occurrences].sort(
      (a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()
    )[0];
    const d = last ? new Date(last.scheduled_at) : new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function stepMonth(delta: number) {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  const weeks = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor]);
  const hasCancelled = occurrences.some((l) => l.status === "cancelled");

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
        aria-labelledby="occurrence-dialog-title"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="flex min-w-0 gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-tint text-accent">
              <RepeatIcon size={16} />
            </div>
            <div className="min-w-0">
              <h2 id="occurrence-dialog-title" className="text-[16px] font-semibold text-ink">
                {recurrenceSummary(schedule)}
              </h2>
              <p className="mt-0.5 text-[12.5px] text-muted">
                {recurrenceCadence(schedule)}
                {next ? ` · next ${lessonDateLine(next)}` : " · no upcoming dates"}
              </p>
            </div>
          </div>
          <IconButton size="sm" aria-label="Close" onClick={onClose}>
            <CloseIcon size={16} />
          </IconButton>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto p-5">
          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-ink-2">
            <Legend className="bg-ok-tint/60 text-ok">Completed</Legend>
            <Legend className="bg-danger-tint/60 text-danger">Missed</Legend>
            <Legend className="border border-accent/50 text-accent">Upcoming</Legend>
            {hasCancelled ? <Legend className="bg-surface-3 text-muted">Cancelled</Legend> : null}
          </div>

          {/* Month pager */}
          <div className="rounded-2xl border border-line bg-surface p-3">
            <div className="mb-2 flex items-center justify-between">
              <IconButton size="sm" aria-label="Previous month" onClick={() => stepMonth(-1)}>
                <ChevronLeftIcon size={16} />
              </IconButton>
              <span className="text-[13.5px] font-semibold text-ink">
                {monthLabel(cursor.year, cursor.month)}
              </span>
              <IconButton size="sm" aria-label="Next month" onClick={() => stepMonth(1)}>
                <ChevronRightIcon size={16} />
              </IconButton>
            </div>

            <div className="mb-1 grid grid-cols-7 gap-1">
              {WEEKDAY_MIN.map((d, i) => (
                <div key={i} className="text-center font-mono text-[10px] uppercase text-muted">
                  {d}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-1">
              {weeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 gap-1">
                  {week.map((cell, ci) =>
                    cell ? (
                      <div
                        key={ci}
                        className={cn(
                          "flex h-9 items-center justify-center rounded-lg text-[12.5px] tabular-nums",
                          occurrenceCellClass(byKey.get(cell.dateKey))
                        )}
                      >
                        {cell.day}
                      </div>
                    ) : (
                      <div key={ci} className="h-9" />
                    )
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Next-occurrence actions */}
          {isTutor && next ? (
            <div className="rounded-2xl border border-line bg-surface-2 px-4 py-3">
              <div className="mb-2.5 flex items-center gap-2 text-[12.5px]">
                <span className="text-muted">Next session</span>
                <Badge tone="warn" className="font-mono text-[11px]">
                  {lessonDateLine(next)} · {lessonTime(next)}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="border-ok/35 bg-ok-tint/30 text-ok hover:bg-ok-tint/50"
                  busy={busy}
                  onClick={() => onAction(next.id, "completed")}
                >
                  Mark completed
                </Button>
                <Button variant="secondary" size="sm" busy={busy} onClick={() => onAction(next.id, "missed")}>
                  Mark missed
                </Button>
                <Button variant="secondary" size="sm" busy={busy} onClick={() => onAction(next.id, "cancelled")}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}

function Legend({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-3.5 rounded", className)} />
      {children}
    </span>
  );
}
