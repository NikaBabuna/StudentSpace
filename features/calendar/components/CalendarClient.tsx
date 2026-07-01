/* =============================================================================
 * features/calendar/components/CalendarClient.tsx — all-classes calendar hub
 * -----------------------------------------------------------------------------
 * Role: Week time-grid + month grid of every lesson across the user's classes.
 *       Blocks are colored per class and tagged with your role. Tutors can drag
 *       to move, drag the handle to resize, and manage lessons from a detail
 *       dialog; non-tutors get a read-only view. Permission is per-class.
 * Dependencies: schedule/actions, schedule-utils, calendar-utils, calendar
 *               dialogs, components/ui, icons
 * Used by: app/(shell)/calendar/page.tsx
 * ========================================================================== */
"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageContainer, PageHeader } from "@/components/shell/page-container";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, ScheduleIcon } from "@/components/icons";
import type { ClassRole } from "@/lib/types";
import type { CalendarClass, CalendarLesson } from "@/lib/calendar-data";
import {
  completeLesson,
  missLesson,
  cancelLesson,
  deleteLesson,
  updateLesson,
} from "@/features/schedule/actions";
import {
  WEEKDAY_MIN,
  monthGrid,
  toDateKey,
} from "@/features/schedule/lib/schedule-utils";
import {
  type ClassColor,
  addDays,
  classColor,
  dateAtMinutes,
  dayWindow,
  formatMinutes,
  formatMonthTitle,
  formatWeekRange,
  layoutDayEvents,
  lessonStartMinutes,
  minutesFromY,
  sameDay,
  startOfWeek,
  weekDays,
} from "@/features/calendar/lib/calendar-utils";
import { CalendarLessonDialog } from "@/features/calendar/components/CalendarLessonDialog";
import { AddLessonDialog } from "@/features/calendar/components/AddLessonDialog";

const PPH = 48; // pixels per hour in the week grid
const WEEKDAY_HEAD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);

type DragState = {
  lessonId: string;
  mode: "move" | "resize";
  pointerId: number;
  startX: number;
  startY: number;
  origDayIndex: number;
  origStartMin: number;
  origDuration: number;
  moved: boolean;
};

type Preview = { lessonId: string; dayIndex: number; startMin: number; duration: number };

export default function CalendarClient({
  classes,
  lessons,
}: {
  userId: string;
  classes: CalendarClass[];
  lessons: CalendarLesson[];
}) {
  const router = useRouter();

  const [view, setView] = useState<"week" | "month">("week");
  const [refDate, setRefDate] = useState(() => new Date());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addDateKey, setAddDateKey] = useState<string | undefined>(undefined);
  const [overrides, setOverrides] = useState<Record<string, Partial<CalendarLesson>>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);

  const today = useMemo(() => new Date(), []);

  const roleByClass = useMemo(
    () => new Map(classes.map((c) => [c.id, c.role] as const)),
    [classes]
  );
  const classById = useMemo(() => new Map(classes.map((c) => [c.id, c] as const)), [classes]);
  const colorByClass = useMemo(() => {
    const m = new Map<string, ClassColor>();
    for (const c of classes) m.set(c.id, classColor(c.id));
    return m;
  }, [classes]);

  const teachingClasses = useMemo(() => classes.filter((c) => c.role === "tutor"), [classes]);

  // Apply optimistic drag/edit overrides on top of the server data.
  const merged = useMemo(
    () =>
      lessons.map((l) => (overrides[l.id] ? { ...l, ...overrides[l.id] } : l)),
    [lessons, overrides]
  );
  const mergedById = useMemo(() => new Map(merged.map((l) => [l.id, l] as const)), [merged]);

  const canManage = (l: CalendarLesson) => roleByClass.get(l.class_id) === "tutor";

  function go(delta: number) {
    setRefDate((d) => (view === "week" ? addDays(d, delta * 7) : addMonths(d, delta)));
  }

  /* ---- mutations -------------------------------------------------------- */

  function applyOverride(lessonId: string, patch: Partial<CalendarLesson>) {
    setOverrides((prev) => ({ ...prev, [lessonId]: { ...prev[lessonId], ...patch } }));
  }
  function clearOverride(lessonId: string) {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[lessonId];
      return next;
    });
  }

  async function commitUpdate(
    lessonId: string,
    input: { scheduledAt?: string; durationHours?: number },
    optimistic: Partial<CalendarLesson>
  ) {
    setError(null);
    applyOverride(lessonId, optimistic);
    const { error: e } = await updateLesson({ lessonId, ...input });
    if (e) {
      clearOverride(lessonId);
      setError(e);
      return;
    }
    router.refresh();
  }

  async function handleDialogAction(
    lessonId: string,
    action: "completed" | "missed" | "cancelled" | "delete"
  ) {
    setBusyId(lessonId);
    setError(null);
    const res =
      action === "completed"
        ? await completeLesson(lessonId)
        : action === "missed"
          ? await missLesson(lessonId)
          : action === "cancelled"
            ? await cancelLesson(lessonId)
            : await deleteLesson(lessonId);
    setBusyId(null);
    if (res?.error) return setError(res.error);
    setSelectedId(null);
    router.refresh();
  }

  async function handleDialogSave(
    lessonId: string,
    patch: { scheduledAt: string; durationHours: number }
  ) {
    setBusyId(lessonId);
    await commitUpdate(
      lessonId,
      patch,
      { scheduled_at: patch.scheduledAt, duration_hours: patch.durationHours }
    );
    setBusyId(null);
    setSelectedId(null);
  }

  /* ---- week grid geometry ---------------------------------------------- */

  const weekDates = useMemo(() => weekDays(refDate), [refDate]);
  const weekLessons = useMemo(() => {
    const start = startOfWeek(refDate);
    const end = addDays(start, 7);
    return merged.filter((l) => {
      const t = new Date(l.scheduled_at);
      return t >= start && t < end;
    });
  }, [merged, refDate]);

  const { startHour, endHour } = useMemo(() => dayWindow(weekLessons), [weekLessons]);
  const gridHeight = (endHour - startHour) * PPH;
  const hourMarks = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

  /* ---- drag / resize ---------------------------------------------------- */

  function onBlockPointerDown(
    e: React.PointerEvent,
    lesson: CalendarLesson,
    dayIndex: number,
    mode: "move" | "resize"
  ) {
    if (!canManage(lesson) || lesson.status !== "scheduled") {
      // read-only block: a tap opens the detail dialog.
      if (mode === "move") setSelectedId(lesson.id);
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = {
      lessonId: lesson.id,
      mode,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origDayIndex: dayIndex,
      origStartMin: lessonStartMinutes(lesson),
      origDuration: lesson.duration_hours,
      moved: false,
    };
  }

  function onBlockPointerMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    d.moved = true;

    const rect = gridRef.current?.getBoundingClientRect();
    const colW = rect ? rect.width / 7 : 1;

    if (d.mode === "move") {
      const dayIndex = clamp(d.origDayIndex + Math.round(dx / colW), 0, 6);
      const y = (d.origStartMin / 60 - startHour) * PPH + dy;
      const startMin = clamp(
        minutesFromY(y, startHour, PPH),
        startHour * 60,
        endHour * 60 - d.origDuration * 60
      );
      setPreview({ lessonId: d.lessonId, dayIndex, startMin, duration: d.origDuration });
    } else {
      const rawHours = (d.origDuration * PPH + dy) / PPH;
      const duration = clamp(
        Math.round(rawHours * 4) / 4,
        0.5,
        (endHour * 60 - d.origStartMin) / 60
      );
      setPreview({
        lessonId: d.lessonId,
        dayIndex: d.origDayIndex,
        startMin: d.origStartMin,
        duration,
      });
    }
  }

  function onBlockPointerUp(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    dragRef.current = null;
    const p = preview;
    setPreview(null);

    if (!d.moved || !p) {
      setSelectedId(d.lessonId);
      return;
    }

    if (d.mode === "move") {
      const newDate = dateAtMinutes(weekDates[p.dayIndex], p.startMin);
      const orig = mergedById.get(d.lessonId);
      if (orig && new Date(orig.scheduled_at).getTime() !== newDate.getTime()) {
        const iso = newDate.toISOString();
        void commitUpdate(d.lessonId, { scheduledAt: iso }, { scheduled_at: iso });
      }
    } else if (p.duration !== d.origDuration) {
      void commitUpdate(d.lessonId, { durationHours: p.duration }, { duration_hours: p.duration });
    }
  }

  /* ---- render ----------------------------------------------------------- */

  const selectedLesson = selectedId ? mergedById.get(selectedId) ?? null : null;

  return (
    <PageContainer>
      <PageHeader
        title="Calendar"
        sub={
          classes.length === 0
            ? "No classes yet"
            : `${classes.length} ${classes.length === 1 ? "class" : "classes"} · all your lessons in one place`
        }
        action={
          teachingClasses.length > 0 ? (
            <Button
              onClick={() => {
                setAddDateKey(undefined);
                setShowAdd(true);
              }}
            >
              <PlusIcon size={16} /> Add lesson
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-xl border border-line bg-surface-2 p-1">
          {(["week", "month"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={cn(
                "rounded-lg px-3.5 py-1.5 text-[13px] font-medium capitalize transition-colors",
                view === v ? "bg-surface text-ink shadow-[var(--shadow-sm)]" : "text-muted hover:text-ink-2"
              )}
            >
              {v}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <IconButton size="sm" aria-label={view === "week" ? "Previous week" : "Previous month"} onClick={() => go(-1)}>
            <ChevronLeftIcon size={16} />
          </IconButton>
          <span className="min-w-[190px] text-center text-[14.5px] font-semibold text-ink">
            {view === "week" ? formatWeekRange(refDate) : formatMonthTitle(refDate)}
          </span>
          <IconButton size="sm" aria-label={view === "week" ? "Next week" : "Next month"} onClick={() => go(1)}>
            <ChevronRightIcon size={16} />
          </IconButton>
          <Button variant="secondary" size="sm" className="ml-1" onClick={() => setRefDate(new Date())}>
            Today
          </Button>
        </div>
      </div>

      {error ? (
        <p className="mb-4 rounded-xl border border-danger/30 bg-danger-tint px-3.5 py-2.5 text-[12.5px] text-danger">
          {error}
        </p>
      ) : null}

      {classes.length === 0 ? (
        <EmptyState
          icon={<ScheduleIcon size={20} />}
          title="No classes yet"
          description="When you join or create a class, its lessons show up here."
        />
      ) : view === "week" ? (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          {/* Day headers */}
          <div className="flex min-w-[640px] border-b border-line">
            <div className="w-[52px] shrink-0" />
            {weekDates.map((day, i) => {
              const isToday = sameDay(day, today);
              return (
                <div key={i} className="flex-1 px-2 py-2.5 text-center">
                  <div className="font-mono text-[10.5px] uppercase tracking-wide text-muted">
                    {WEEKDAY_HEAD[i]}
                  </div>
                  <div
                    className={cn(
                      "mx-auto mt-0.5 flex size-6 items-center justify-center rounded-full text-[13px] font-semibold",
                      isToday ? "bg-accent text-accent-ink" : "text-ink"
                    )}
                  >
                    {day.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time grid */}
          <div className="flex min-w-[640px]">
            <div className="w-[52px] shrink-0">
              {hourMarks.slice(0, -1).map((h) => (
                <div key={h} style={{ height: PPH }} className="relative">
                  <span className="absolute -top-2 right-2 font-mono text-[10.5px] text-muted">
                    {String(h).padStart(2, "0")}:00
                  </span>
                </div>
              ))}
            </div>

            <div
              ref={gridRef}
              className="relative grid flex-1 grid-cols-7"
              style={{
                height: gridHeight,
                backgroundImage: `repeating-linear-gradient(to bottom, var(--line) 0, var(--line) 1px, transparent 1px, transparent ${PPH}px)`,
              }}
            >
              {weekDates.map((day, di) => {
                const dayLessons = weekLessons.filter((l) => sameDay(new Date(l.scheduled_at), day));
                const positioned = layoutDayEvents(
                  dayLessons,
                  (l) => lessonStartMinutes(l),
                  (l) => lessonStartMinutes(l) + l.duration_hours * 60
                );
                const isToday = sameDay(day, today);
                return (
                  <div
                    key={di}
                    className={cn("relative border-l border-line first:border-l-0", isToday && "bg-accent-tint/20")}
                  >
                    {positioned.map(({ item: l, col, cols }) => {
                      const color = colorByClass.get(l.class_id);
                      const cls = classById.get(l.class_id);
                      const startMin = lessonStartMinutes(l);
                      const top = (startMin / 60 - startHour) * PPH;
                      const height = l.duration_hours * PPH;
                      const manage = canManage(l) && l.status === "scheduled";
                      const dimmed = preview?.lessonId === l.id;
                      const faded = l.status === "cancelled" || l.status === "missed";
                      return (
                        <div
                          key={l.id}
                          role="button"
                          tabIndex={0}
                          aria-label={`${cls?.title ?? "Lesson"} ${formatMinutes(startMin)}`}
                          onKeyDown={(ev) => {
                            if (ev.key === "Enter" || ev.key === " ") {
                              ev.preventDefault();
                              setSelectedId(l.id);
                            }
                          }}
                          onPointerDown={(ev) => onBlockPointerDown(ev, l, di, "move")}
                          onPointerMove={onBlockPointerMove}
                          onPointerUp={onBlockPointerUp}
                          className={cn(
                            "absolute overflow-hidden rounded-lg border-l-[3px] px-1.5 py-1 text-left",
                            manage ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
                            dimmed && "opacity-40",
                            faded && "opacity-65"
                          )}
                          style={{
                            top,
                            height,
                            left: `${(col / cols) * 100}%`,
                            width: `calc(${(1 / cols) * 100}% - 3px)`,
                            background: color?.tint,
                            borderColor: color?.bar,
                            color: color?.bar,
                            touchAction: "none",
                          }}
                        >
                          <div className="truncate text-[11.5px] font-semibold leading-tight">
                            {cls?.title ?? "Lesson"}
                          </div>
                          <div className="truncate font-mono text-[10.5px] opacity-80">
                            {formatMinutes(startMin)}–{formatMinutes(startMin + l.duration_hours * 60)}
                          </div>
                          {manage ? (
                            <div
                              onPointerDown={(ev) => onBlockPointerDown(ev, l, di, "resize")}
                              onPointerMove={onBlockPointerMove}
                              onPointerUp={onBlockPointerUp}
                              className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize"
                              aria-hidden="true"
                            />
                          ) : null}
                        </div>
                      );
                    })}

                    {preview && preview.dayIndex === di ? (
                      <PreviewBlock
                        preview={preview}
                        startHour={startHour}
                        color={colorByClass.get(mergedById.get(preview.lessonId)?.class_id ?? "")}
                        title={classById.get(mergedById.get(preview.lessonId)?.class_id ?? "")?.title}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <MonthView
          refDate={refDate}
          today={today}
          lessons={merged}
          classById={classById}
          colorByClass={colorByClass}
          onSelect={setSelectedId}
          onAddDay={
            teachingClasses.length > 0
              ? (dateKey) => {
                  setAddDateKey(dateKey);
                  setShowAdd(true);
                }
              : undefined
          }
        />
      )}

      {/* Legend */}
      {classes.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
          {classes.map((c) => (
            <span key={c.id} className="inline-flex items-center gap-2 text-[12.5px] text-ink-2">
              <span className="size-3 rounded" style={{ background: colorByClass.get(c.id)?.bar }} />
              {c.title}
              <Badge tone="neutral" className="text-[10px]">
                {c.role}
              </Badge>
            </span>
          ))}
        </div>
      ) : null}

      {selectedLesson ? (
        <CalendarLessonDialog
          key={selectedLesson.id}
          open
          onClose={() => setSelectedId(null)}
          lesson={selectedLesson}
          classTitle={classById.get(selectedLesson.class_id)?.title ?? "Lesson"}
          color={colorByClass.get(selectedLesson.class_id) ?? classColor(selectedLesson.class_id)}
          role={(roleByClass.get(selectedLesson.class_id) ?? "student") as ClassRole}
          canManage={canManage(selectedLesson)}
          busy={busyId === selectedLesson.id}
          classHref={`/classes/${selectedLesson.class_id}/schedule`}
          onAction={handleDialogAction}
          onSave={handleDialogSave}
        />
      ) : null}

      {showAdd ? (
        <AddLessonDialog
          open
          onClose={() => setShowAdd(false)}
          classes={teachingClasses.map((c) => ({ id: c.id, title: c.title }))}
          initialDateKey={addDateKey}
          onDone={() => {
            setShowAdd(false);
            router.refresh();
          }}
        />
      ) : null}
    </PageContainer>
  );
}

function PreviewBlock({
  preview,
  startHour,
  color,
  title,
}: {
  preview: Preview;
  startHour: number;
  color?: ClassColor;
  title?: string;
}) {
  const top = (preview.startMin / 60 - startHour) * PPH;
  const height = preview.duration * PPH;
  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-10 overflow-hidden rounded-lg border-l-[3px] px-1.5 py-1 shadow-[var(--shadow)] ring-2 ring-accent/50"
      style={{ top, height, background: color?.tint, borderColor: color?.bar, color: color?.bar }}
    >
      <div className="truncate text-[11.5px] font-semibold leading-tight">{title ?? "Lesson"}</div>
      <div className="truncate font-mono text-[10.5px] opacity-80">
        {formatMinutes(preview.startMin)}–{formatMinutes(preview.startMin + preview.duration * 60)}
      </div>
    </div>
  );
}

function MonthView({
  refDate,
  today,
  lessons,
  classById,
  colorByClass,
  onSelect,
  onAddDay,
}: {
  refDate: Date;
  today: Date;
  lessons: CalendarLesson[];
  classById: Map<string, CalendarClass>;
  colorByClass: Map<string, ClassColor>;
  onSelect: (id: string) => void;
  onAddDay?: (dateKey: string) => void;
}) {
  const weeks = monthGrid(refDate.getFullYear(), refDate.getMonth());
  const byDay = useMemo(() => {
    const m = new Map<string, CalendarLesson[]>();
    for (const l of lessons) {
      const key = toDateKey(new Date(l.scheduled_at));
      const arr = m.get(key);
      if (arr) arr.push(l);
      else m.set(key, [l]);
    }
    for (const arr of m.values())
      arr.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
    return m;
  }, [lessons]);

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
      <div className="grid min-w-[640px] grid-cols-7 border-b border-line">
        {WEEKDAY_MIN.map((d, i) => (
          <div key={i} className="px-2 py-2 text-center font-mono text-[10.5px] uppercase tracking-wide text-muted">
            {d}
          </div>
        ))}
      </div>
      <div className="grid min-w-[640px] grid-cols-7">
        {weeks.flat().map((cell, i) => {
          if (!cell) return <div key={i} className="min-h-[104px] border-b border-l border-line first:border-l-0" />;
          const dayLessons = byDay.get(cell.dateKey) ?? [];
          const isToday = sameDay(new Date(cell.dateKey + "T00:00:00"), today);
          const shown = dayLessons.slice(0, 3);
          return (
            <div
              key={i}
              className={cn(
                "min-h-[104px] border-b border-l border-line p-1.5 [&:nth-child(7n+1)]:border-l-0",
                onAddDay && "group/day cursor-pointer hover:bg-surface-2/50"
              )}
              onClick={onAddDay ? () => onAddDay(cell.dateKey) : undefined}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full text-[11.5px] font-semibold",
                    isToday ? "bg-accent text-accent-ink" : "text-ink-2"
                  )}
                >
                  {cell.day}
                </span>
                {onAddDay ? (
                  <PlusIcon size={13} className="text-muted opacity-0 transition-opacity group-hover/day:opacity-100" />
                ) : null}
              </div>
              <div className="flex flex-col gap-1">
                {shown.map((l) => {
                  const color = colorByClass.get(l.class_id);
                  const faded = l.status === "cancelled" || l.status === "missed";
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(l.id);
                      }}
                      className={cn(
                        "flex items-center gap-1 truncate rounded border-l-[3px] px-1.5 py-0.5 text-left text-[11px]",
                        faded && "opacity-60"
                      )}
                      style={{ background: color?.tint, borderColor: color?.bar, color: color?.bar }}
                    >
                      <span className="font-mono text-[10px] opacity-80">
                        {new Date(l.scheduled_at).toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="truncate font-medium">{classById.get(l.class_id)?.title ?? "Lesson"}</span>
                    </button>
                  );
                })}
                {dayLessons.length > shown.length ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(dayLessons[shown.length].id);
                    }}
                    className="px-1 text-left text-[11px] font-medium text-muted hover:text-ink-2"
                  >
                    +{dayLessons.length - shown.length} more
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(1);
  x.setMonth(x.getMonth() + n);
  return x;
}
