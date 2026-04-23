import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function OverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("class_members").select("role").eq("class_id", id).eq("user_id", user.id).single();

  const role = membership?.role ?? "student";
  const isTutor = role === "tutor";

  // Fetch all lessons
  const { data: lessons } = await supabase
    .from("lessons").select("id, scheduled_at, duration_hours, status, payment_cycle_id, replaces_lesson_id")
    .eq("class_id", id).is("deleted_at", null).order("scheduled_at", { ascending: true });

  // Fetch all homework
  const { data: homework } = await supabase
    .from("homework").select("id, title, deadline, created_at")
    .eq("class_id", id).is("deleted_at", null).order("deadline", { ascending: true });

  // Fetch all submissions
  const hwIds = (homework ?? []).map(h => h.id);
  const { data: submissions } = await supabase
    .from("submissions").select("id, homework_id, student_id, created_at, grade")
    .in("homework_id", hwIds.length > 0 ? hwIds : ["00000000-0000-0000-0000-000000000000"]);

  // Fetch all students in this class
  const { data: members } = await supabase
    .from("class_members").select("user_id, role").eq("class_id", id);

  const studentIds = (members ?? []).filter(m => m.role === "student").map(m => m.user_id);

  const { data: studentUsers } = await supabase
    .from("users").select("id, full_name")
    .in("id", studentIds.length > 0 ? studentIds : ["00000000-0000-0000-0000-000000000000"]);

  // Fetch recent messages
  const { data: messages } = await supabase
    .from("messages").select("id, author_id, body, created_at")
    .eq("class_id", id).order("created_at", { ascending: false }).limit(5);

  // Fetch payment cycles
  const { data: cycles } = await supabase
    .from("payment_cycles").select("id, cycle_number, closed_at, paid_at")
    .eq("class_id", id).order("cycle_number", { ascending: true });

  // Fetch class info for cycle hours
  const { data: cls } = await supabase
    .from("classes").select("cycle_hours").eq("id", id).single();

  const now = new Date();
  const allLessons = lessons ?? [];
  const allHomework = homework ?? [];
  const allSubmissions = submissions ?? [];
  const allMessages = messages ?? [];
  const allCycles = cycles ?? [];
  const cycleHoursTarget = cls?.cycle_hours ?? 8;

  // ---- Lesson stats ----
  const completedLessons = allLessons.filter(l => l.status === "completed");
  const missedLessons = allLessons.filter(l => l.status === "missed");
  const nextLesson = allLessons.find(l => l.status === "scheduled" && new Date(l.scheduled_at) > now);
  const totalHours = completedLessons.reduce((sum, l) => sum + (l.duration_hours ?? 0), 0);
  const completedCycles = allCycles.filter(c => c.closed_at).length;

  // Makeups: missed lessons that have a makeup = replaces_lesson_id pointing to them
  const makeupLessons = allLessons.filter(l => l.replaces_lesson_id);
  const missedWithMakeup = missedLessons.filter(l => makeupLessons.some(m => m.replaces_lesson_id === l.id));
  const missedWithNoMakeup = missedLessons.filter(l => !makeupLessons.some(m => m.replaces_lesson_id === l.id));
  const makeupRate = missedLessons.length > 0
    ? Math.round((missedWithMakeup.length / missedLessons.length) * 100)
    : 100;

  // ---- Homework stats ----
  function hwStatus(hw: any, studentId?: string) {
    const subs = allSubmissions.filter(s => s.homework_id === hw.id && (studentId ? s.student_id === studentId : true));
    const isPast = new Date(hw.deadline) < now;
    if (subs.length > 0) {
      const graded = subs.filter(s => s.grade);
      return graded.length > 0 ? "feedback" : "submitted";
    }
    return isPast ? "overdue" : "pending";
  }

  // Student-specific stats
  const mySubmissions = allSubmissions.filter(s => s.student_id === user.id);
  const myHwWithFeedback = allHomework.filter(h => mySubmissions.some(s => s.homework_id === h.id && s.grade));
  const myHwSubmitted = allHomework.filter(h => mySubmissions.some(s => s.homework_id === h.id));
  const myHwMissed = allHomework.filter(h => {
    const hasSub = mySubmissions.some(s => s.homework_id === h.id);
    return !hasSub && new Date(h.deadline) < now;
  });
  const myHwPendingFeedback = allHomework.filter(h => {
    const sub = mySubmissions.find(s => s.homework_id === h.id);
    return sub && !sub.grade;
  });
  const myHwPending = allHomework.filter(h => {
    const hasSub = mySubmissions.some(s => s.homework_id === h.id);
    return !hasSub && new Date(h.deadline) >= now;
  });

  // Student attendance
  const myAttendedLessons = isTutor ? completedLessons.length : completedLessons.length;
  const myTotalLessons = allLessons.filter(l => l.status !== "scheduled").length;

  // For tutor: pending feedback
  const pendingFeedbackSubs = allSubmissions.filter(s => !s.grade);

  // ---- Render helpers ----
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  const fmtTime = (d: string) => new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const fmtDatetime = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  function timeUntil(d: string) {
    const diff = new Date(d).getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d ${hours}h away`;
    if (hours > 0) return `${hours}h away`;
    return "soon";
  }

  function studentName(sid: string) {
    return (studentUsers ?? []).find(u => u.id === sid)?.full_name ?? "Student";
  }

  const activeHw = allHomework.filter(h => new Date(h.deadline) >= now);
  const recentFeedback = mySubmissions.filter(s => s.grade).slice(0, 3);

  // Homework totals for bars (student)
  const hwTotal = allHomework.length;
  const maxBarVal = Math.max(myHwWithFeedback.length, myHwPendingFeedback.length, myHwPending.length, myHwMissed.length, 1);

  return (
    <div className="p-6 flex flex-col gap-4 overflow-auto">

      {/* ==================== TUTOR VIEW ==================== */}
      {isTutor && (
        <>
          {/* Stat row */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total hours", value: totalHours, sub: "since start" },
              { label: "Cycles completed", value: completedCycles, sub: `× ${cycleHoursTarget}h each` },
              { label: "Total lessons", value: allLessons.filter(l => l.status !== "scheduled").length, sub: `${missedLessons.length} missed` },
              { label: "Makeup rate", value: `${makeupRate}%`, sub: missedWithMakeup.length > 0 ? `${missedWithMakeup.length} of ${missedLessons.length} rescheduled` : missedLessons.length === 0 ? "no missed lessons" : "none rescheduled", color: makeupRate >= 80 ? "#40a870" : makeupRate >= 50 ? "#c8a050" : "#c04040" },
            ].map((s: any) => (
              <div key={s.label} className="rounded-lg p-4"
                style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}>
                <div className="text-[11px] mb-1" style={{ color: "var(--color-ss-text-faint)" }}>{s.label}</div>
                <div className="text-[22px] font-medium" style={{ color: s.color ?? "var(--color-ss-text-primary)" }}>{s.value}</div>
                <div className="text-[10px] mt-1" style={{ color: "var(--color-ss-text-ghost)" }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Makeup alert */}
          {missedWithNoMakeup.length > 0 && (
            <div className="rounded-xl p-4 flex items-center gap-3"
              style={{ background: "#1a1828", border: "0.5px solid #3a3060" }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[13px] font-medium"
                style={{ background: "#2a2040", border: "1px solid #4a3a70", color: "#9090d8" }}>!</div>
              <div className="flex-1">
                <div className="text-[13px] font-medium" style={{ color: "#b0a0d8" }}>
                  {missedWithNoMakeup.length} missed {missedWithNoMakeup.length === 1 ? "lesson has" : "lessons have"} no makeup scheduled
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: "#6a6080" }}>
                  {missedWithNoMakeup.slice(0, 3).map(l => fmtDate(l.scheduled_at)).join(", ")}
                </div>
              </div>
              <Link href={`/classes/${id}/schedule`}
                className="text-[12px] px-3 py-1.5 rounded shrink-0"
                style={{ color: "#9090d8", background: "#2a2040", border: "0.5px solid #4a3a70" }}>
                View schedule →
              </Link>
            </div>
          )}

          {/* Next lesson + Pending feedback — side by side */}
          <div className="grid grid-cols-2 gap-3">

            {/* Next lesson */}
            <div className="rounded-xl overflow-hidden"
              style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}>
              <div className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: "0.5px solid #2a2820" }}>
                <div className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--color-ss-text-muted)" }}>
                  Next lesson
                </div>
                <Link href={`/classes/${id}/schedule`} className="text-[11px]" style={{ color: "#7a6a40" }}>
                  View schedule →
                </Link>
              </div>
              <div className="px-4 py-4">
                {nextLesson ? (
                  <>
                    <div className="text-[17px] font-medium mb-0.5" style={{ color: "#e8d5b0" }}>
                      {fmtDate(nextLesson.scheduled_at)}
                    </div>
                    <div className="text-[13px] mb-3" style={{ color: "#9a8060" }}>
                      {fmtTime(nextLesson.scheduled_at)} · {nextLesson.duration_hours}h
                    </div>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded"
                      style={{ background: "#2a2318", color: "#c8a050", border: "0.5px solid #4a3a18" }}>
                      {timeUntil(nextLesson.scheduled_at)}
                    </span>
                  </>
                ) : (
                  <div className="text-[13px]" style={{ color: "var(--color-ss-text-ghost)" }}>No upcoming lessons scheduled.</div>
                )}
              </div>
            </div>

            {/* Pending feedback */}
            <div className="rounded-xl overflow-hidden"
              style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}>
              <div className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: "0.5px solid #2a2820" }}>
                <div className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--color-ss-text-muted)" }}>
                  Pending feedback
                </div>
                <Link href={`/classes/${id}/homework`} className="text-[11px]" style={{ color: "#7a6a40" }}>
                  View homework →
                </Link>
              </div>
              <div>
                {pendingFeedbackSubs.length === 0 ? (
                  <div className="px-4 py-4 text-[13px]" style={{ color: "var(--color-ss-text-ghost)" }}>
                    All submissions reviewed.
                  </div>
                ) : (
                  pendingFeedbackSubs.slice(0, 4).map((sub, i) => {
                    const hw = allHomework.find(h => h.id === sub.homework_id);
                    return (
                      <div key={sub.id} className="flex items-center gap-3 px-4 py-2.5"
                        style={{ borderBottom: i < Math.min(pendingFeedbackSubs.length, 4) - 1 ? "0.5px solid #252320" : "none" }}>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-medium truncate" style={{ color: "#c8b890" }}>
                            {hw?.title ?? "Homework"}
                          </div>
                          <div className="text-[10px] mt-0.5" style={{ color: "#5a5248" }}>
                            {studentName(sub.student_id)} · {fmtDatetime(sub.created_at)}
                          </div>
                        </div>
                        <Link href={`/classes/${id}/homework/${sub.homework_id}`}
                          className="text-[10px] px-2 py-0.5 rounded shrink-0"
                          style={{ color: "#c8a050", background: "#2a2010", border: "0.5px solid #4a3010" }}>
                          Review →
                        </Link>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Homework analytics — per assignment + per student */}
          <div className="grid grid-cols-2 gap-3">

            {/* Per assignment */}
            <div className="rounded-xl overflow-hidden"
              style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}>
              <div className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: "0.5px solid #2a2820" }}>
                <div className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--color-ss-text-muted)" }}>
                  Per assignment
                </div>
                <Link href={`/classes/${id}/homework`} className="text-[11px]" style={{ color: "#7a6a40" }}>View all →</Link>
              </div>
              <div className="px-4 py-3">
                {allHomework.length === 0 ? (
                  <div className="text-[12px]" style={{ color: "var(--color-ss-text-ghost)" }}>No homework posted yet.</div>
                ) : allHomework.map(hw => {
                  const subs = allSubmissions.filter(s => s.homework_id === hw.id);
                  const withFeedback = subs.filter(s => s.grade).length;
                  const submitted = subs.filter(s => !s.grade).length;
                  const total = studentIds.length;
                  const isPast = new Date(hw.deadline) < now;
                  const overdue = isPast ? Math.max(0, total - subs.length) : 0;
                  const pending = !isPast ? Math.max(0, total - subs.length) : 0;
                  const feedbackPct = total > 0 ? (withFeedback / total) * 100 : 0;
                  const submittedPct = total > 0 ? (submitted / total) * 100 : 0;
                  const overduePct = total > 0 ? (overdue / total) * 100 : 0;
                  const pendingPct = total > 0 ? (pending / total) * 100 : 0;
                  return (
                    <div key={hw.id} className="flex items-center gap-2 mb-2">
                      <div className="text-[11px] truncate shrink-0" style={{ color: "#8a8070", width: "100px" }}>{hw.title}</div>
                      <div className="flex-1 h-[12px] rounded overflow-hidden flex" style={{ background: "#17150f" }}>
                        <div style={{ width: `${feedbackPct}%`, background: "#103028" }} />
                        <div style={{ width: `${submittedPct}%`, background: "#1a4030" }} />
                        <div style={{ width: `${pendingPct}%`, background: "#3a2e10" }} />
                        <div style={{ width: `${overduePct}%`, background: "#3a1010" }} />
                      </div>
                      <div className="text-[10px] shrink-0" style={{ color: "#4a4438", minWidth: "20px", textAlign: "right" }}>{total}</div>
                    </div>
                  );
                })}
                <div className="flex gap-3 mt-3 flex-wrap">
                  {[["#103028", "Feedback given"], ["#1a4030", "Submitted"], ["#3a2e10", "Pending"], ["#3a1010", "Past due"]].map(([c, l]) => (
                    <div key={l} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-sm" style={{ background: c }} />
                      <div className="text-[9px]" style={{ color: "#5a5248" }}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Per student */}
            <div className="rounded-xl overflow-hidden"
              style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}>
              <div className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: "0.5px solid #2a2820" }}>
                <div className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--color-ss-text-muted)" }}>
                  Per student
                </div>
              </div>
              <div className="px-4 py-3">
                {studentIds.length === 0 ? (
                  <div className="text-[12px]" style={{ color: "var(--color-ss-text-ghost)" }}>No students in this class yet.</div>
                ) : studentIds.map(sid => {
                  const mySubs = allSubmissions.filter(s => s.student_id === sid);
                  const total = allHomework.length;
                  const withFeedback = mySubs.filter(s => s.grade).length;
                  const submitted = mySubs.filter(s => !s.grade).length;
                  const overdue = allHomework.filter(h => new Date(h.deadline) < now && !mySubs.some(s => s.homework_id === h.id)).length;
                  const pending = allHomework.filter(h => new Date(h.deadline) >= now && !mySubs.some(s => s.homework_id === h.id)).length;
                  const feedbackPct = total > 0 ? (withFeedback / total) * 100 : 0;
                  const submittedPct = total > 0 ? (submitted / total) * 100 : 0;
                  const overduePct = total > 0 ? (overdue / total) * 100 : 0;
                  const pendingPct = total > 0 ? (pending / total) * 100 : 0;
                  return (
                    <div key={sid} className="flex items-center gap-2 mb-2">
                      <div className="text-[11px] truncate shrink-0" style={{ color: "#8a8070", width: "80px" }}>{studentName(sid)}</div>
                      <div className="flex-1 h-[12px] rounded overflow-hidden flex" style={{ background: "#17150f" }}>
                        <div style={{ width: `${feedbackPct}%`, background: "#103028" }} />
                        <div style={{ width: `${submittedPct}%`, background: "#1a4030" }} />
                        <div style={{ width: `${pendingPct}%`, background: "#3a2e10" }} />
                        <div style={{ width: `${overduePct}%`, background: "#3a1010" }} />
                      </div>
                      <div className="text-[10px] shrink-0" style={{ color: "#4a4438", minWidth: "20px", textAlign: "right" }}>{total}</div>
                    </div>
                  );
                })}
                {studentIds.length > 0 && (
                  <div className="flex gap-3 mt-3 flex-wrap">
                    {[["#103028", "Feedback given"], ["#1a4030", "Submitted"], ["#3a2e10", "Pending"], ["#3a1010", "Past due"]].map(([c, l]) => (
                      <div key={l} className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-sm" style={{ background: c }} />
                        <div className="text-[9px]" style={{ color: "#5a5248" }}>{l}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ==================== STUDENT VIEW ==================== */}
      {!isTutor && (
        <>
          {/* Stat row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: "Attendance",
                value: myTotalLessons > 0 ? `${Math.round((completedLessons.length / myTotalLessons) * 100)}%` : "—",
                sub: `${completedLessons.length} of ${myTotalLessons} lessons`,
              },
              {
                label: "Hours learned",
                value: totalHours,
                sub: "completed",
              },
              {
                label: "Homework done",
                value: `${myHwSubmitted.length}/${hwTotal}`,
                sub: `${myHwPending.length} still open`,
              },
            ].map((s: any) => (
              <div key={s.label} className="rounded-lg p-4"
                style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}>
                <div className="text-[11px] mb-1" style={{ color: "var(--color-ss-text-faint)" }}>{s.label}</div>
                <div className="text-[22px] font-medium" style={{ color: "var(--color-ss-text-primary)" }}>{s.value}</div>
                <div className="text-[10px] mt-1" style={{ color: "var(--color-ss-text-ghost)" }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Next lesson + Active homework */}
          <div className="grid grid-cols-2 gap-3">

            {/* Next lesson */}
            <div className="rounded-xl overflow-hidden"
              style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}>
              <div className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: "0.5px solid #2a2820" }}>
                <div className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--color-ss-text-muted)" }}>
                  Next lesson
                </div>
                <Link href={`/classes/${id}/schedule`} className="text-[11px]" style={{ color: "#7a6a40" }}>View schedule →</Link>
              </div>
              <div className="px-4 py-4">
                {nextLesson ? (
                  <>
                    <div className="text-[17px] font-medium mb-0.5" style={{ color: "#e8d5b0" }}>{fmtDate(nextLesson.scheduled_at)}</div>
                    <div className="text-[13px] mb-3" style={{ color: "#9a8060" }}>{fmtTime(nextLesson.scheduled_at)} · {nextLesson.duration_hours}h</div>
                    <span className="text-[11px] font-medium px-2 py-1 rounded"
                      style={{ background: "#2a2318", color: "#c8a050", border: "0.5px solid #4a3a18" }}>
                      {timeUntil(nextLesson.scheduled_at)}
                    </span>
                  </>
                ) : (
                  <div className="text-[13px]" style={{ color: "var(--color-ss-text-ghost)" }}>No upcoming lessons scheduled.</div>
                )}
              </div>
            </div>

            {/* Active homework */}
            <div className="rounded-xl overflow-hidden"
              style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}>
              <div className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: "0.5px solid #2a2820" }}>
                <div className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--color-ss-text-muted)" }}>
                  Active homework
                </div>
                <Link href={`/classes/${id}/homework`} className="text-[11px]" style={{ color: "#7a6a40" }}>View all →</Link>
              </div>
              {activeHw.length === 0 ? (
                <div className="px-4 py-4 text-[13px]" style={{ color: "var(--color-ss-text-ghost)" }}>No active homework.</div>
              ) : activeHw.slice(0, 4).map((hw, i) => {
                const sub = mySubmissions.find(s => s.homework_id === hw.id);
                const isToday = new Date(hw.deadline).toDateString() === now.toDateString();
                const isSoon = !isToday && (new Date(hw.deadline).getTime() - now.getTime()) < 1000 * 60 * 60 * 72;
                return (
                  <div key={hw.id} className="flex items-center gap-2.5 px-4 py-2.5"
                    style={{ borderBottom: i < Math.min(activeHw.length, 4) - 1 ? "0.5px solid #252320" : "none",
                      background: isToday && !sub ? "#1a100a" : "transparent" }}>
                    <div className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: sub ? "#40a870" : isToday ? "#e07040" : isSoon ? "#c87a30" : "#6a6050" }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] truncate" style={{ color: "#c8b890" }}>{hw.title}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: "var(--color-ss-text-ghost)" }}>
                        {sub ? "Submitted" : `Due ${fmtDate(hw.deadline)}`}
                      </div>
                    </div>
                    {isToday && !sub && (
                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded shrink-0"
                        style={{ background: "#2a1a0a", color: "#e07040", border: "0.5px solid #7a3818" }}>urgent</span>
                    )}
                    {sub && (
                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded shrink-0"
                        style={{ background: "#10201a", color: "#40a870", border: "0.5px solid #1a4030" }}>done</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Homework breakdown + Recent feedback */}
          <div className="grid grid-cols-2 gap-3">

            {/* Homework breakdown */}
            <div className="rounded-xl overflow-hidden"
              style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}>
              <div className="px-4 py-3" style={{ borderBottom: "0.5px solid #2a2820" }}>
                <div className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--color-ss-text-muted)" }}>
                  Homework breakdown
                </div>
              </div>
              <div className="px-4 py-3 flex flex-col gap-2.5">
                {[
                  { label: "Feedback received", count: myHwWithFeedback.length, bg: "#103028", color: "#40a870" },
                  { label: "Pending feedback", count: myHwPendingFeedback.length, bg: "#2a2010", color: "#c87a30" },
                  { label: "Not submitted yet", count: myHwPending.length, bg: "#2a2318", color: "#9a8060" },
                  { label: "Missed (past due)", count: myHwMissed.length, bg: "#3a1010", color: "#c04040" },
                ].map(row => (
                  <div key={row.label} className="flex items-center gap-2">
                    <div className="text-[11px] shrink-0" style={{ color: "#7a7060", width: "120px" }}>{row.label}</div>
                    <div className="flex-1 h-[10px] rounded overflow-hidden" style={{ background: "#17150f" }}>
                      <div className="h-full rounded"
                        style={{ width: `${maxBarVal > 0 ? (row.count / maxBarVal) * 100 : 0}%`, background: row.bg, minWidth: row.count > 0 ? "6px" : "0" }} />
                    </div>
                    <div className="text-[11px] font-medium shrink-0" style={{ color: row.color, minWidth: "16px", textAlign: "right" }}>{row.count}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent feedback */}
            <div className="rounded-xl overflow-hidden"
              style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}>
              <div className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: "0.5px solid #2a2820" }}>
                <div className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--color-ss-text-muted)" }}>
                  Recent feedback
                </div>
                <Link href={`/classes/${id}/homework`} className="text-[11px]" style={{ color: "#7a6a40" }}>View homework →</Link>
              </div>
              <div className="px-4 py-3">
                {recentFeedback.length === 0 ? (
                  <div className="text-[12px]" style={{ color: "var(--color-ss-text-ghost)" }}>No feedback received yet.</div>
                ) : recentFeedback.map((sub, i) => {
                  const hw = allHomework.find(h => h.id === sub.homework_id);
                  return (
                    <div key={sub.id} className="rounded-md p-2.5 mb-2"
                      style={{ background: "#17150f", border: "0.5px solid #2a2820" }}>
                      <div className="text-[10px] mb-1" style={{ color: "#5a5248" }}>{hw?.title ?? "Homework"}</div>
                      <div className="text-[12px]" style={{ color: "#a0c890" }}>{sub.grade}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}