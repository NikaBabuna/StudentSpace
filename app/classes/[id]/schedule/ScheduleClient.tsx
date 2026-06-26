"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { lessonSchema, firstError } from "@/lib/validation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  completeLesson,
  missLesson,
  cancelLesson,
  deleteLesson,
  scheduleLesson,
  markCyclePaid,
} from "./actions";
import { ScheduleLessonDialog } from "./ScheduleLessonDialog";
import {
  addTime,
  cycleBadgeTone,
  isMakeup,
  lessonBarClass,
  lessonDateLine,
  lessonTime,
  needsMakeup,
  statusBadge,
  type Cycle,
  type Lesson,
} from "./schedule-utils";

export default function ScheduleClient({
  classId,
  userId: _userId,
  role,
  lessons,
  cycles,
  cycleHours: _cycleHours,
}: {
  classId: string;
  userId: string;
  role: string;
  lessons: Lesson[];
  cycles: Cycle[];
  cycleHours: number;
}) {
  const router = useRouter();
  const isTutor = role === "tutor";

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMakeupForId, setModalMakeupForId] = useState("");
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
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

  const selected = selectedId ? lessons.find((l) => l.id === selectedId) : null;
  const origLesson = selected?.replaces_lesson_id
    ? lessons.find((l) => l.id === selected.replaces_lesson_id)
    : null;
  const makeupLesson = selected ? lessons.find((l) => l.replaces_lesson_id === selected.id) : null;
  const missedNeedingMakeup = lessons.filter((l) => needsMakeup(l, lessons));

  function openScheduleModal(makeupId = "") {
    setModalMakeupForId(makeupId);
    setShowModal(true);
    setError(null);
  }

  function closeScheduleModal() {
    setShowModal(false);
    setModalMakeupForId("");
  }

  async function handleScheduleSubmit(payload: {
    scheduledAt: string;
    durationHours: number;
    makeupForId?: string;
  }) {
    const parsed = lessonSchema.safeParse({
      scheduledAt: payload.scheduledAt,
      durationHours: payload.durationHours,
    });
    if (!parsed.success) {
      throw new Error(firstError(parsed.error));
    }

    const { error: scheduleError } = await scheduleLesson({
      classId,
      scheduledAt: payload.scheduledAt,
      durationHours: payload.durationHours,
      makeupForId: payload.makeupForId,
    });
    if (scheduleError) throw new Error(scheduleError);

    closeScheduleModal();
    router.refresh();
  }

  async function handleAction(lessonId: string, action: string) {
    setError(null);
    let result: { error: string | null } | undefined;
    if (action === "completed") result = await completeLesson(lessonId);
    else if (action === "missed") result = await missLesson(lessonId);
    else if (action === "cancelled") result = await cancelLesson(lessonId);
    if (result?.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleMarkPaid(cycleId: string) {
    setMarkingPaidId(cycleId);
    const { error: payError } = await markCyclePaid(cycleId, classId);
    setMarkingPaidId(null);
    if (payError) {
      setError(payError);
      return;
    }
    router.refresh();
  }

  function cycleStatus(c: Cycle) {
    if (c.paid_at) return "paid";
    if (c.closed_at) return "closed";
    return "progress";
  }

  async function handleDelete(lessonId: string) {
    setError(null);
    const { error: deleteError } = await deleteLesson(lessonId);
    if (deleteError) {
      setError(deleteError);
      return;
    }
    setSelectedId(null);
    router.refresh();
  }

  function lessonNote(l: Lesson): string {
    const parts: string[] = [`${l.duration_hours}h`];
    if (isMakeup(l)) parts.push("makeup session");
    if (l.status === "completed" && l.payment_cycle_id) parts.push("counted toward cycle");
    return parts.join(" · ");
  }

  function SessionRow({ l }: { l: Lesson }) {
    const start = lessonTime(l);
    const end = addTime(start, l.duration_hours);
    const chip = statusBadge(l);
    const isSelected = selectedId === l.id;
    const showDot = needsMakeup(l, lessons);

    return (
      <button
        type="button"
        onClick={() => setSelectedId(l.id === selectedId ? null : l.id)}
        className={cn(
          "flex w-full items-center gap-[18px] border-t border-line px-1 py-[17px] text-left transition-colors first:border-t-0",
          isSelected ? "bg-surface-2" : "hover:bg-surface-2/60"
        )}
      >
        <div className="min-w-[118px] shrink-0">
          <div className="text-[14.5px] font-semibold text-ink">{lessonDateLine(l)}</div>
          <div className="font-mono text-[12.5px] text-muted">
            {start} – {end}
          </div>
        </div>
        <div className={cn("w-[3px] shrink-0 self-stretch rounded-sm", lessonBarClass(l))} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-semibold text-ink">
              {l.duration_hours}h session
            </span>
            {showDot ? (
              <span className="size-1.5 shrink-0 rounded-full bg-accent" title="Needs makeup" />
            ) : null}
          </div>
          <div className="text-[13px] text-ink-2">{lessonNote(l)}</div>
        </div>
        <Badge tone={chip.tone} className="shrink-0 font-mono text-[11px] uppercase tracking-wide">
          {chip.label}
        </Badge>
      </button>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[14px] text-ink-2">
            {upcoming.length > 0
              ? `${upcoming.length} upcoming ${upcoming.length === 1 ? "session" : "sessions"}`
              : "No upcoming sessions"}
          </p>
          {isTutor ? (
            <Button size="sm" onClick={() => openScheduleModal()}>
              + Schedule lesson
            </Button>
          ) : null}
        </div>

        {lessons.length === 0 ? (
          <EmptyState
            title="No sessions yet"
            description={
              isTutor
                ? "Schedule your first lesson for this class."
                : "Your tutor hasn't scheduled any lessons yet."
            }
            action={
              isTutor ? (
                <Button size="sm" onClick={() => openScheduleModal()}>
                  Schedule lesson
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Card className="px-[22px] py-2">
            {upcoming.length > 0 ? (
              <>
                <div className="pb-1 pt-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
                  Upcoming
                </div>
                {upcoming.map((l) => (
                  <SessionRow key={l.id} l={l} />
                ))}
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
                {past.map((l) => (
                  <SessionRow key={l.id} l={l} />
                ))}
              </>
            ) : null}
          </Card>
        )}

        {selected ? (
          <Card>
            <CardContent className="flex flex-col gap-3 pt-5">
              <div>
                <div className="text-[11px] text-muted">
                  {new Date(selected.scheduled_at).toLocaleDateString("en-GB", {
                    weekday: "long",
                    day: "numeric",
                    month: "short",
                  })}
                </div>
                <div className="mt-0.5 text-[17px] font-medium text-ink">
                  {lessonTime(selected)} – {addTime(lessonTime(selected), selected.duration_hours)}
                </div>
                <div className="mt-0.5 text-[11px] text-muted">
                  {selected.duration_hours} hour{selected.duration_hours !== 1 ? "s" : ""}
                </div>
                {(() => {
                  const chip = statusBadge(selected);
                  return (
                    <Badge
                      tone={chip.tone}
                      className="mt-2 font-mono text-[11px] uppercase tracking-wide"
                    >
                      {chip.label}
                    </Badge>
                  );
                })()}
              </div>

              {isMakeup(selected) && origLesson ? (
                <div>
                  <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted">
                    Makeup for
                  </div>
                  <div className="rounded-xl border border-danger/25 bg-danger-tint/30 p-2.5">
                    <div className="text-[11px] font-medium text-danger">Missed lesson</div>
                    <div className="mt-0.5 text-[10px] text-muted">
                      {new Date(origLesson.scheduled_at).toLocaleDateString("en-GB", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                      {" · "}
                      {lessonTime(origLesson)}–
                      {addTime(lessonTime(origLesson), origLesson.duration_hours)}
                    </div>
                  </div>
                </div>
              ) : null}

              {selected.status === "missed" && !isMakeup(selected) ? (
                <div>
                  <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted">
                    Makeup chain
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-start gap-2">
                      <div className="mt-1 size-2 shrink-0 rounded-full bg-danger" />
                      <div>
                        <div className="text-[11px] font-medium text-danger">Missed</div>
                        <div className="text-[10px] text-muted">
                          {lessonTime(selected)}–
                          {addTime(lessonTime(selected), selected.duration_hours)}
                        </div>
                      </div>
                    </div>
                    <div className="ml-1 h-3 w-px bg-line" />
                    {makeupLesson ? (
                      <div className="flex items-start gap-2">
                        <div
                          className={cn(
                            "mt-1 size-2 shrink-0 rounded-full",
                            makeupLesson.status === "completed"
                              ? "bg-ok"
                              : makeupLesson.status === "missed"
                                ? "bg-danger"
                                : "bg-accent"
                          )}
                        />
                        <div>
                          <div
                            className={cn(
                              "text-[11px] font-medium",
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
                          </div>
                          <div className="text-[10px] text-muted">
                            {new Date(makeupLesson.scheduled_at).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                            })}
                            {" · "}
                            {lessonTime(makeupLesson)}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <div className="mt-1 size-2 shrink-0 rounded-full border border-dashed border-line-2 bg-surface-2" />
                        <div className="text-[11px] text-muted">No makeup scheduled</div>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {error ? (
                <p className="rounded-xl border border-danger/30 bg-danger-tint px-3 py-2 text-[12px] text-danger">
                  {error}
                </p>
              ) : null}

              {isTutor ? (
                <div className="flex flex-col gap-2 border-t border-line pt-3">
                  {selected.status === "scheduled" ? (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full border-ok/35 bg-ok-tint/30 text-ok hover:bg-ok-tint/50 sm:w-auto"
                        onClick={() => handleAction(selected.id, "completed")}
                      >
                        Mark completed
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full sm:w-auto"
                        onClick={() => handleAction(selected.id, "missed")}
                      >
                        Mark missed
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full sm:w-auto"
                        onClick={() => handleAction(selected.id, "cancelled")}
                      >
                        Cancel lesson
                      </Button>
                    </>
                  ) : null}
                  {selected.status === "missed" && !makeupLesson ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full border-accent/30 bg-accent-tint/40 text-accent hover:bg-accent-tint/60 sm:w-auto"
                      onClick={() => openScheduleModal(selected.id)}
                    >
                      Schedule makeup
                    </Button>
                  ) : null}
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => handleDelete(selected.id)}
                  >
                    Delete lesson
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {isTutor && cycles.length > 0 ? (
          <Card>
            <CardFooter className="flex flex-col items-stretch gap-2 border-t-0 pt-5">
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted">
                Payment cycles
              </div>
              <div className="flex flex-col gap-1.5">
                {cycles.map((c) => {
                  const status = cycleStatus(c);
                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface-2 px-2.5 py-2"
                    >
                      <div>
                        <div className="text-[11px] font-medium text-ink">
                          Cycle {c.cycle_number}
                        </div>
                        <Badge tone={cycleBadgeTone(status)} className="mt-1 text-[9px]">
                          {status === "paid"
                            ? "Paid"
                            : status === "closed"
                              ? "Closed"
                              : "In progress"}
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
            </CardFooter>
          </Card>
        ) : null}
      </div>

      <ScheduleLessonDialog
        open={showModal}
        onClose={closeScheduleModal}
        onSubmit={handleScheduleSubmit}
        missedNeedingMakeup={missedNeedingMakeup}
        initialMakeupForId={modalMakeupForId}
        title={modalMakeupForId ? "Schedule makeup" : "Schedule lesson"}
        submitLabel={modalMakeupForId ? "Schedule makeup" : "Schedule lesson"}
      />
    </>
  );
}
