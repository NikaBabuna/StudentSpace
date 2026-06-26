/* =============================================================================
 * features/dashboard/components/AnalyticsClient.tsx — tutor analytics dashboard
 * -----------------------------------------------------------------------------
 * Role: Range-filtered charts and tables (week/month/year/all) for lessons,
 *       homework, earnings. Client-side aggregation from server-provided rows.
 * Dependencies: components/ui, recharts (if used), dashboard types
 * Used by: app/dashboard/analytics/page.tsx
 * Inputs: Lessons, homework, cycles, FX rates from server loader
 * Outputs: Tabbed analytics UI with date range selector
 * ========================================================================== */
"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";

import { PageContainer, PageHeader } from "@/components/shell/page-container";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { Tabs } from "@/components/ui/tabs";
import { AnalyticsIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

const DEFAULT_RATES: Record<string, number> = { GEL: 1, USD: 0.37, EUR: 0.34, RUB: 3.4 };
const SYMS: Record<string, string> = { GEL: "₾", USD: "$", EUR: "€", RUB: "₽" };

type Range = "week" | "month" | "year" | "all";
type Tab = "tutor" | "student" | "parent";
type ChartTone = "ok" | "ok-muted" | "warn" | "danger" | "accent" | "muted";

const CHART_BAR: Record<ChartTone, string> = {
  ok: "bg-ok",
  "ok-muted": "bg-ok/55",
  warn: "bg-warn",
  danger: "bg-danger",
  accent: "bg-accent",
  muted: "bg-line-2",
};

const HW_LEGEND_TUTOR = [
  { tone: "ok" as ChartTone, label: "Feedback given" },
  { tone: "ok-muted" as ChartTone, label: "Submitted" },
  { tone: "warn" as ChartTone, label: "Pending" },
  { tone: "danger" as ChartTone, label: "Past due" },
];

const HW_LEGEND_STUDENT = [
  { tone: "ok" as ChartTone, label: "Feedback received" },
  { tone: "ok-muted" as ChartTone, label: "Submitted" },
  { tone: "warn" as ChartTone, label: "Pending" },
  { tone: "danger" as ChartTone, label: "Missed" },
];

function rangeStart(r: Range): Date | null {
  const now = new Date();
  if (r === "week") return new Date(now.getTime() - 7 * 86400000);
  if (r === "month") return new Date(now.getTime() - 30 * 86400000);
  if (r === "year") return new Date(now.getTime() - 365 * 86400000);
  return null;
}

function convert(amount: number, from: string, to: string, rates: Record<string, number>) {
  const gelAmount = from === "GEL" ? amount : amount / (rates[from] ?? 1);
  return to === "GEL" ? gelAmount : gelAmount * (rates[to] ?? 1);
}

function attendanceBarTone(pct: number): ChartTone {
  if (pct >= 85) return "ok";
  if (pct >= 70) return "warn";
  return "danger";
}

function missedBarTone(pct: number): ChartTone {
  if (pct === 0) return "ok";
  if (pct <= 15) return "warn";
  return "danger";
}

function AccordionCard({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center justify-between px-5 py-3.5 text-left transition-colors hover:bg-surface-2",
          open && "border-b border-line"
        )}
      >
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted">{title}</span>
        <span
          className={cn("text-[13px] text-muted transition-transform", open && "rotate-90")}
          aria-hidden
        >
          ›
        </span>
      </button>
      {open ? <CardContent className="pt-4">{children}</CardContent> : null}
    </Card>
  );
}

function StatGrid({
  stats,
}: {
  stats: {
    label: string;
    value: string | number;
    delta?: string;
    deltaTone?: "up" | "down" | "warn" | "muted";
  }[];
}) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
      {stats.map((s) => (
        <StatCard key={s.label} label={s.label} value={s.value} delta={s.delta} deltaTone={s.deltaTone} />
      ))}
    </div>
  );
}

function BarChart({
  data,
  max,
}: {
  data: { label: string; value: number; tone?: ChartTone }[];
  max: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      {data.map((d) => {
        const pct = max > 0 ? (d.value / max) * 100 : 0;
        return (
          <div key={d.label} className="flex items-center gap-2">
            <div className="w-[100px] shrink-0 truncate text-[11px] text-muted">{d.label}</div>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-3">
              <div
                className={cn("h-full rounded-full", CHART_BAR[d.tone ?? "accent"])}
                style={{ width: `${pct}%`, minWidth: pct > 0 ? 4 : 0 }}
              />
            </div>
            <div className="min-w-[32px] shrink-0 text-right text-[11px] text-muted">
              {typeof d.value === "number" && d.value % 1 !== 0 ? d.value.toFixed(1) : d.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StackedBar({
  label,
  segments,
  total,
}: {
  label: string;
  segments: { pct: number; tone: ChartTone }[];
  total: number | string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-[100px] shrink-0 truncate text-[11px] text-muted">{label}</div>
      <div className="flex h-2.5 flex-1 overflow-hidden rounded-full bg-surface-3">
        {segments.map((s, i) =>
          s.pct > 0 ? (
            <div
              key={i}
              className={cn("h-full", CHART_BAR[s.tone])}
              style={{ width: `${s.pct}%`, minWidth: 2 }}
            />
          ) : null
        )}
      </div>
      <div className="min-w-[32px] shrink-0 text-right text-[11px] text-muted">{total}</div>
    </div>
  );
}

function Legend({ items }: { items: { tone: ChartTone; label: string }[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-3">
      {items.map((i) => (
        <div key={i.label} className="flex items-center gap-1.5">
          <div className={cn("size-2 shrink-0 rounded-sm", CHART_BAR[i.tone])} />
          <div className="text-[10px] text-muted">{i.label}</div>
        </div>
      ))}
    </div>
  );
}

function ChildBlock({
  name,
  stats,
  classStats,
}: {
  name: string;
  stats: {
    concluded: number;
    attendance: number;
    comp: number;
    hours: number;
    hwDone: number;
    hwTotal: number;
    feedback: number;
  };
  classStats: {
    id: string;
    title: string;
    hwTotal: number;
    withFeedback: number;
    submitted: number;
    pending: number;
    missed: number;
    attendance: number;
  }[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <Avatar name={name} size="sm" />
        <div className="text-[15px] font-semibold text-ink">{name}</div>
      </div>

      <StatGrid
        stats={[
          {
            label: "Attendance",
            value: stats.concluded > 0 ? `${stats.attendance}%` : "—",
            delta: `${stats.comp} of ${stats.concluded} lessons`,
            deltaTone: stats.attendance >= 85 ? "up" : stats.attendance >= 70 ? "warn" : "down",
          },
          { label: "Hours learned", value: stats.hours, delta: "completed", deltaTone: "muted" },
          { label: "Homework done", value: stats.hwDone, delta: `${stats.hwTotal} total`, deltaTone: "muted" },
          {
            label: "Feedback received",
            value: stats.feedback,
            delta: `${stats.hwDone - stats.feedback} pending`,
            deltaTone: "muted",
          },
        ]}
      />

      <AccordionCard title="Homework breakdown per class">
        <div className="flex flex-col gap-2">
          {classStats.map((cls) => (
            <StackedBar
              key={cls.id}
              label={cls.title}
              total={cls.hwTotal}
              segments={[
                { pct: (cls.withFeedback / cls.hwTotal) * 100, tone: "ok" },
                { pct: (cls.submitted / cls.hwTotal) * 100, tone: "ok-muted" },
                { pct: (cls.pending / cls.hwTotal) * 100, tone: "warn" },
                { pct: (cls.missed / cls.hwTotal) * 100, tone: "danger" },
              ]}
            />
          ))}
        </div>
        <Legend items={HW_LEGEND_STUDENT} />
      </AccordionCard>

      <AccordionCard title="Attendance per class">
        <BarChart
          data={classStats.map((cls) => ({
            label: cls.title,
            value: cls.attendance,
            tone: attendanceBarTone(cls.attendance),
          }))}
          max={100}
        />
      </AccordionCard>
    </div>
  );
}

function RangePicker({ range, onChange }: { range: Range; onChange: (r: Range) => void }) {
  const ranges: { label: string; value: Range }[] = [
    { label: "Week", value: "week" },
    { label: "Month", value: "month" },
    { label: "Year", value: "year" },
    { label: "All time", value: "all" },
  ];
  return (
    <div className="flex rounded-lg border border-line bg-surface-2 p-0.5">
      {ranges.map((r) => (
        <button
          key={r.value}
          type="button"
          onClick={() => onChange(r.value)}
          className={cn(
            "rounded-md px-3 py-1 text-[11px] font-medium transition-colors",
            range === r.value ? "bg-surface text-ink shadow-[var(--shadow-sm)]" : "text-muted hover:text-ink-2"
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

export default function AnalyticsClient({
  userId,
  tutorClasses,
  studentClasses,
  parentChildren,
  lessons,
  homework,
  submissions,
  cycles,
  classMembers,
}: {
  userId: string;
  tutorClasses: { id: string; title: string; cycle_hours?: number }[];
  studentClasses: { id: string; title: string }[];
  parentChildren: { id: string; full_name: string; sharedClassIds: string[] }[];
  lessons: {
    id: string;
    class_id: string;
    duration_hours?: number;
    status: string;
    scheduled_at: string;
    payment_cycle_id?: string | null;
  }[];
  homework: { id: string; class_id: string; deadline: string }[];
  submissions: { id: string; homework_id: string; student_id: string; grade: string | null }[];
  cycles: {
    id: string;
    class_id: string;
    cycle_number: number;
    closed_at: string | null;
    paid_at: string | null;
    payment_amount: number | null;
    payment_currency: string | null;
  }[];
  classMembers: { class_id: string; user_id: string; role: string }[];
}) {
  const defaultTab: Tab =
    tutorClasses.length > 0 ? "tutor" : studentClasses.length > 0 ? "student" : parentChildren.length > 0 ? "parent" : "tutor";
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [range, setRange] = useState<Range>("month");
  const [currency, setCurrency] = useState("GEL");
  const [rates, setRates] = useState(DEFAULT_RATES);
  const [ratesLive, setRatesLive] = useState(false);

  useEffect(() => {
    fetch("https://open.er-api.com/v6/latest/GEL")
      .then((res) => res.json())
      .then((data) => {
        if (data.result === "success" && data.rates) {
          setRates({
            GEL: 1,
            USD: data.rates.USD,
            EUR: data.rates.EUR,
            RUB: data.rates.RUB,
          });
          setRatesLive(true);
        }
      })
      .catch(() => {});
  }, []);

  const start = useMemo(() => rangeStart(range), [range]);
  const now = new Date();

  function inRange(dateStr: string) {
    if (!start) return true;
    return new Date(dateStr) >= start;
  }

  const tabs: { value: Tab; label: string }[] = [
    ...(tutorClasses.length > 0 ? [{ value: "tutor" as Tab, label: "Tutor" }] : []),
    ...(studentClasses.length > 0 ? [{ value: "student" as Tab, label: "Student" }] : []),
    ...(parentChildren.length > 0 ? [{ value: "parent" as Tab, label: "Parent" }] : []),
  ];

  const tutorClassIds = tutorClasses.map((c) => c.id);
  const tLessons = lessons.filter((l) => tutorClassIds.includes(l.class_id) && inRange(l.scheduled_at));
  const tHw = homework.filter((h) => tutorClassIds.includes(h.class_id) && inRange(h.deadline));
  const tHwIds = tHw.map((h) => h.id);
  const tSubs = submissions.filter((s) => tHwIds.includes(s.homework_id));

  const tTotalHours = tLessons
    .filter((l) => l.status === "completed")
    .reduce((s, l) => s + (l.duration_hours ?? 0), 0);
  const tCompleted = tLessons.filter((l) => l.status === "completed").length;
  const tMissed = tLessons.filter((l) => l.status === "missed").length;
  const tConcluded = tCompleted + tMissed;
  const tMissedRate = tConcluded > 0 ? Math.round((tMissed / tConcluded) * 100) : 0;
  const tPendingFeedback = tSubs.filter((s) => !s.grade).length;

  const tutorClassStats = tutorClasses.map((cls) => {
    const cl = tLessons.filter((l) => l.class_id === cls.id);
    const ch = tHw.filter((h) => h.class_id === cls.id);
    const chIds = ch.map((h) => h.id);
    const cs = tSubs.filter((s) => chIds.includes(s.homework_id));
    const students = classMembers.filter((m) => m.class_id === cls.id && m.role === "student");
    const total = students.length;
    const comp = cl.filter((l) => l.status === "completed").length;
    const miss = cl.filter((l) => l.status === "missed").length;
    const concluded = comp + miss;
    const withFeedback = cs.filter((s) => s.grade).length;
    const submitted = cs.filter((s) => !s.grade).length;
    const isPast = (h: { deadline: string }) => new Date(h.deadline) < now;
    const overdue = ch.filter((h) => isPast(h) && !cs.some((s) => s.homework_id === h.id)).length;
    const pending = ch.filter((h) => !isPast(h) && !cs.some((s) => s.homework_id === h.id)).length;
    const hwTotal = total * ch.length || 1;
    const cls_cycles = cycles.filter((c) => c.class_id === cls.id);
    const openCycle = cls_cycles.find((c) => !c.closed_at);
    const cycleHours = openCycle
      ? lessons
          .filter(
            (l) =>
              l.class_id === cls.id &&
              l.payment_cycle_id === openCycle.id &&
              l.status === "completed"
          )
          .reduce((s, l) => s + (l.duration_hours ?? 0), 0)
      : 0;
    return {
      id: cls.id,
      title: cls.title,
      comp,
      miss,
      concluded,
      missedRate: concluded > 0 ? Math.round((miss / concluded) * 100) : 0,
      attendance: total > 0 && concluded > 0 ? Math.round((comp / concluded) * 100) : 0,
      withFeedback,
      submitted,
      overdue,
      pending,
      hwTotal,
      cycleHours,
      cycleTarget: cls.cycle_hours ?? 8,
    };
  });

  const earningsRows = cycles.map((c) => {
    const cls = tutorClasses.find((t) => t.id === c.class_id);
    const amt = c.payment_amount ?? 0;
    const cur = c.payment_currency ?? "GEL";
    const converted = convert(amt, cur, currency, rates);
    return {
      classTitle: cls?.title ?? "Unknown",
      cycle: c.cycle_number,
      native: amt,
      nativeCur: cur,
      converted,
      status: c.paid_at ? "paid" : c.closed_at ? "closed" : "progress",
      hours: lessons
        .filter((l) => l.class_id === c.class_id && l.payment_cycle_id === c.id && l.status === "completed")
        .reduce((s, l) => s + (l.duration_hours ?? 0), 0),
    };
  });

  const sym = SYMS[currency];
  const totalEarned = earningsRows.filter((r) => r.status === "paid").reduce((s, r) => s + r.converted, 0);
  const inProgress = earningsRows.filter((r) => r.status === "progress").reduce((s, r) => s + r.converted, 0);
  const totalHoursForRate = earningsRows.filter((r) => r.status === "paid").reduce((s, r) => s + r.hours, 0);
  const hourlyRate = totalHoursForRate > 0 ? (totalEarned / totalHoursForRate).toFixed(1) : "—";

  const studentClassIds = studentClasses.map((c) => c.id);
  const sLessons = lessons.filter((l) => studentClassIds.includes(l.class_id) && inRange(l.scheduled_at));
  const sHw = homework.filter((h) => studentClassIds.includes(h.class_id) && inRange(h.deadline));
  const sHwIds = sHw.map((h) => h.id);
  const mySubs = submissions.filter((s) => sHwIds.includes(s.homework_id) && s.student_id === userId);

  const sComp = sLessons.filter((l) => l.status === "completed").length;
  const sMiss = sLessons.filter((l) => l.status === "missed").length;
  const sConcluded = sComp + sMiss;
  const sAttendance = sConcluded > 0 ? Math.round((sComp / sConcluded) * 100) : 0;
  const sHours = sLessons
    .filter((l) => l.status === "completed")
    .reduce((s, l) => s + (l.duration_hours ?? 0), 0);
  const sHwDone = mySubs.length;
  const sFeedback = mySubs.filter((s) => s.grade).length;

  const studentClassStats = studentClasses.map((cls) => {
    const cl = sLessons.filter((l) => l.class_id === cls.id);
    const ch = sHw.filter((h) => h.class_id === cls.id);
    const chIds = ch.map((h) => h.id);
    const cs = mySubs.filter((s) => chIds.includes(s.homework_id));
    const comp = cl.filter((l) => l.status === "completed").length;
    const miss = cl.filter((l) => l.status === "missed").length;
    const concluded = comp + miss;
    const withFeedback = cs.filter((s) => s.grade).length;
    const submitted = cs.filter((s) => !s.grade).length;
    const isPast = (h: { deadline: string }) => new Date(h.deadline) < now;
    const missed = ch.filter((h) => isPast(h) && !cs.some((s) => s.homework_id === h.id)).length;
    const pending = ch.filter((h) => !isPast(h) && !cs.some((s) => s.homework_id === h.id)).length;
    const hwTotal = ch.length || 1;
    return {
      id: cls.id,
      title: cls.title,
      attendance: concluded > 0 ? Math.round((comp / concluded) * 100) : 0,
      withFeedback,
      submitted,
      missed,
      pending,
      hwTotal,
    };
  });

  const childrenStats = parentChildren.map((child) => {
    const sharedIds = child.sharedClassIds;
    const cLessons = lessons.filter((l) => sharedIds.includes(l.class_id) && inRange(l.scheduled_at));
    const cHw = homework.filter((h) => sharedIds.includes(h.class_id) && inRange(h.deadline));
    const cHwIds = cHw.map((h) => h.id);
    const cSubs = submissions.filter((s) => cHwIds.includes(s.homework_id) && s.student_id === child.id);

    const comp = cLessons.filter((l) => l.status === "completed").length;
    const miss = cLessons.filter((l) => l.status === "missed").length;
    const concluded = comp + miss;
    const hours = cLessons
      .filter((l) => l.status === "completed")
      .reduce((s, l) => s + (l.duration_hours ?? 0), 0);
    const hwDone = cSubs.length;
    const feedback = cSubs.filter((s) => s.grade).length;
    const attendance = concluded > 0 ? Math.round((comp / concluded) * 100) : 0;

    const classStats = sharedIds.map((clsId) => {
      const cls =
        [...tutorClasses, ...studentClasses].find((c) => c.id === clsId) ?? { id: clsId, title: "Unknown" };
      const cl = cLessons.filter((l) => l.class_id === clsId);
      const ch = cHw.filter((h) => h.class_id === clsId);
      const chIds = ch.map((h) => h.id);
      const cs = cSubs.filter((s) => chIds.includes(s.homework_id));
      const c = cl.filter((l) => l.status === "completed").length;
      const m = cl.filter((l) => l.status === "missed").length;
      const conc = c + m;
      const isPast = (h: { deadline: string }) => new Date(h.deadline) < now;
      return {
        id: clsId,
        title: cls.title,
        attendance: conc > 0 ? Math.round((c / conc) * 100) : 0,
        withFeedback: cs.filter((s) => s.grade).length,
        submitted: cs.filter((s) => !s.grade).length,
        missed: ch.filter((h) => isPast(h) && !cs.some((s) => s.homework_id === h.id)).length,
        pending: ch.filter((h) => !isPast(h) && !cs.some((s) => s.homework_id === h.id)).length,
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

  const tabSubtitle: Record<Tab, string> = {
    tutor: "Performance across all classes you teach",
    student: "Your progress across all classes you attend",
    parent: "Your children's progress in shared classes",
  };

  const earningsStatusTone = (status: string) => {
    if (status === "paid") return "ok" as const;
    if (status === "closed") return "neutral" as const;
    return "warn" as const;
  };

  return (
    <PageContainer>
      <PageHeader
        title="Analytics"
        sub={tabSubtitle[tab]}
        action={<RangePicker range={range} onChange={setRange} />}
      />

      {tabs.length > 0 ? (
        <Tabs
          items={tabs.map((t) => ({ key: t.value, label: t.label }))}
          active={tab}
          onSelect={(k) => setTab(k as Tab)}
          className="mt-2"
        />
      ) : null}

      <div className="mt-6 flex flex-col gap-4">
        {tab === "tutor" &&
          (tutorClasses.length === 0 ? (
            <EmptyState
              icon={<AnalyticsIcon size={20} />}
              title="No tutor analytics yet"
              description="Create a class or get invited as a tutor to see analytics here."
            />
          ) : (
            <>
              <StatGrid
                stats={[
                  { label: "Total hours", value: tTotalHours, delta: "completed", deltaTone: "muted" },
                  { label: "Total lessons", value: tCompleted, delta: `${tMissed} missed`, deltaTone: "muted" },
                  {
                    label: "Missed rate",
                    value: tConcluded > 0 ? `${tMissedRate}%` : "—",
                    delta: `${tMissed} of ${tConcluded} concluded`,
                    deltaTone: tMissedRate === 0 ? "up" : tMissedRate <= 15 ? "warn" : "down",
                  },
                  {
                    label: "Pending feedback",
                    value: tPendingFeedback,
                    delta: "submissions",
                    deltaTone: tPendingFeedback > 0 ? "warn" : "up",
                  },
                ]}
              />

              <AccordionCard title="Homework completion per class">
                <div className="flex flex-col gap-2">
                  {tutorClassStats.map((cls) => {
                    const t = cls.hwTotal;
                    return (
                      <StackedBar
                        key={cls.id}
                        label={cls.title}
                        total={t}
                        segments={[
                          { pct: t > 0 ? (cls.withFeedback / t) * 100 : 0, tone: "ok" },
                          { pct: t > 0 ? (cls.submitted / t) * 100 : 0, tone: "ok-muted" },
                          { pct: t > 0 ? (cls.pending / t) * 100 : 0, tone: "warn" },
                          { pct: t > 0 ? (cls.overdue / t) * 100 : 0, tone: "danger" },
                        ]}
                      />
                    );
                  })}
                </div>
                <Legend items={HW_LEGEND_TUTOR} />
              </AccordionCard>

              <AccordionCard title="Mean attendance per class">
                <BarChart
                  data={tutorClassStats.map((cls) => ({
                    label: cls.title,
                    value: cls.attendance,
                    tone: attendanceBarTone(cls.attendance),
                  }))}
                  max={100}
                />
              </AccordionCard>

              <AccordionCard title="Missed lesson % per class">
                <BarChart
                  data={tutorClassStats.map((cls) => ({
                    label: cls.title,
                    value: cls.missedRate,
                    tone: missedBarTone(cls.missedRate),
                  }))}
                  max={100}
                />
              </AccordionCard>

              <AccordionCard title="Payment cycle hours per class">
                <div className="flex flex-col gap-2">
                  {tutorClassStats.map((cls) => (
                    <StackedBar
                      key={cls.id}
                      label={cls.title}
                      total={`${cls.cycleHours}/${cls.cycleTarget}h`}
                      segments={[
                        {
                          pct: Math.min((cls.cycleHours / cls.cycleTarget) * 100, 100),
                          tone: "accent",
                        },
                        {
                          pct: Math.max(((cls.cycleTarget - cls.cycleHours) / cls.cycleTarget) * 100, 0),
                          tone: "muted",
                        },
                      ]}
                    />
                  ))}
                </div>
                <Legend
                  items={[
                    { tone: "accent", label: "Completed" },
                    { tone: "muted", label: "Remaining" },
                  ]}
                />
              </AccordionCard>

              <AccordionCard title="Earnings">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="text-[12px] text-muted">Display currency</span>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="h-9 rounded-xl border border-line-2 bg-surface px-3 text-[12px] text-ink outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
                  >
                    <option value="GEL">GEL — Georgian Lari</option>
                    <option value="USD">USD — US Dollar</option>
                    <option value="EUR">EUR — Euro</option>
                    <option value="RUB">RUB — Russian Ruble</option>
                  </select>
                  {ratesLive ? <span className="text-[11px] text-ok">Live exchange rates</span> : null}
                </div>

                <div className="overflow-hidden rounded-xl border border-line">
                  <div className="grid grid-cols-[1fr_60px_80px_80px_80px] border-b border-line bg-surface-2 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted">
                    <div>Class</div>
                    <div>Cycle</div>
                    <div>Native</div>
                    <div>Converted</div>
                    <div>Status</div>
                  </div>
                  {earningsRows.length === 0 ? (
                    <div className="px-3 py-3 text-[13px] text-muted">No payment cycles yet.</div>
                  ) : (
                    earningsRows.map((r, i) => (
                      <div
                        key={i}
                        className={cn(
                          "grid grid-cols-[1fr_60px_80px_80px_80px] items-center px-3 py-2.5",
                          i < earningsRows.length - 1 && "border-b border-line"
                        )}
                      >
                        <div className="truncate text-[13px] font-medium text-ink">{r.classTitle}</div>
                        <div className="text-[12px] text-muted">#{r.cycle}</div>
                        <div className="text-[12px] text-ink-2">
                          {r.native} {r.nativeCur}
                        </div>
                        <div className="text-[12px] font-medium text-accent">
                          {sym}
                          {Math.round(r.converted)}
                        </div>
                        <div>
                          <Badge tone={earningsStatusTone(r.status)} className="text-[10px] capitalize">
                            {r.status === "paid" ? "Paid" : r.status === "closed" ? "Closed" : "In progress"}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 border-t border-line pt-4 sm:grid-cols-3">
                  {[
                    { label: "Total earned", value: `${sym}${Math.round(totalEarned)}` },
                    { label: "In progress (projected)", value: `${sym}${Math.round(inProgress)}`, warn: true },
                    { label: "Mean hourly rate", value: hourlyRate !== "—" ? `${sym}${hourlyRate}/h` : "—" },
                  ].map((s) => (
                    <div key={s.label}>
                      <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted">{s.label}</div>
                      <div className={cn("font-serif text-[22px] text-ink", s.warn && "text-warn")}>{s.value}</div>
                    </div>
                  ))}
                </div>
              </AccordionCard>
            </>
          ))}

        {tab === "student" && (
          <>
            <StatGrid
              stats={[
                {
                  label: "Attendance",
                  value: sConcluded > 0 ? `${sAttendance}%` : "—",
                  delta: `${sComp} of ${sConcluded} lessons`,
                  deltaTone: sAttendance >= 85 ? "up" : sAttendance >= 70 ? "warn" : "down",
                },
                { label: "Hours learned", value: sHours, delta: "completed", deltaTone: "muted" },
                { label: "Homework done", value: sHwDone, delta: `${sHw.length} total`, deltaTone: "muted" },
                {
                  label: "Feedback received",
                  value: sFeedback,
                  delta: `${sHwDone - sFeedback} pending`,
                  deltaTone: "muted",
                },
              ]}
            />
            <AccordionCard title="Homework breakdown per class">
              <div className="flex flex-col gap-2">
                {studentClassStats.map((cls) => (
                  <StackedBar
                    key={cls.id}
                    label={cls.title}
                    total={cls.hwTotal}
                    segments={[
                      { pct: (cls.withFeedback / cls.hwTotal) * 100, tone: "ok" },
                      { pct: (cls.submitted / cls.hwTotal) * 100, tone: "ok-muted" },
                      { pct: (cls.pending / cls.hwTotal) * 100, tone: "warn" },
                      { pct: (cls.missed / cls.hwTotal) * 100, tone: "danger" },
                    ]}
                  />
                ))}
              </div>
              <Legend items={HW_LEGEND_STUDENT} />
            </AccordionCard>
            <AccordionCard title="Attendance per class">
              <BarChart
                data={studentClassStats.map((cls) => ({
                  label: cls.title,
                  value: cls.attendance,
                  tone: attendanceBarTone(cls.attendance),
                }))}
                max={100}
              />
            </AccordionCard>
          </>
        )}

        {tab === "parent" &&
          (childrenStats.length === 0 ? (
            <EmptyState
              icon={<AnalyticsIcon size={20} />}
              title="No children linked"
              description={
                <>
                  Go to{" "}
                  <Link href="/settings/access" className="font-medium text-accent hover:underline">
                    Access & accounts
                  </Link>{" "}
                  to link a child.
                </>
              }
            />
          ) : (
            <div className="flex flex-col gap-10">
              {childrenStats.map((child, i) => (
                <div key={child.id}>
                  {i > 0 ? <div className="mb-10 border-t border-line" /> : null}
                  <ChildBlock name={child.name} stats={child.stats} classStats={child.classStats} />
                </div>
              ))}
            </div>
          ))}
      </div>
    </PageContainer>
  );
}
