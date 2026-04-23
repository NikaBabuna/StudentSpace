"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

interface Lesson {
  id: string;
  scheduled_at: string;
  duration_hours: number;
  status: string;
  payment_cycle_id: string | null;
  replaces_lesson_id: string | null;
}

interface Cycle {
  id: string;
  cycle_number: number;
  closed_at: string | null;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function addTime(time: string, hours: number) {
  const [h, m] = time.split(":").map(Number);
  const t = h * 60 + m + hours * 60;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

function getWeekStart(offset: number) {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(now);
  mon.setDate(diff + offset * 7);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function lessonTime(l: Lesson) {
  const d = new Date(l.scheduled_at);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function isMakeup(l: Lesson) { return !!l.replaces_lesson_id; }

function needsMakeup(l: Lesson, all: Lesson[]) {
  return l.status === "missed" && !all.some(m => m.replaces_lesson_id === l.id);
}

function pillStyle(l: Lesson, all: Lesson[]) {
  const mu = isMakeup(l);
  if (l.status === "completed" && mu) return { bg: "#0e1e28", border: "#40a870", borderStyle: "dashed", color: "#40a870", subColor: "#2a4050" };
  if (l.status === "completed")      return { bg: "#10201a", border: "#40a870", borderStyle: "solid",  color: "#40a870", subColor: "#2a5040" };
  if (l.status === "missed" && mu)   return { bg: "#221020", border: "#c04040", borderStyle: "dashed", color: "#c04040", subColor: "#4a2040" };
  if (l.status === "missed")         return { bg: "#2a1010", border: "#c04040", borderStyle: "solid",  color: "#c04040", subColor: "#5a2020" };
  if (l.status === "scheduled" && mu)return { bg: "#1a1a2a", border: "#9090d8", borderStyle: "solid",  color: "#9090d8", subColor: "#3a3a5a" };
  return                                    { bg: "#2a2318", border: "#c8a050", borderStyle: "solid",  color: "#c8a050", subColor: "#5a4820" };
}

function statusChipStyle(l: Lesson) {
  const mu = isMakeup(l);
  if (l.status === "completed" && mu) return { bg: "#0e1e28", color: "#40a870", border: "#1a3a40", label: "◈ Makeup · completed" };
  if (l.status === "completed")       return { bg: "#10201a", color: "#40a870", border: "#1a4030", label: "✓ Completed" };
  if (l.status === "missed" && mu)    return { bg: "#221020", color: "#c04040", border: "#4a1040", label: "◈ Makeup · missed" };
  if (l.status === "missed")          return { bg: "#2a1010", color: "#c04040", border: "#4a1010", label: "✗ Missed" };
  if (l.status === "scheduled" && mu) return { bg: "#1a1a2a", color: "#9090d8", border: "#2a2a4a", label: "◈ Makeup · upcoming" };
  return                                     { bg: "#2a2318", color: "#c8a050", border: "#4a3a18", label: "● Upcoming" };
}

export default function ScheduleClient({ classId, userId, role, lessons, cycles, cycleHours }: {
  classId: string;
  userId: string;
  role: string;
  lessons: Lesson[];
  cycles: Cycle[];
  cycleHours: number;
}) {
  const supabase = createClient();
  const router = useRouter();
  const isTutor = role === "tutor";

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [durationHours, setDurationHours] = useState(1);
  const [makeupForId, setMakeupForId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeCycle = cycles.find(c => !c.closed_at);
  const weekStart = getWeekStart(weekOffset);
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);

  const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const today = new Date(); today.setHours(0, 0, 0, 0);

  // Get lessons for a specific day of the week
  function lessonsForDay(dayIndex: number) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + dayIndex);
    const next = new Date(d); next.setDate(next.getDate() + 1);
    return lessons.filter(l => {
      const ls = new Date(l.scheduled_at);
      return ls >= d && ls < next;
    });
  }

  const selected = selectedId ? lessons.find(l => l.id === selectedId) : null;
  const origLesson = selected?.replaces_lesson_id ? lessons.find(l => l.id === selected.replaces_lesson_id) : null;
  const makeupLesson = selected ? lessons.find(l => l.replaces_lesson_id === selected.id) : null;
  const missedNeedingMakeup = lessons.filter(l => needsMakeup(l, lessons));

async function handleAction(lessonId: string, action: string) {
  if (action === "completed") {
    const lesson = lessons.find(l => l.id === lessonId);
    if (!lesson) return;

    const hoursInCycle = activeCycle ? lessons
      .filter(l => l.payment_cycle_id === activeCycle.id && l.status === "completed")
      .reduce((sum, l) => sum + l.duration_hours, 0) : 0;

    const newTotal = hoursInCycle + lesson.duration_hours;

    if (activeCycle && newTotal >= cycleHours) {
      // Close current cycle
      await supabase.from("lessons").update({
        status: "completed",
        payment_cycle_id: activeCycle.id,
      }).eq("id", lessonId);

      await supabase.from("payment_cycles")
        .update({ closed_at: new Date().toISOString() })
        .eq("id", activeCycle.id);

      // Create next cycle
      const { data: newCycle } = await supabase.from("payment_cycles").insert({
        class_id: classId,
        cycle_number: activeCycle.cycle_number + 1,
      }).select().single();

      // If there's overflow, assign this lesson to the new cycle too
      // by updating it — the lesson straddles cycles, so we put it in the new one
      const overflow = newTotal - cycleHours;
      if (overflow > 0 && newCycle) {
        // Move the lesson to the new cycle and create a synthetic "partial" entry
        // Simplest correct approach: keep lesson in old cycle (it completed it),
        // insert a carry-over record in new cycle for the overflow hours
        await supabase.from("lessons").insert({
          class_id: classId,
          scheduled_at: lesson.scheduled_at,
          duration_hours: overflow,
          status: "completed",
          payment_cycle_id: newCycle.id,
        });
      }
    } else {
      await supabase.from("lessons").update({
        status: "completed",
        payment_cycle_id: activeCycle?.id ?? null,
      }).eq("id", lessonId);
    }
  } else if (action === "missed") {
    await supabase.from("lessons").update({ status: "missed" }).eq("id", lessonId);
  }
  router.refresh();
}

  async function handleSchedule(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.from("lessons").insert({
      class_id: classId,
      scheduled_at: scheduledAt,
      duration_hours: durationHours,
      status: "scheduled",
      replaces_lesson_id: makeupForId || null,
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setShowModal(false);
    setScheduledAt(""); setMakeupForId("");
    router.refresh();
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 112px)" }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: "0.5px solid #3a3630" }}>
        <div className="flex items-center gap-3">
          <button onClick={() => setWeekOffset(w => w - 1)}
            className="text-[12px] px-3 py-1.5 rounded-md"
            style={{ background: "#2a2820", border: "0.5px solid #3a3630", color: "#9a8e7a" }}>
            ←
          </button>
          <div className="text-[13px] font-medium" style={{ color: "#d8c8a0" }}>
            {fmt(weekStart)} – {fmt(weekEnd)}
          </div>
          <button onClick={() => setWeekOffset(w => w + 1)}
            className="text-[12px] px-3 py-1.5 rounded-md"
            style={{ background: "#2a2820", border: "0.5px solid #3a3630", color: "#9a8e7a" }}>
            →
          </button>
          <button onClick={() => setWeekOffset(0)}
            className="text-[11px] px-2.5 py-1 rounded-md"
            style={{ background: "transparent", border: "0.5px solid #3a3630", color: "#6a6050" }}>
            Today
          </button>
        </div>
        {isTutor && (
          <button onClick={() => setShowModal(true)}
            className="text-[12px] font-medium px-3 py-1.5 rounded-md"
            style={{ background: "#c8a050", color: "#1c1a17", border: "none" }}>
            + Schedule lesson
          </button>
        )}
      </div>

      {/* Calendar + panel */}
      <div className="flex flex-1 overflow-hidden">

        {/* Calendar grid */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Day headers */}
          <div className="grid shrink-0" style={{ gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "0.5px solid #2a2820" }}>
            {DAYS.map((day, i) => {
              const d = new Date(weekStart); d.setDate(d.getDate() + i);
              const isToday = d.getTime() === today.getTime();
              return (
                <div key={day} className="py-2 text-center">
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: "#5a5248" }}>{day}</div>
                  <div className="text-[15px] font-medium mt-0.5"
                    style={{ color: isToday ? "#c8a050" : "#9a8e7a" }}>
                    {d.getDate()}
                  </div>
                  {isToday && <div className="w-1 h-1 rounded-full mx-auto mt-0.5" style={{ background: "#c8a050" }} />}
                </div>
              );
            })}
          </div>

          {/* Day columns */}
          <div className="grid flex-1 overflow-y-auto" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
            {DAYS.map((day, i) => {
              const dayLessons = lessonsForDay(i);
              const d = new Date(weekStart); d.setDate(d.getDate() + i);
              const isToday = d.getTime() === today.getTime();
              return (
                <div key={day} className="p-1.5 flex flex-col gap-1.5"
                  style={{
                    borderRight: i < 6 ? "0.5px solid #2a2820" : "none",
                    background: isToday ? "#1e1c18" : "transparent",
                  }}>
                  {dayLessons.map(l => {
                    const ps = pillStyle(l, lessons);
                    const time = lessonTime(l);
                    const end = addTime(time, l.duration_hours);
                    const showDot = needsMakeup(l, lessons);
                    const isSelected = selectedId === l.id;
                    return (
                      <div key={l.id}
                        onClick={() => setSelectedId(l.id === selectedId ? null : l.id)}
                        className="rounded-md p-1.5 cursor-pointer relative"
                        style={{
                          background: ps.bg,
                          borderLeft: `3px ${ps.borderStyle} ${ps.border}`,
                          outline: isSelected ? `1.5px solid #c8a050` : "none",
                          outlineOffset: "1px",
                        }}>
                        {showDot && (
                          <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
                            style={{ background: "#9090d8" }} />
                        )}
                        <div className="text-[10px] font-medium" style={{ color: ps.color }}>
                          {time}–{end}
                        </div>
                        <div className="text-[9px] mt-0.5" style={{ color: ps.subColor }}>
                          {l.duration_hours}h{isMakeup(l) ? " · makeup" : ""}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Side panel */}
        <div className="shrink-0 flex flex-col gap-3 p-4 overflow-y-auto"
          style={{ width: "220px", borderLeft: "0.5px solid #3a3630" }}>
          {!selected ? (
            <div className="text-[12px] text-center mt-10" style={{ color: "#4a4438", lineHeight: 1.6 }}>
              Click any lesson to see details and actions
            </div>
          ) : (
            <>
              {/* Details */}
              <div>
                <div className="text-[11px]" style={{ color: "#6a6050" }}>
                  {new Date(selected.scheduled_at).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" })}
                </div>
                <div className="text-[17px] font-medium mt-0.5" style={{ color: "#e8d5b0" }}>
                  {lessonTime(selected)} – {addTime(lessonTime(selected), selected.duration_hours)}
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: "#9a8060" }}>
                  {selected.duration_hours} hour{selected.duration_hours !== 1 ? "s" : ""}
                </div>
                {(() => {
                  const chip = statusChipStyle(selected);
                  return (
                    <span className="inline-block text-[11px] font-medium px-2 py-1 rounded mt-2"
                      style={{ background: chip.bg, color: chip.color, border: `0.5px solid ${chip.border}` }}>
                      {chip.label}
                    </span>
                  );
                })()}
              </div>

              <div style={{ height: "0.5px", background: "#2a2820" }} />

              {/* Makeup info for makeup lessons */}
              {isMakeup(selected) && origLesson && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: "#5a5248" }}>
                    Makeup for
                  </div>
                  <div className="rounded-md p-2.5"
                    style={{ background: "#2a1010", border: "0.5px solid #4a1010" }}>
                    <div className="text-[11px] font-medium" style={{ color: "#c04040" }}>Missed lesson</div>
                    <div className="text-[10px] mt-0.5" style={{ color: "#6a5050" }}>
                      {new Date(origLesson.scheduled_at).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                      {" · "}{lessonTime(origLesson)}–{addTime(lessonTime(origLesson), origLesson.duration_hours)}
                    </div>
                  </div>
                </div>
              )}

              {/* Makeup chain for missed lessons */}
              {selected.status === "missed" && !isMakeup(selected) && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: "#5a5248" }}>
                    Makeup chain
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ background: "#c04040" }} />
                      <div>
                        <div className="text-[11px] font-medium" style={{ color: "#c04040" }}>Missed</div>
                        <div className="text-[10px]" style={{ color: "#6a5050" }}>{lessonTime(selected)}–{addTime(lessonTime(selected), selected.duration_hours)}</div>
                      </div>
                    </div>
                    <div className="w-px h-3 ml-1" style={{ background: "#3a3630" }} />
                    {makeupLesson ? (
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0 mt-1"
                          style={{ background: makeupLesson.status === "completed" ? "#40a870" : makeupLesson.status === "missed" ? "#c04040" : "#9090d8" }} />
                        <div>
                          <div className="text-[11px] font-medium"
                            style={{ color: makeupLesson.status === "completed" ? "#40a870" : makeupLesson.status === "missed" ? "#c04040" : "#9090d8" }}>
                            {makeupLesson.status === "completed" ? "Makeup completed ✓" : makeupLesson.status === "missed" ? "Makeup also missed" : "Makeup scheduled"}
                          </div>
                          <div className="text-[10px]" style={{ color: "#6a6050" }}>
                            {new Date(makeupLesson.scheduled_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                            {" · "}{lessonTime(makeupLesson)}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ background: "#3a3630", border: "1px dashed #5a5248" }} />
                        <div className="text-[11px]" style={{ color: "#4a4438" }}>No makeup scheduled</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div style={{ height: "0.5px", background: "#2a2820" }} />

              {/* Actions */}
              {isTutor && (
                <div className="flex flex-col gap-2">
                  {selected.status === "scheduled" && (
                    <>
                      <button onClick={() => handleAction(selected.id, "completed")}
                        className="w-full py-2 rounded-md text-[12px] font-medium"
                        style={{ background: "#10201a", color: "#40a870", border: "0.5px solid #1a4030" }}>
                        ✓ Mark completed
                      </button>
                      <button onClick={() => handleAction(selected.id, "missed")}
                        className="w-full py-2 rounded-md text-[12px] font-medium"
                        style={{ background: "#2a1010", color: "#c04040", border: "0.5px solid #4a1010" }}>
                        ✗ Mark missed
                      </button>
                    </>
                  )}
                  {selected.status === "missed" && !makeupLesson && (
                    <button onClick={() => { setMakeupForId(selected.id); setShowModal(true); }}
                      className="w-full py-2 rounded-md text-[12px] font-medium"
                      style={{ background: "#1a1a2a", color: "#9090d8", border: "0.5px solid #2a2a4a" }}>
                      ◈ Schedule makeup
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Schedule modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="w-[420px] rounded-xl p-6"
            style={{ background: "#201e18", border: "0.5px solid var(--color-ss-border)" }}>
            <div className="text-[16px] font-medium mb-4" style={{ color: "#e8d5b0" }}>
              Schedule lesson
            </div>
            <form onSubmit={handleSchedule} className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] mb-1 block" style={{ color: "#6a6050" }}>Date & time</label>
                <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} required
                  className="w-full px-3 py-2 rounded-md text-[13px] outline-none"
                  style={{ background: "#17150f", border: "0.5px solid #3a3630", color: "#c8b890" }} />
              </div>
              <div>
                <label className="text-[11px] mb-1 block" style={{ color: "#6a6050" }}>Duration</label>
                <select value={durationHours} onChange={e => setDurationHours(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-md text-[13px] outline-none"
                  style={{ background: "#17150f", border: "0.5px solid #3a3630", color: "#c8b890" }}>
                  <option value={0.5}>30 minutes</option>
                  <option value={1}>1 hour</option>
                  <option value={1.5}>1.5 hours</option>
                  <option value={2}>2 hours</option>
                  <option value={2.5}>2.5 hours</option>
                  <option value={3}>3 hours</option>
                </select>
              </div>
              {missedNeedingMakeup.length > 0 && (
                <div>
                  <label className="text-[11px] mb-1 block" style={{ color: "#6a6050" }}>
                    Makeup for <span style={{ color: "#4a4438" }}>(optional)</span>
                  </label>
                  <select value={makeupForId} onChange={e => setMakeupForId(e.target.value)}
                    className="w-full px-3 py-2 rounded-md text-[13px] outline-none"
                    style={{ background: "#17150f", border: "0.5px solid #3a3630", color: "#c8b890" }}>
                    <option value="">Not a makeup</option>
                    {missedNeedingMakeup.map(l => (
                      <option key={l.id} value={l.id}>
                        {new Date(l.scheduled_at).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} · {lessonTime(l)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {error && (
                <div className="text-[12px] px-3 py-2 rounded-md"
                  style={{ background: "#2a1010", color: "#c04040", border: "0.5px solid #4a1010" }}>
                  {error}
                </div>
              )}
              <div className="flex gap-2 mt-1">
                <button type="button" onClick={() => { setShowModal(false); setMakeupForId(""); }}
                  className="flex-1 py-2 rounded-md text-[13px]"
                  style={{ color: "#9a8e7a", background: "#2a2820", border: "0.5px solid #3a3630" }}>
                  Cancel
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 py-2 rounded-md text-[13px] font-medium"
                  style={{ background: "#c8a050", color: "#1c1a17", opacity: loading ? 0.6 : 1, border: "none" }}>
                  {loading ? "Scheduling…" : "Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}