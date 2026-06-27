/* =============================================================================
 * features/schedule/components/ScheduleClient.tsx — weekly lesson calendar
 * -----------------------------------------------------------------------------
 * Role: Main schedule tab: week grid, lesson bars, payment cycle sidebar,
 *       complete/miss/cancel/delete, mark cycle paid. Opens add-lesson dialog.
 * Dependencies: schedule/actions, schedule-utils, ScheduleLessonDialog, ui
 * Used by: app/classes/[id]/schedule/page.tsx
 * Inputs: lessons, cycles, recurring schedules, role, timezone from server
 * Outputs: Full interactive schedule view
 * ========================================================================== */
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { lessonSchema, firstError } from "@/lib/validation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import {
  PlusIcon,
  RepeatIcon,
  PauseIcon,
  PlayIcon,
  TrashIcon,
  ScheduleIcon,
  ChevronRightIcon,
} from "@/components/icons";
import {
  completeLesson,
  missLesson,
  cancelLesson,
  deleteLesson,
  scheduleLesson,
  markCyclePaid,
  createRecurringSchedule,
  setRecurringScheduleActive,
  deleteRecurringSchedule,
} from "@/features/schedule/actions";
import { AddLessonsDialog, type AddLessonsPayload } from "@/features/schedule/components/ScheduleLessonDialog";
import { LessonOccurrenceDialog } from "@/features/schedule/components/LessonOccurrenceDialog";
import {
  addTime,
  collapseUpcoming,
  cycleBadgeTone,
  isMakeup,
  isRecurring,
  lessonBarClass,
  lessonDateLine,
  lessonTime,
  needsMakeup,
  recurrenceCadence,
  recurrenceSummary,
  statusBadge,
  type Cycle,
  type Lesson,
  type RecurringSchedule,
} from "@/features/schedule/lib/schedule-utils";

export default function ScheduleClient({
  classId,
  userId: _userId,
  role,
  lessons,
  cycles,
  cycleHours: _cycleHours,
  schedules,
}: {
  classId: string;
  userId: string;
  role: string;
  lessons: Lesson[];
  cycles: Cycle[];
  cycleHours: number;
  schedules: RecurringSchedule[];
}) {
  const router = useRouter();
  const isTutor = role === "tutor";

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMakeupForId, setModalMakeupForId] = useState("");
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
  const [busyScheduleId, setBusyScheduleId] = useState<string | null>(null);
  const [confirmDeleteScheduleId, setConfirmDeleteScheduleId] = useState<string | null>(null);
  const [occurrenceScheduleId, setOccurrenceScheduleId] = useState<string | null>(null);
  const [occurrenceBusy, setOccurrenceBusy] = useState(false);
  const [showAllPast, setShowAllPast] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const now = useMemo(() => new Date(), []);

  const { upcoming, past } = useMemo(() => {
    const up: Lesson[] = [];
    const pa: Lesson[] = [];
    for (const l of lessons) {
      const at = new Date(l.scheduled_at);
      if (l.status === "scheduled" && at >= now) up.push(l);
      else pa.push(l);
    }
    up.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
    pa.sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());
    return { upcoming: up, past: pa };
  }, [lessons, now]);

  // Recurring slots collapse to one row each (their soonest upcoming hit); the
  // full set of dates lives in the occurrence dialog. One-off lessons pass through.
  const upcomingRows = useMemo(() => collapseUpcoming(upcoming), [upcoming]);
  const schedulesById = useMemo(
    () => new Map(schedules.map((s) => [s.id, s] as const)),
    [schedules]
  );

  const occurrenceSchedule = occurrenceScheduleId ? schedulesById.get(occurrenceScheduleId) : null;
  const occurrenceLessons = useMemo(
    () =>
      occurrenceScheduleId
        ? lessons.filter((l) => l.recurring_schedule_id === occurrenceScheduleId)
        : [],
    [lessons, occurrenceScheduleId]
  );

  const missedNeedingMakeup = lessons.filter((l) => needsMakeup(l, lessons));
  const nextLesson = upcoming[0];
  const visiblePast = showAllPast ? past : past.slice(0, 8);

  function openModal(makeupId = "") {
    setModalMakeupForId(makeupId);
    setShowModal(true);
    setError(null);
  }
  function closeModal() {
    setShowModal(false);
    setModalMakeupForId("");
  }

  async function handleAddLessons(payload: AddLessonsPayload) {
    if (payload.mode === "once") {
      const parsed = lessonSchema.safeParse({
        scheduledAt: payload.scheduledAt,
        durationHours: payload.durationHours,
      });
      if (!parsed.success) throw new Error(firstError(parsed.error));
      const { error: e } = await scheduleLesson({
        classId,
        scheduledAt: payload.scheduledAt,
        durationHours: payload.durationHours,
        makeupForId: payload.makeupForId,
      });
      if (e) throw new Error(e);
    } else {
      const { error: e } = await createRecurringSchedule({
        classId,
        weekdays: payload.weekdays,
        startTime: payload.startTime,
        durationHours: payload.durationHours,
        intervalWeeks: payload.intervalWeeks,
        anchorDate: payload.anchorDate,
        untilDate: payload.untilDate,
        timezone: payload.timezone,
      });
      if (e) throw new Error(e);
    }
    closeModal();
    router.refresh();
  }

  async function handleAction(lessonId: string, action: string) {
    setError(null);
    let result: { error: string | null } | undefined;
    if (action === "completed") result = await completeLesson(lessonId);
    else if (action === "missed") result = await missLesson(lessonId);
    else if (action === "cancelled") result = await cancelLesson(lessonId);
    if (result?.error) return setError(result.error);
    router.refresh();
  }

  async function handleDelete(lessonId: string) {
    setError(null);
    const { error: e } = await deleteLesson(lessonId);
    if (e) return setError(e);
    setExpandedId(null);
    router.refresh();
  }

  async function handleOccurrenceAction(
    lessonId: string,
    action: "completed" | "missed" | "cancelled"
  ) {
    setError(null);
    setOccurrenceBusy(true);
    let result: { error: string | null } | undefined;
    if (action === "completed") result = await completeLesson(lessonId);
    else if (action === "missed") result = await missLesson(lessonId);
    else if (action === "cancelled") result = await cancelLesson(lessonId);
    setOccurrenceBusy(false);
    if (result?.error) return setError(result.error);
    router.refresh();
  }

  async function handleMarkPaid(cycleId: string) {
    setMarkingPaidId(cycleId);
    const { error: e } = await markCyclePaid(cycleId, classId);
    setMarkingPaidId(null);
    if (e) return setError(e);
    router.refresh();
  }

  async function handleScheduleActive(scheduleId: string, active: boolean) {
    setBusyScheduleId(scheduleId);
    const { error: e } = await setRecurringScheduleActive(scheduleId, classId, active);
    setBusyScheduleId(null);
    if (e) return setError(e);
    router.refresh();
  }

  async function handleDeleteSchedule(scheduleId: string) {
    setBusyScheduleId(scheduleId);
    const { error: e } = await deleteRecurringSchedule(scheduleId, classId);
    setBusyScheduleId(null);
    setConfirmDeleteScheduleId(null);
    if (e) return setError(e);
    router.refresh();
  }

  function cycleStatus(c: Cycle) {
    if (c.paid_at) return "paid";
    if (c.closed_at) return "closed";
    return "progress";
  }

  function lessonNote(l: Lesson): string {
    const parts: string[] = [`${l.duration_hours}h`];
    if (isMakeup(l)) parts.push("makeup");
    else if (isRecurring(l)) parts.push("recurring");
    if (l.status === "completed" && l.payment_cycle_id) parts.push("counted toward cycle");
    return parts.join(" · ");
  }

  function SessionRow({
    l,
    collapsed = false,
    upcomingCount = 0,
  }: {
    l: Lesson;
    collapsed?: boolean;
    upcomingCount?: number;
  }) {
    const start = lessonTime(l);
    const end = addTime(start, l.duration_hours);
    const chip = statusBadge(l);
    const expanded = !collapsed && expandedId === l.id;
    const showMakeupDot = needsMakeup(l, lessons);
    const origLesson = l.replaces_lesson_id ? lessons.find((x) => x.id === l.replaces_lesson_id) : null;
    const makeupLesson = lessons.find((x) => x.replaces_lesson_id === l.id);

    // A collapsed row represents a whole recurring slot: clicking opens its date
    // map instead of toggling an inline panel.
    const schedule = collapsed && l.recurring_schedule_id ? schedulesById.get(l.recurring_schedule_id) : null;
    const subline = collapsed
      ? `${schedule ? recurrenceCadence(schedule) : "Repeats weekly"} · ${upcomingCount} upcoming`
      : lessonNote(l);

    return (
      <div className="border-t border-line first:border-t-0">
        <button
          type="button"
          onClick={() =>
            collapsed
              ? l.recurring_schedule_id && setOccurrenceScheduleId(l.recurring_schedule_id)
              : setExpandedId(expanded ? null : l.id)
          }
          aria-expanded={collapsed ? undefined : expanded}
          aria-haspopup={collapsed ? "dialog" : undefined}
          className={cn(
            "flex w-full items-center gap-[18px] px-1 py-[15px] text-left transition-colors",
            expanded ? "bg-surface-2" : "hover:bg-surface-2/60"
          )}
        >
          <div className="min-w-[112px] shrink-0">
            <div className="text-[14.5px] font-semibold text-ink">{lessonDateLine(l)}</div>
            <div className="font-mono text-[12.5px] text-muted">
              {start} – {end}
            </div>
          </div>
          <div className={cn("w-[3px] shrink-0 self-stretch rounded-sm", lessonBarClass(l))} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[15px] font-semibold text-ink">{l.duration_hours}h session</span>
              {isRecurring(l) && !isMakeup(l) ? (
                <RepeatIcon size={13} className="text-muted" aria-label="Recurring" />
              ) : null}
              {showMakeupDot ? (
                <span className="size-1.5 shrink-0 rounded-full bg-accent" title="Needs makeup" />
              ) : null}
            </div>
            <div className="text-[13px] text-ink-2">{subline}</div>
          </div>
          <Badge tone={chip.tone} className="shrink-0 font-mono text-[11px] uppercase tracking-wide">
            {chip.label}
          </Badge>
          {collapsed ? <ChevronRightIcon size={16} className="shrink-0 text-muted" /> : null}
        </button>

        {expanded ? (
          <div className="flex flex-col gap-3 px-1 pb-4">
            {isMakeup(l) && origLesson ? (
              <div className="rounded-xl border border-danger/25 bg-danger-tint/30 px-3 py-2.5 text-[12px]">
                <span className="font-medium text-danger">Makeup for missed lesson</span>{" "}
                <span className="text-muted">
                  ·{" "}
                  {new Date(origLesson.scheduled_at).toLocaleDateString("en-GB", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
            ) : null}

            {l.status === "missed" && !isMakeup(l) ? (
              <div className="rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-[12px]">
                {makeupLesson ? (
                  <span
                    className={cn(
                      "font-medium",
                      makeupLesson.status === "completed"
                        ? "text-ok"
                        : makeupLesson.status === "missed"
                          ? "text-danger"
                          : "text-accent"
                    )}
                  >
                    {makeupLesson.status === "completed"
                      ? "Makeup completed"
                      : makeupLesson.status === "missed"
                        ? "Makeup also missed"
                        : "Makeup scheduled"}
                  </span>
                ) : (
                  <span className="text-muted">No makeup scheduled yet.</span>
                )}
              </div>
            ) : null}

            {isTutor ? (
              <div className="flex flex-wrap gap-2">
                {l.status === "scheduled" ? (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="border-ok/35 bg-ok-tint/30 text-ok hover:bg-ok-tint/50"
                      onClick={() => handleAction(l.id, "completed")}
                    >
                      Mark completed
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => handleAction(l.id, "missed")}>
                      Mark missed
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => handleAction(l.id, "cancelled")}>
                      Cancel
                    </Button>
                  </>
                ) : null}
                {l.status === "missed" && !makeupLesson ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="border-accent/30 bg-accent-tint/40 text-accent hover:bg-accent-tint/60"
                    onClick={() => openModal(l.id)}
                  >
                    Schedule makeup
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-danger hover:bg-danger-tint/40"
                  onClick={() => handleDelete(l.id)}
                >
                  Delete
                </Button>
              </div>
            ) : (
              <p className="text-[12px] text-muted">
                {l.duration_hours} hour session · {chip.label.toLowerCase()}
              </p>
            )}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-5">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3">
          <p className="text-[14px] text-ink-2">
            {upcomingRows.length > 0 ? (
              <>
                {upcomingRows.length} upcoming
                {nextLesson ? (
                  <span className="text-muted">
                    {" "}
                    · next {lessonDateLine(nextLesson)} {lessonTime(nextLesson)}
                  </span>
                ) : null}
              </>
            ) : (
              "No upcoming sessions"
            )}
          </p>
          {isTutor ? (
            <Button size="sm" onClick={() => openModal()}>
              <PlusIcon size={16} /> Add lessons
            </Button>
          ) : null}
        </div>

        {error ? (
          <p className="rounded-xl border border-danger/30 bg-danger-tint px-3.5 py-2.5 text-[12.5px] text-danger">
            {error}
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* Sessions */}
          <div className="min-w-0">
            {lessons.length === 0 ? (
              <EmptyState
                icon={<ScheduleIcon size={20} />}
                title="No sessions yet"
                description={
                  isTutor
                    ? "Add a one-off lesson or set up a weekly schedule to fill the calendar."
                    : "Your tutor hasn't scheduled any lessons yet."
                }
                action={
                  isTutor ? (
                    <Button size="sm" onClick={() => openModal()}>
                      <PlusIcon size={16} /> Add lessons
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <Card className="px-[22px] py-2">
                {upcomingRows.length > 0 ? (
                  <>
                    <div className="pb-1 pt-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
                      Upcoming
                    </div>
                    {upcomingRows.map((row) =>
                      row.kind === "recurring" ? (
                        <SessionRow
                          key={`r-${row.scheduleId}`}
                          l={row.lesson}
                          collapsed
                          upcomingCount={row.upcomingCount}
                        />
                      ) : (
                        <SessionRow key={row.lesson.id} l={row.lesson} />
                      )
                    )}
                  </>
                ) : null}

                {past.length > 0 ? (
                  <>
                    <div
                      className={cn(
                        "pb-1 font-mono text-[11px] uppercase tracking-[0.08em] text-muted",
                        upcoming.length > 0 ? "mt-2 border-t border-line pt-4" : "pt-3"
                      )}
                    >
                      Past
                    </div>
                    {visiblePast.map((l) => (
                      <SessionRow key={l.id} l={l} />
                    ))}
                    {!showAllPast && past.length > visiblePast.length ? (
                      <button
                        type="button"
                        onClick={() => setShowAllPast(true)}
                        className="w-full border-t border-line py-3 text-[13px] font-medium text-accent hover:underline"
                      >
                        Show {past.length - visiblePast.length} earlier
                      </button>
                    ) : null}
                  </>
                ) : null}
              </Card>
            )}
          </div>

          {/* Rail */}
          <div className="flex min-w-0 flex-col gap-5">
            {schedules.length > 0 || isTutor ? (
              <RailPanel
                title="Recurring"
                icon={<RepeatIcon size={14} />}
                action={
                  isTutor && schedules.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => openModal()}
                      className="text-[12px] font-semibold text-accent hover:underline"
                    >
                      Add
                    </button>
                  ) : null
                }
              >
                {schedules.length === 0 ? (
                  <p className="text-[13px] text-muted">
                    Set a weekly pattern and the calendar fills itself —{" "}
                    <button
                      type="button"
                      onClick={() => openModal()}
                      className="font-medium text-accent hover:underline"
                    >
                      add one
                    </button>
                    .
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {schedules.map((s) => (
                      <div
                        key={s.id}
                        className={cn(
                          "rounded-xl border border-line bg-surface-2 px-3 py-2.5",
                          !s.active && "opacity-70"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => setOccurrenceScheduleId(s.id)}
                              aria-haspopup="dialog"
                              className="text-left text-[13px] font-medium text-ink hover:text-accent hover:underline"
                            >
                              {recurrenceSummary(s)}
                            </button>
                            {!s.active ? (
                              <Badge tone="neutral" className="mt-1 text-[10px]">
                                Paused
                              </Badge>
                            ) : null}
                          </div>
                          {isTutor ? (
                            <div className="flex shrink-0 items-center gap-0.5">
                              <IconButton
                                size="sm"
                                aria-label={s.active ? "Pause schedule" : "Resume schedule"}
                                title={s.active ? "Pause" : "Resume"}
                                disabled={busyScheduleId === s.id}
                                onClick={() => handleScheduleActive(s.id, !s.active)}
                              >
                                {s.active ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
                              </IconButton>
                              <IconButton
                                size="sm"
                                aria-label="Remove schedule"
                                title="Remove"
                                disabled={busyScheduleId === s.id}
                                onClick={() => setConfirmDeleteScheduleId(s.id)}
                              >
                                <TrashIcon size={14} />
                              </IconButton>
                            </div>
                          ) : null}
                        </div>

                        {confirmDeleteScheduleId === s.id ? (
                          <div className="mt-2.5 flex items-center gap-2 border-t border-line pt-2.5">
                            <span className="flex-1 text-[12px] text-muted">
                              Remove this schedule and its upcoming lessons?
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2.5"
                              onClick={() => setConfirmDeleteScheduleId(null)}
                            >
                              Keep
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-8 px-2.5"
                              busy={busyScheduleId === s.id}
                              onClick={() => handleDeleteSchedule(s.id)}
                            >
                              Remove
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </RailPanel>
            ) : null}

            {isTutor && cycles.length > 0 ? (
              <RailPanel title="Payment cycles">
                <div className="flex flex-col gap-1.5">
                  {cycles.map((c) => {
                    const status = cycleStatus(c);
                    return (
                      <div
                        key={c.id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface-2 px-2.5 py-2"
                      >
                        <div>
                          <div className="text-[12px] font-medium text-ink">Cycle {c.cycle_number}</div>
                          <Badge tone={cycleBadgeTone(status)} className="mt-1 text-[10px]">
                            {status === "paid" ? "Paid" : status === "closed" ? "Closed" : "In progress"}
                          </Badge>
                        </div>
                        {status === "closed" ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="shrink-0 border-ok/35 bg-ok-tint/30 text-ok hover:bg-ok-tint/50"
                            onClick={() => handleMarkPaid(c.id)}
                            busy={markingPaidId === c.id}
                          >
                            Mark paid
                          </Button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </RailPanel>
            ) : null}
          </div>
        </div>
      </div>

      <AddLessonsDialog
        open={showModal}
        onClose={closeModal}
        onSubmit={handleAddLessons}
        missedNeedingMakeup={missedNeedingMakeup}
        initialMakeupForId={modalMakeupForId}
      />

      {occurrenceSchedule ? (
        <LessonOccurrenceDialog
          key={occurrenceSchedule.id}
          open={!!occurrenceScheduleId}
          onClose={() => setOccurrenceScheduleId(null)}
          schedule={occurrenceSchedule}
          occurrences={occurrenceLessons}
          isTutor={isTutor}
          busy={occurrenceBusy}
          onAction={handleOccurrenceAction}
        />
      ) : null}
    </>
  );
}

function RailPanel({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
            {icon}
            {title}
          </div>
          {action}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}
