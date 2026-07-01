/* =============================================================================
 * features/calendar/components/CalendarLessonDialog.tsx — lesson detail + edit
 * -----------------------------------------------------------------------------
 * Role: Pop-up for one lesson on the calendar. Shows its class, your role, time
 *       and status. Tutors get precise edit fields (date / time / duration), the
 *       status actions, and delete; everyone gets "Go to class".
 * Dependencies: schedule-utils, components/ui, icons, calendar-utils
 * Used by: CalendarClient
 * ========================================================================== */
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { IconButton } from "@/components/ui/icon-button";
import { ArrowRightIcon, CloseIcon, RepeatIcon } from "@/components/icons";
import type { ClassRole } from "@/lib/types";
import type { CalendarLesson } from "@/lib/calendar-data";
import type { ClassColor } from "@/features/calendar/lib/calendar-utils";
import {
  DURATION_OPTIONS,
  type Lesson,
  addTime,
  buildScheduledAt,
  isMakeup,
  isRecurring,
  lessonTime,
  statusBadge,
  toDateKey,
} from "@/features/schedule/lib/schedule-utils";

const ROLE_LABEL: Record<ClassRole, string> = {
  tutor: "You're the tutor",
  student: "You're a student",
  parent: "You're a parent",
  employer: "You're observing",
};

const controlClass =
  "h-11 w-full rounded-xl border border-line-2 bg-surface px-3.5 text-sm text-ink outline-none transition-colors hover:bg-surface-2 focus-visible:border-accent focus-visible:bg-surface focus-visible:ring-2 focus-visible:ring-accent/30";

type Props = {
  open: boolean;
  onClose: () => void;
  lesson: CalendarLesson;
  classTitle: string;
  color: ClassColor;
  role: ClassRole;
  canManage: boolean;
  busy: boolean;
  classHref: string;
  onAction: (lessonId: string, action: "completed" | "missed" | "cancelled" | "delete") => void;
  onSave: (lessonId: string, patch: { scheduledAt: string; durationHours: number }) => void;
};

export function CalendarLessonDialog({
  open,
  onClose,
  lesson,
  classTitle,
  color,
  role,
  canManage,
  busy,
  classHref,
  onAction,
  onSave,
}: Props) {
  const [dateKey, setDateKey] = useState(() => toDateKey(new Date(lesson.scheduled_at)));
  const [time, setTime] = useState(() => lessonTime(lesson));
  const [duration, setDuration] = useState(lesson.duration_hours);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const chip = statusBadge(lesson as Lesson);
  const editable = canManage && lesson.status === "scheduled";
  const start = lessonTime(lesson);
  const end = addTime(start, lesson.duration_hours);
  const dirty =
    editable && (dateKey !== toDateKey(new Date(lesson.scheduled_at)) || time !== start || duration !== lesson.duration_hours);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-[420px] flex-col overflow-hidden rounded-2xl border border-line bg-bg shadow-[var(--shadow)]"
        role="dialog"
        aria-labelledby="calendar-lesson-title"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className="size-3.5 shrink-0 rounded"
              style={{ background: color.bar }}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <h2 id="calendar-lesson-title" className="flex items-center gap-1.5 truncate text-[16px] font-semibold text-ink">
                {classTitle}
                {isRecurring(lesson as Lesson) && !isMakeup(lesson as Lesson) ? (
                  <RepeatIcon size={13} className="shrink-0 text-muted" aria-label="Recurring" />
                ) : null}
              </h2>
              <p className="text-[12.5px] text-muted">{ROLE_LABEL[role]}</p>
            </div>
          </div>
          <IconButton size="sm" aria-label="Close" onClick={onClose}>
            <CloseIcon size={16} />
          </IconButton>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto p-5">
          <div className="flex items-center gap-2 text-[13.5px] text-ink-2">
            <span className="font-medium text-ink">
              {new Date(lesson.scheduled_at).toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </span>
            <span className="font-mono text-muted">
              {start} – {end}
            </span>
            <Badge tone={chip.tone} className="ml-auto font-mono text-[11px] uppercase">
              {chip.label}
            </Badge>
          </div>

          {editable ? (
            <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface-2 p-4">
              <Field label="Date">
                <Input type="date" value={dateKey} onChange={(e) => setDateKey(e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Start time">
                  <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                </Field>
                <Field label="Duration">
                  <select
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className={cn(controlClass, "cursor-pointer")}
                    aria-label="Duration"
                  >
                    {DURATION_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Button
                size="sm"
                className="self-start"
                busy={busy}
                disabled={!dirty}
                onClick={() =>
                  onSave(lesson.id, {
                    scheduledAt: new Date(buildScheduledAt(dateKey, time)).toISOString(),
                    durationHours: duration,
                  })
                }
              >
                Save changes
              </Button>
            </div>
          ) : null}

          {editable ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="border-ok/35 bg-ok-tint/30 text-ok hover:bg-ok-tint/50"
                busy={busy}
                onClick={() => onAction(lesson.id, "completed")}
              >
                Mark completed
              </Button>
              <Button variant="secondary" size="sm" busy={busy} onClick={() => onAction(lesson.id, "missed")}>
                Mark missed
              </Button>
              <Button variant="secondary" size="sm" busy={busy} onClick={() => onAction(lesson.id, "cancelled")}>
                Cancel
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-danger hover:bg-danger-tint/40"
                busy={busy}
                onClick={() => onAction(lesson.id, "delete")}
              >
                Delete
              </Button>
            </div>
          ) : null}

          <Button asChild variant="secondary" size="sm" className="w-full">
            <Link href={classHref}>
              Go to class <ArrowRightIcon size={15} />
            </Link>
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
