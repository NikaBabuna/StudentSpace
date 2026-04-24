"use client";

import { useState, useMemo } from "react";

const GEL_RATES: Record<string, number> = { GEL: 1, USD: 0.037, EUR: 0.034, RUB: 3.4 };
const TO_GEL: Record<string, number> = { GEL: 1, USD: 27, EUR: 29.5, RUB: 0.3 };
const SYMS: Record<string, string> = { GEL: "₾", USD: "$", EUR: "€", RUB: "₽" };

type Range = "week" | "month" | "year" | "all";
type Tab = "tutor" | "student" | "parent";

function rangeStart(r: Range): Date | null {
  const now = new Date();
  if (r === "week") return new Date(now.getTime() - 7 * 86400000);
  if (r === "month") return new Date(now.getTime() - 30 * 86400000);
  if (r === "year") return new Date(now.getTime() - 365 * 86400000);
  return null;
}

function convert(amount: number, from: string, to: string) {
  return amount * TO_GEL[from] * GEL_RATES[to];
}

function Card({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl overflow-hidden"
      style={{ background: "#201e18", border: `0.5px solid ${open ? "#6a5530" : "#3a3630"}` }}>
      <div className="flex items-center justify-between px-4 py-3.5 cursor-pointer"
        style={{ borderBottom: open ? "0.5px solid #2a2820" : "none" }}
        onClick={() => setOpen(o => !o)}>
        <div className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "#9a8060" }}>
          {title}
        </div>
        <span style={{
          color: "#5a5248", fontSize: 13, display: "inline-block",
          transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s",
        }}>›</span>
      </div>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

function StatRow({ stats }: { stats: { label: string; value: string | number; sub?: string; color?: string }[] }) {
  return (
    <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0,1fr))` }}>
      {stats.map(s => (
        <div key={s.label} className="rounded-lg p-4"
          style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}>
          <div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: "var(--color-ss-text-faint)" }}>
            {s.label}
          </div>
          <div className="text-[22px] font-medium" style={{ color: s.color ?? "var(--color-ss-text-primary)" }}>
            {s.value}
          </div>
          {s.sub && <div className="text-[10px] mt-1" style={{ color: "var(--color-ss-text-ghost)" }}>{s.sub}</div>}
        </div>
      ))}
    </div>
  );
}

function BarChart({ data, max }: { data: { label: string; value: number; color?: string }[]; max: number }) {
  return (
    <div className="flex flex-col gap-2">
      {data.map(d => {
        const pct = max > 0 ? (d.value / max) * 100 : 0;
        return (
          <div key={d.label} className="flex items-center gap-2">
            <div className="text-[11px] truncate shrink-0" style={{ color: "#8a8070", width: 100 }}>{d.label}</div>
            <div className="flex-1 h-[10px] rounded overflow-hidden" style={{ background: "#17150f" }}>
              <div className="h-full rounded" style={{ width: `${pct}%`, background: d.color ?? "#1a4030", minWidth: pct > 0 ? 4 : 0 }} />
            </div>
            <div className="text-[11px] shrink-0 text-right" style={{ color: "#6a6050", minWidth: 32 }}>
              {typeof d.value === "number" && d.value % 1 !== 0 ? d.value.toFixed(1) : d.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StackedBar({ label, segments, total }: { label: string; segments: { pct: number; color: string }[]; total: number | string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-[11px] truncate shrink-0" style={{ color: "#8a8070", width: 100 }}>{label}</div>
      <div className="flex-1 h-[10px] rounded overflow-hidden flex" style={{ background: "#17150f" }}>
        {segments.map((s, i) => <div key={i} style={{ width: `${s.pct}%`, background: s.color }} />)}
      </div>
      <div className="text-[11px] shrink-0 text-right" style={{ color: "#6a6050", minWidth: 32 }}>{total}</div>
    </div>
  );
}

function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-3 mt-3">
      {items.map(i => (
        <div key={i.label} className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-sm shrink-0" style={{ background: i.color }} />
          <div className="text-[9px]" style={{ color: "#5a5248" }}>{i.label}</div>
        </div>
      ))}
    </div>
  );
}

// Per-child stats block used in parent view
function ChildBlock({ name, stats, classStats, now }: { name: string; stats: any; classStats: any[]; now: Date }) {
  const hwLegend = [
    { color: "#103028", label: "Feedback received" },
    { color: "#1a4030", label: "Submitted" },
    { color: "#3a2e10", label: "Pending" },
    { color: "#3a1010", label: "Missed" },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Child name header */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium shrink-0"
          style={{ background: "#2a2318", border: "1px solid #4a3a18", color: "#c8a050" }}>
          {name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}
        </div>
        <div className="text-[14px] font-medium" style={{ color: "#d8c8a0" }}>{name}</div>
      </div>

      <StatRow stats={[
        { label: "Attendance", value: stats.concluded > 0 ? `${stats.attendance}%` : "—", sub: `${stats.comp} of ${stats.concluded} lessons`, color: stats.attendance >= 85 ? "#40a870" : stats.attendance >= 70 ? "#c8a050" : "#c04040" },
        { label: "Hours learned", value: stats.hours, sub: "completed" },
        { label: "Homework done", value: stats.hwDone, sub: `${stats.hwTotal} total` },
        { label: "Feedback received", value: stats.feedback, sub: `${stats.hwDone - stats.feedback} pending` },
      ]} />

      <Card title="Homework breakdown per class">
        <div className="flex flex-col gap-2">
          {classStats.map(cls => (
            <StackedBar key={cls.id} label={cls.title} total={cls.hwTotal} segments={[
              { pct: (cls.withFeedback / cls.hwTotal) * 100, color: "#103028" },
              { pct: (cls.submitted / cls.hwTotal) * 100, color: "#1a4030" },
              { pct: (cls.pending / cls.hwTotal) * 100, color: "#3a2e10" },
              { pct: (cls.missed / cls.hwTotal) * 100, color: "#3a1010" },
            ]} />
          ))}
        </div>
        <Legend items={hwLegend} />
      </Card>

      <Card title="Attendance per class">
        <BarChart
          data={classStats.map(cls => ({
            label: cls.title,
            value: cls.attendance,
            color: cls.attendance >= 85 ? "#103028" : cls.attendance >= 70 ? "#3a2e10" : "#3a1010",
          }))}
          max={100}
        />
      </Card>
    </div>
  );
}

export default function AnalyticsClient({
  userId, tutorClasses, studentClasses, parentChildren,
  lessons, homework, submissions, cycles, classMembers,
}: {
  userId: string;
  tutorClasses: any[];
  studentClasses: any[];
  parentChildren: { id: string; full_name: string; sharedClassIds: string[] }[];
  lessons: any[];
  homework: any[];
  submissions: any[];
  cycles: any[];
  classMembers: any[];
}) {
  const defaultTab: Tab = tutorClasses.length > 0 ? "tutor" : studentClasses.length > 0 ? "student" : parentChildren.length > 0 ? "parent" : "tutor";
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [range, setRange] = useState<Range>("month");
  const [currency, setCurrency] = useState("GEL");

  const start = useMemo(() => rangeStart(range), [range]);
  const now = new Date();

  function inRange(dateStr: string) {
    if (!start) return true;
    return new Date(dateStr) >= start;
  }

  const ranges: { label: string; value: Range }[] = [
    { label: "Week", value: "week" },
    { label: "Month", value: "month" },
    { label: "Year", value: "year" },
    { label: "All time", value: "all" },
  ];

  const tabs: { value: Tab; label: string }[] = [
    ...(tutorClasses.length > 0 ? [{ value: "tutor" as Tab, label: "Tutor" }] : []),
    ...(studentClasses.length > 0 ? [{ value: "student" as Tab, label: "Student" }] : []),
    ...(parentChildren.length > 0 ? [{ value: "parent" as Tab, label: "Parent" }] : []),
  ];

  // ── TUTOR ──────────────────────────────────────────────────────────────────

  const tutorClassIds = tutorClasses.map(c => c.id);
  const tLessons = lessons.filter(l => tutorClassIds.includes(l.class_id) && inRange(l.scheduled_at));
  const tHw = homework.filter(h => tutorClassIds.includes(h.class_id) && inRange(h.deadline));
  const tHwIds = tHw.map(h => h.id);
  const tSubs = submissions.filter(s => tHwIds.includes(s.homework_id));

  const tTotalHours = tLessons.filter(l => l.status === "completed").reduce((s, l) => s + (l.duration_hours ?? 0), 0);
  const tCompleted = tLessons.filter(l => l.status === "completed").length;
  const tMissed = tLessons.filter(l => l.status === "missed").length;
  const tConcluded = tCompleted + tMissed;
  const tMissedRate = tConcluded > 0 ? Math.round((tMissed / tConcluded) * 100) : 0;
  const tPendingFeedback = tSubs.filter(s => !s.grade).length;

  const tutorClassStats = tutorClasses.map(cls => {
    const cl = tLessons.filter(l => l.class_id === cls.id);
    const ch = tHw.filter(h => h.class_id === cls.id);
    const chIds = ch.map(h => h.id);
    const cs = tSubs.filter(s => chIds.includes(s.homework_id));
    const students = classMembers.filter(m => m.class_id === cls.id && m.role === "student");
    const total = students.length;
    const comp = cl.filter(l => l.status === "completed").length;
    const miss = cl.filter(l => l.status === "missed").length;
    const concluded = comp + miss;
    const withFeedback = cs.filter(s => s.grade).length;
    const submitted = cs.filter(s => !s.grade).length;
    const isPast = (h: any) => new Date(h.deadline) < now;
    const overdue = ch.filter(h => isPast(h) && !cs.some(s => s.homework_id === h.id)).length;
    const pending = ch.filter(h => !isPast(h) && !cs.some(s => s.homework_id === h.id)).length;
    const hwTotal = total * ch.length || 1;
    const cls_cycles = cycles.filter(c => c.class_id === cls.id);
    const openCycle = cls_cycles.find(c => !c.closed_at);
    const cycleHours = openCycle
      ? lessons.filter(l => l.class_id === cls.id && l.payment_cycle_id === openCycle.id && l.status === "completed")
          .reduce((s: number, l: any) => s + (l.duration_hours ?? 0), 0)
      : 0;
    return {
      id: cls.id, title: cls.title,
      comp, miss, concluded,
      missedRate: concluded > 0 ? Math.round((miss / concluded) * 100) : 0,
      attendance: total > 0 && concluded > 0 ? Math.round((comp / concluded) * 100) : 0,
      withFeedback, submitted, overdue, pending, hwTotal,
      cycleHours, cycleTarget: cls.cycle_hours ?? 8,
    };
  });

  const earningsRows = cycles.map(c => {
    const cls = tutorClasses.find(t => t.id === c.class_id);
    const amt = c.payment_amount ?? 0;
    const cur = c.payment_currency ?? "GEL";
    const converted = convert(amt, cur, currency);
    return {
      classTitle: cls?.title ?? "Unknown",
      cycle: c.cycle_number,
      native: amt, nativeCur: cur, converted,
      status: c.paid_at ? "paid" : c.closed_at ? "closed" : "progress",
      hours: lessons.filter(l => l.class_id === c.class_id && l.payment_cycle_id === c.id && l.status === "completed")
        .reduce((s: number, l: any) => s + (l.duration_hours ?? 0), 0),
    };
  });

  const sym = SYMS[currency];
  const totalEarned = earningsRows.filter(r => r.status === "paid").reduce((s, r) => s + r.converted, 0);
  const inProgress = earningsRows.filter(r => r.status === "progress").reduce((s, r) => s + r.converted, 0);
  const totalHoursForRate = earningsRows.filter(r => r.status === "paid").reduce((s, r) => s + r.hours, 0);
  const hourlyRate = totalHoursForRate > 0 ? (totalEarned / totalHoursForRate).toFixed(1) : "—";

  // ── STUDENT ────────────────────────────────────────────────────────────────

  const studentClassIds = studentClasses.map(c => c.id);
  const sLessons = lessons.filter(l => studentClassIds.includes(l.class_id) && inRange(l.scheduled_at));
  const sHw = homework.filter(h => studentClassIds.includes(h.class_id) && inRange(h.deadline));
  const sHwIds = sHw.map(h => h.id);
  const mySubs = submissions.filter(s => sHwIds.includes(s.homework_id) && s.student_id === userId);

  const sComp = sLessons.filter(l => l.status === "completed").length;
  const sMiss = sLessons.filter(l => l.status === "missed").length;
  const sConcluded = sComp + sMiss;
  const sAttendance = sConcluded > 0 ? Math.round((sComp / sConcluded) * 100) : 0;
  const sHours = sLessons.filter(l => l.status === "completed").reduce((s, l) => s + (l.duration_hours ?? 0), 0);
  const sHwDone = mySubs.length;
  const sFeedback = mySubs.filter(s => s.grade).length;

  const studentClassStats = studentClasses.map(cls => {
    const cl = sLessons.filter(l => l.class_id === cls.id);
    const ch = sHw.filter(h => h.class_id === cls.id);
    const chIds = ch.map(h => h.id);
    const cs = mySubs.filter(s => chIds.includes(s.homework_id));
    const comp = cl.filter(l => l.status === "completed").length;
    const miss = cl.filter(l => l.status === "missed").length;
    const concluded = comp + miss;
    const withFeedback = cs.filter(s => s.grade).length;
    const submitted = cs.filter(s => !s.grade).length;
    const isPast = (h: any) => new Date(h.deadline) < now;
    const missed = ch.filter(h => isPast(h) && !cs.some(s => s.homework_id === h.id)).length;
    const pending = ch.filter(h => !isPast(h) && !cs.some(s => s.homework_id === h.id)).length;
    const hwTotal = ch.length || 1;
    return {
      id: cls.id, title: cls.title,
      attendance: concluded > 0 ? Math.round((comp / concluded) * 100) : 0,
      withFeedback, submitted, missed, pending, hwTotal,
    };
  });

  // ── PARENT ─────────────────────────────────────────────────────────────────

  // For each child, compute stats only for shared classes
  const childrenStats = parentChildren.map(child => {
    const sharedIds = child.sharedClassIds;
    const cLessons = lessons.filter(l => sharedIds.includes(l.class_id) && inRange(l.scheduled_at));
    const cHw = homework.filter(h => sharedIds.includes(h.class_id) && inRange(h.deadline));
    const cHwIds = cHw.map(h => h.id);
    const cSubs = submissions.filter(s => cHwIds.includes(s.homework_id) && s.student_id === child.id);

    const comp = cLessons.filter(l => l.status === "completed").length;
    const miss = cLessons.filter(l => l.status === "missed").length;
    const concluded = comp + miss;
    const hours = cLessons.filter(l => l.status === "completed").reduce((s, l) => s + (l.duration_hours ?? 0), 0);
    const hwDone = cSubs.length;
    const feedback = cSubs.filter(s => s.grade).length;
    const attendance = concluded > 0 ? Math.round((comp / concluded) * 100) : 0;

    const classStats = sharedIds.map(clsId => {
      const cls = [...tutorClasses, ...studentClasses].find(c => c.id === clsId) ??
        { id: clsId, title: "Unknown" };
      const cl = cLessons.filter(l => l.class_id === clsId);
      const ch = cHw.filter(h => h.class_id === clsId);
      const chIds = ch.map(h => h.id);
      const cs = cSubs.filter(s => chIds.includes(s.homework_id));
      const c = cl.filter(l => l.status === "completed").length;
      const m = cl.filter(l => l.status === "missed").length;
      const conc = c + m;
      const isPast = (h: any) => new Date(h.deadline) < now;
      return {
        id: clsId, title: cls.title,
        attendance: conc > 0 ? Math.round((c / conc) * 100) : 0,
        withFeedback: cs.filter(s => s.grade).length,
        submitted: cs.filter(s => !s.grade).length,
        missed: ch.filter(h => isPast(h) && !cs.some(s => s.homework_id === h.id)).length,
        pending: ch.filter(h => !isPast(h) && !cs.some(s => s.homework_id === h.id)).length,
        hwTotal: ch.length || 1,
      };
    });

    return {
      id: child.id,
      name: child.full_name,
      stats: { comp, miss, concluded, hours, hwDone, feedback, attendance, hwTotal: cHw.length },
      classStats,
    };
  });

  const hwLegend = [
    { color: "#103028", label: "Feedback given" },
    { color: "#1a4030", label: "Submitted" },
    { color: "#3a2e10", label: "Pending" },
    { color: "#3a1010", label: "Past due" },
  ];

  const tabSubtitle: Record<Tab, string> = {
    tutor: "Performance across all classes you teach",
    student: "Your progress across all classes you attend",
    parent: "Your children's progress in shared classes",
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="shrink-0" style={{ borderBottom: "0.5px solid var(--color-ss-border)" }}>
        <div className="px-6 pt-5 pb-0 flex items-center justify-between">
          <div>
            <h1 className="text-[16px] font-medium" style={{ color: "var(--color-ss-text-primary)" }}>Analytics</h1>
            <p className="text-[11px] mt-0.5" style={{ color: "#5a5248" }}>{tabSubtitle[tab]}</p>
          </div>
          <div className="flex gap-0 rounded-lg p-0.5" style={{ background: "#17150f", border: "0.5px solid #3a3630" }}>
            {ranges.map(r => (
              <button key={r.value} onClick={() => setRange(r.value)}
                className="text-[11px] px-3 py-1 rounded-md"
                style={{
                  background: range === r.value ? "#2a2318" : "transparent",
                  color: range === r.value ? "#c8a050" : "#6a6050",
                  border: range === r.value ? "0.5px solid #4a3a18" : "none",
                  fontFamily: "inherit", cursor: "pointer",
                }}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-0 px-6 mt-3">
          {tabs.map(t => (
            <button key={t.value} onClick={() => setTab(t.value)}
              className="text-[13px] px-4 py-2.5"
              style={{
                color: tab === t.value ? "var(--color-ss-amber-light)" : "var(--color-ss-text-muted)",
                borderBottom: tab === t.value ? "2px solid var(--color-ss-amber-light)" : "2px solid transparent",
                background: "transparent", fontFamily: "inherit", cursor: "pointer", marginBottom: -1,
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 flex flex-col gap-4">

        {/* ── TUTOR ── */}
{tab === "tutor" && (
  tutorClasses.length === 0 ? (
    <div className="text-center py-12 text-[13px]" style={{ color: "#4a4438" }}>
      No classes yet — create a class or get invited as a tutor to see analytics here.
    </div>
  ) : (
    <>
      <StatRow stats={[
        { label: "Total hours", value: tTotalHours, sub: "completed" },
        { label: "Total lessons", value: tCompleted, sub: `${tMissed} missed` },
        { label: "Missed rate", value: tConcluded > 0 ? `${tMissedRate}%` : "—", sub: `${tMissed} of ${tConcluded} concluded`, color: tMissedRate === 0 ? "#40a870" : tMissedRate <= 15 ? "#c8a050" : "#c04040" },
        { label: "Pending feedback", value: tPendingFeedback, sub: "submissions", color: tPendingFeedback > 0 ? "#c8a050" : "#40a870" },
      ]} />
      <Card title="Homework completion per class">
        <div className="flex flex-col gap-2">
          {tutorClassStats.map(cls => {
            const t = cls.hwTotal;
            return (
              <StackedBar key={cls.id} label={cls.title} total={t} segments={[
                { pct: t > 0 ? (cls.withFeedback / t) * 100 : 0, color: "#103028" },
                { pct: t > 0 ? (cls.submitted / t) * 100 : 0, color: "#1a4030" },
                { pct: t > 0 ? (cls.pending / t) * 100 : 0, color: "#3a2e10" },
                { pct: t > 0 ? (cls.overdue / t) * 100 : 0, color: "#3a1010" },
              ]} />
            );
          })}
        </div>
        <Legend items={hwLegend} />
      </Card>
      <Card title="Mean attendance per class">
        <BarChart data={tutorClassStats.map(cls => ({ label: cls.title, value: cls.attendance, color: cls.attendance >= 85 ? "#103028" : cls.attendance >= 70 ? "#3a2e10" : "#3a1010" }))} max={100} />
      </Card>
      <Card title="Missed lesson % per class">
        <BarChart data={tutorClassStats.map(cls => ({ label: cls.title, value: cls.missedRate, color: cls.missedRate === 0 ? "#103028" : cls.missedRate <= 15 ? "#3a2e10" : "#3a1010" }))} max={100} />
      </Card>
      <Card title="Payment cycle hours per class">
        <div className="flex flex-col gap-2">
          {tutorClassStats.map(cls => (
            <StackedBar key={cls.id} label={cls.title}
              total={`${cls.cycleHours}/${cls.cycleTarget}h` as any}
              segments={[
                { pct: Math.min((cls.cycleHours / cls.cycleTarget) * 100, 100), color: "#1a3a5c" },
                { pct: Math.max(((cls.cycleTarget - cls.cycleHours) / cls.cycleTarget) * 100, 0), color: "#2a2820" },
              ]}
            />
          ))}
        </div>
        <Legend items={[{ color: "#1a3a5c", label: "Completed" }, { color: "#2a2820", label: "Remaining" }]} />
      </Card>
      <Card title="Earnings">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11px]" style={{ color: "#6a6050" }}>Display currency</span>
          <select value={currency} onChange={e => setCurrency(e.target.value)}
            className="rounded-md text-[11px] px-2 py-1 outline-none"
            style={{ background: "#17150f", border: "0.5px solid #3a3630", color: "#c8a050", fontFamily: "inherit" }}>
            <option value="GEL">GEL — Georgian Lari</option>
            <option value="USD">USD — US Dollar</option>
            <option value="EUR">EUR — Euro</option>
            <option value="RUB">RUB — Russian Ruble</option>
          </select>
        </div>
        <div className="rounded-lg overflow-hidden" style={{ border: "0.5px solid #2a2820" }}>
          <div className="grid text-[10px] uppercase tracking-wider px-3 py-2"
            style={{ gridTemplateColumns: "1fr 60px 80px 80px 80px", color: "#4a4438", borderBottom: "0.5px solid #2a2820" }}>
            <div>Class</div><div>Cycle</div><div>Native</div><div>Converted</div><div>Status</div>
          </div>
          {earningsRows.length === 0 ? (
            <div className="px-3 py-3 text-[12px]" style={{ color: "#4a4438" }}>No payment cycles yet.</div>
          ) : earningsRows.map((r, i) => (
            <div key={i} className="grid items-center px-3 py-2.5"
              style={{ gridTemplateColumns: "1fr 60px 80px 80px 80px", borderBottom: i < earningsRows.length - 1 ? "0.5px solid #1e1c16" : "none" }}>
              <div className="text-[12px] truncate" style={{ color: "#c8b890" }}>{r.classTitle}</div>
              <div className="text-[11px]" style={{ color: "#5a5248" }}>#{r.cycle}</div>
              <div className="text-[11px]" style={{ color: "#7a7060" }}>{r.native} {r.nativeCur}</div>
              <div className="text-[11px]" style={{ color: "#c8a050" }}>{sym}{Math.round(r.converted)}</div>
              <div>
                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded"
                  style={r.status === "paid" ? { background: "#10201a", color: "#40a870", border: "0.5px solid #1a4030" }
                    : r.status === "closed" ? { background: "#1a1828", color: "#9090d8", border: "0.5px solid #3a3060" }
                    : { background: "#2a2318", color: "#c8a050", border: "0.5px solid #4a3a18" }}>
                  {r.status === "paid" ? "Paid" : r.status === "closed" ? "Closed" : "In progress"}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4" style={{ borderTop: "0.5px solid #2a2820" }}>
          {[
            { label: "Total earned", value: `${sym}${Math.round(totalEarned)}` },
            { label: "In progress (projected)", value: `${sym}${Math.round(inProgress)}`, color: "#c8a050" },
            { label: "Mean hourly rate", value: hourlyRate !== "—" ? `${sym}${hourlyRate}/h` : "—" },
          ].map(s => (
            <div key={s.label}>
              <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "#4a4438" }}>{s.label}</div>
              <div className="text-[17px] font-medium" style={{ color: (s as any).color ?? "#d8c8a0" }}>{s.value}</div>
            </div>
          ))}
        </div>
      </Card>
    </>
  )
)}

        {/* ── STUDENT ── */}
        {tab === "student" && (
          <>
            <StatRow stats={[
              { label: "Attendance", value: sConcluded > 0 ? `${sAttendance}%` : "—", sub: `${sComp} of ${sConcluded} lessons`, color: sAttendance >= 85 ? "#40a870" : sAttendance >= 70 ? "#c8a050" : "#c04040" },
              { label: "Hours learned", value: sHours, sub: "completed" },
              { label: "Homework done", value: sHwDone, sub: `${sHw.length} total` },
              { label: "Feedback received", value: sFeedback, sub: `${sHwDone - sFeedback} pending` },
            ]} />
            <Card title="Homework breakdown per class">
              <div className="flex flex-col gap-2">
                {studentClassStats.map(cls => (
                  <StackedBar key={cls.id} label={cls.title} total={cls.hwTotal} segments={[
                    { pct: (cls.withFeedback / cls.hwTotal) * 100, color: "#103028" },
                    { pct: (cls.submitted / cls.hwTotal) * 100, color: "#1a4030" },
                    { pct: (cls.pending / cls.hwTotal) * 100, color: "#3a2e10" },
                    { pct: (cls.missed / cls.hwTotal) * 100, color: "#3a1010" },
                  ]} />
                ))}
              </div>
              <Legend items={[
                { color: "#103028", label: "Feedback received" },
                { color: "#1a4030", label: "Submitted" },
                { color: "#3a2e10", label: "Pending" },
                { color: "#3a1010", label: "Missed" },
              ]} />
            </Card>
            <Card title="Attendance per class">
              <BarChart data={studentClassStats.map(cls => ({ label: cls.title, value: cls.attendance, color: cls.attendance >= 85 ? "#103028" : cls.attendance >= 70 ? "#3a2e10" : "#3a1010" }))} max={100} />
            </Card>
          </>
        )}

        {/* ── PARENT ── */}
        {tab === "parent" && (
          <>
            {childrenStats.length === 0 ? (
              <div className="text-center py-12 text-[13px]" style={{ color: "#4a4438" }}>
                No children linked yet. Go to Access & accounts to link a child.
              </div>
            ) : (
              <div className="flex flex-col gap-10">
                {childrenStats.map((child, i) => (
                  <div key={child.id}>
                    {i > 0 && <div className="mb-10" style={{ height: "0.5px", background: "#2a2820" }} />}
                    <ChildBlock name={child.name} stats={child.stats} classStats={child.classStats} now={now} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}