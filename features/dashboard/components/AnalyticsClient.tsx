/* =============================================================================
 * features/dashboard/components/AnalyticsClient.tsx — analytics dashboard
 * ----------------------------------------------------------------------------- */
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";

import { PageContainer, PageHeader } from "@/components/shell/page-container";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { Tabs } from "@/components/ui/tabs";
import { AnalyticsIcon } from "@/components/icons";
import {
  rangeStart,
  truncateLabel,
  type AnalyticsRange,
  type HomeworkChartRow,
} from "@/features/dashboard/lib/analytics-aggregation";
import { countStudentHomeworkSlots, countTutorHomeworkSlots } from "@/features/dashboard/lib/homework-stats";
import type { AnalyticsPageData } from "@/features/dashboard/lib/load-analytics-data";
import AnalyticsRangePicker from "@/features/dashboard/components/AnalyticsRangePicker";
import {
  AnalyticsChartCard,
  HomeworkStackedChart,
  PercentBarChart,
  hwLegendStudent,
  hwLegendTutor,
  useChartTheme,
} from "@/features/dashboard/components/analytics-charts";
import EarningsAnalytics from "@/features/dashboard/components/EarningsAnalytics";
import LessonActivityAnalytics from "@/features/dashboard/components/LessonActivityAnalytics";

const DEFAULT_RATES: Record<string, number> = { GEL: 1, USD: 0.37, EUR: 0.34, RUB: 3.4 };

type Range = AnalyticsRange;
type Tab = "tutor" | "student" | "parent";

function convert(amount: number, from: string, to: string, rates: Record<string, number>) {
  const gelAmount = from === "GEL" ? amount : amount / (rates[from] ?? 1);
  return to === "GEL" ? gelAmount : gelAmount * (rates[to] ?? 1);
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
    <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
      {stats.map((s) => (
        <StatCard key={s.label} label={s.label} value={s.value} delta={s.delta} deltaTone={s.deltaTone} />
      ))}
    </div>
  );
}

type ClassHwStats = {
  id: string;
  title: string;
  withFeedback: number;
  submitted: number;
  pending: number;
  overdue?: number;
  missed?: number;
  attendance: number;
  missedRate?: number;
};

function toHomeworkRows(classes: ClassHwStats[]): HomeworkChartRow[] {
  return classes.map((cls) => ({
    name: truncateLabel(cls.title),
    feedback: cls.withFeedback,
    submitted: cls.submitted,
    pending: cls.pending,
    overdue: cls.overdue ?? cls.missed ?? 0,
  }));
}

function ChildAnalytics({
  name,
  lessons,
  range,
  classStats,
  stats,
}: {
  name: string;
  lessons: {
    class_id: string;
    scheduled_at: string;
    status: string;
    duration_hours?: number;
    replaces_lesson_id?: string | null;
  }[];
  range: Range;
  classStats: ClassHwStats[];
  stats: {
    concluded: number;
    attendance: number;
    comp: number;
    hours: number;
    hwDone: number;
    hwTotal: number;
    feedback: number;
  };
}) {
  const theme = useChartTheme();

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

      <AnalyticsChartCard
        title="Lesson activity"
        description="Completed hours over time — on time vs re-scheduled"
      >
        <LessonActivityAnalytics lessons={lessons} range={range} />
      </AnalyticsChartCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AnalyticsChartCard title="Homework by class" description="Stacked assignment status">
          <HomeworkStackedChart data={toHomeworkRows(classStats)} legend={hwLegendStudent(theme)} />
        </AnalyticsChartCard>
        <AnalyticsChartCard title="Attendance by class" description="Completed vs concluded lessons">
          <PercentBarChart
            data={classStats.map((c) => ({ name: truncateLabel(c.title), value: c.attendance }))}
          />
        </AnalyticsChartCard>
      </div>
    </div>
  );
}

export default function AnalyticsClient({
  userId,
  tutorClasses,
  studentClasses,
  parentClasses,
  parentChildren,
  lessons,
  homework,
  submissions,
  cycles,
  classMembers,
}: AnalyticsPageData) {
  const theme = useChartTheme();
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
    const studentIds = classMembers
      .filter((m) => m.class_id === cls.id && m.role === "student")
      .map((m) => m.user_id);
    const comp = cl.filter((l) => l.status === "completed").length;
    const miss = cl.filter((l) => l.status === "missed").length;
    const concluded = comp + miss;
    const hwStats = countTutorHomeworkSlots(ch, studentIds, cs, now);
    return {
      id: cls.id,
      title: cls.title,
      comp,
      miss,
      concluded,
      missedRate: concluded > 0 ? Math.round((miss / concluded) * 100) : 0,
      attendance: concluded > 0 ? Math.round((comp / concluded) * 100) : 0,
      ...hwStats,
    };
  });

  const convertAmount = useCallback(
    (amount: number, from: string) => convert(amount, from, currency, rates),
    [currency, rates]
  );

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
    const hwStats = countStudentHomeworkSlots(ch, userId, cs, now);
    return {
      id: cls.id,
      title: cls.title,
      attendance: concluded > 0 ? Math.round((comp / concluded) * 100) : 0,
      withFeedback: hwStats.withFeedback,
      submitted: hwStats.submitted,
      missed: hwStats.overdue,
      pending: hwStats.pending,
      hwTotal: ch.length || 1,
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
        [...parentClasses, ...tutorClasses, ...studentClasses].find((c) => c.id === clsId) ??
        { id: clsId, title: "Unknown" };
      const cl = cLessons.filter((l) => l.class_id === clsId);
      const ch = cHw.filter((h) => h.class_id === clsId);
      const chIds = ch.map((h) => h.id);
      const cs = cSubs.filter((s) => chIds.includes(s.homework_id));
      const c = cl.filter((l) => l.status === "completed").length;
      const m = cl.filter((l) => l.status === "missed").length;
      const conc = c + m;
      const hwStats = countStudentHomeworkSlots(ch, child.id, cs, now);
      return {
        id: clsId,
        title: cls.title,
        attendance: conc > 0 ? Math.round((c / conc) * 100) : 0,
        withFeedback: hwStats.withFeedback,
        submitted: hwStats.submitted,
        missed: hwStats.overdue,
        pending: hwStats.pending,
        hwTotal: ch.length || 1,
      };
    });

    return {
      id: child.id,
      name: child.full_name,
      lessons: cLessons,
      stats: { comp, miss, concluded, hours, hwDone, feedback, attendance, hwTotal: cHw.length },
      classStats,
    };
  });

  const tabSubtitle: Record<Tab, string> = {
    tutor: "Performance across all classes you teach",
    student: "Your progress across all classes you attend",
    parent: "Your children's progress in shared classes",
  };

  return (
    <PageContainer>
      <PageHeader
        title="Analytics"
        sub={tabSubtitle[tab]}
        action={<AnalyticsRangePicker range={range} onChange={setRange} />}
      />

      {tabs.length > 1 ? (
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
                  { label: "Lessons completed", value: tCompleted, delta: `${tMissed} missed`, deltaTone: "muted" },
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

              <AnalyticsChartCard
                title="Lesson activity"
                description="Completed hours over time — on time vs re-scheduled"
              >
                <LessonActivityAnalytics lessons={tLessons} range={range} />
              </AnalyticsChartCard>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <AnalyticsChartCard title="Attendance by class" description="Share of concluded lessons completed">
                  <PercentBarChart
                    data={tutorClassStats.map((c) => ({
                      name: truncateLabel(c.title),
                      value: c.attendance,
                    }))}
                  />
                </AnalyticsChartCard>
                <AnalyticsChartCard title="Missed lesson rate" description="Missed as % of concluded lessons">
                  <PercentBarChart
                    invert
                    data={tutorClassStats.map((c) => ({
                      name: truncateLabel(c.title),
                      value: c.missedRate,
                    }))}
                  />
                </AnalyticsChartCard>
              </div>

              <AnalyticsChartCard
                title="Homework completion by class"
                description="Assignment slots across all students — stacked by status"
              >
                <HomeworkStackedChart
                  data={toHomeworkRows(tutorClassStats)}
                  legend={hwLegendTutor(theme)}
                />
              </AnalyticsChartCard>

              <EarningsAnalytics
                tutorClasses={tutorClasses}
                cycles={cycles}
                lessons={lessons}
                currency={currency}
                onCurrencyChange={setCurrency}
                ratesLive={ratesLive}
                convert={convertAmount}
              />
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

            <AnalyticsChartCard
              title="Your lesson activity"
              description="Completed hours over time — on time vs re-scheduled"
            >
              <LessonActivityAnalytics lessons={sLessons} range={range} />
            </AnalyticsChartCard>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <AnalyticsChartCard title="Homework by class" description="Your assignment status per class">
                <HomeworkStackedChart
                  data={toHomeworkRows(studentClassStats)}
                  legend={hwLegendStudent(theme)}
                />
              </AnalyticsChartCard>
              <AnalyticsChartCard title="Attendance by class" description="Completed vs concluded lessons">
                <PercentBarChart
                  data={studentClassStats.map((c) => ({
                    name: truncateLabel(c.title),
                    value: c.attendance,
                  }))}
                />
              </AnalyticsChartCard>
            </div>
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
                  <ChildAnalytics
                    name={child.name}
                    lessons={child.lessons}
                    range={range}
                    classStats={child.classStats}
                    stats={child.stats}
                  />
                </div>
              ))}
            </div>
          ))}
      </div>
    </PageContainer>
  );
}
