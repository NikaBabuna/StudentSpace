/* =============================================================================
 * features/dashboard/lib/earnings-aggregation.ts — earnings chart + summary data
 * ----------------------------------------------------------------------------- */
import {
  getTimeBucketWindows,
  inDateWindow,
  rangeStart,
  type AnalyticsRange,
} from "@/features/dashboard/lib/analytics-aggregation";

export type EarningsCycle = {
  id: string;
  class_id: string;
  cycle_number: number;
  started_at: string;
  closed_at: string | null;
  paid_at: string | null;
  payment_amount: number | null;
  payment_currency: string | null;
};

export type EarningsLesson = {
  class_id: string;
  status: string;
  duration_hours?: number;
  scheduled_at: string;
  payment_cycle_id?: string | null;
};

export type ClassEarningsSummary = {
  classId: string;
  title: string;
  cycleNumber: number;
  cycleHours: number;
  cycleTarget: number;
  earnedInPeriod: number;
  isOpen: boolean;
};

export type EarningsChartRow = {
  label: string;
  key: string;
  total: number;
  [classKey: string]: string | number;
};

function cycleEarnedDate(cycle: EarningsCycle): Date | null {
  if (cycle.paid_at) return new Date(cycle.paid_at);
  if (cycle.closed_at) return new Date(cycle.closed_at);
  return null;
}

export function hoursForCycle(
  cycle: EarningsCycle,
  lessons: EarningsLesson[]
): number {
  const linked = lessons.filter(
    (l) => l.payment_cycle_id === cycle.id && l.status === "completed"
  );
  if (linked.length > 0) {
    return linked.reduce((s, l) => s + (l.duration_hours ?? 0), 0);
  }
  const end = cycle.paid_at ?? cycle.closed_at ?? new Date().toISOString();
  return lessons
    .filter(
      (l) =>
        l.class_id === cycle.class_id &&
        l.status === "completed" &&
        new Date(l.scheduled_at) >= new Date(cycle.started_at) &&
        new Date(l.scheduled_at) <= new Date(end)
    )
    .reduce((s, l) => s + (l.duration_hours ?? 0), 0);
}

/** A single projected cycle payout: a class's cycle closing on a future date. */
export type ProjectedPayout = {
  classId: string;
  title: string;
  cycleNumber: number;
  /** When the cycle is projected to close (date of the lesson that fills it). */
  date: Date;
  /** Payment for that cycle, in the display currency. */
  amount: number;
};

/**
 * Project the NEXT cycle payout per class from the scheduled-lesson pipeline.
 * For each class with an open, priced cycle, walk its upcoming scheduled
 * lessons in date order, accumulating hours on top of what the open cycle
 * already has, and stop as soon as the running total reaches the cycle
 * target — that's the one lesson whose date closes the class's next cycle.
 *
 * Deliberately one entry per class, not a chain of every future cycle: how
 * far a class's projection could otherwise run depends on an unrelated
 * implementation detail (how many weeks of recurring lessons happen to be
 * materialised), which made the projection arbitrarily deep for whichever
 * class had the longest lesson backlog. "Next cycle, per class" is the
 * meaningful, comparable unit across classes.
 *
 * The result answers "by what date will each class next get paid if its
 * already-scheduled lessons are completed" — at most one entry per class,
 * sorted by date.
 */
export function buildProjectedPayouts(
  classes: { id: string; title: string; cycle_hours?: number }[],
  cycles: EarningsCycle[],
  lessons: EarningsLesson[],
  convert: (amount: number, from: string) => number,
  from: Date = new Date()
): ProjectedPayout[] {
  const payouts: ProjectedPayout[] = [];

  for (const cls of classes) {
    const classCycles = cycles
      .filter((c) => c.class_id === cls.id)
      .sort((a, b) => a.cycle_number - b.cycle_number);
    const openCycle = classCycles.find((c) => !c.closed_at);
    if (!openCycle) continue;

    const amount = convert(openCycle.payment_amount ?? 0, openCycle.payment_currency ?? "GEL");
    const target = cls.cycle_hours ?? 8;
    if (amount <= 0 || target <= 0) continue;

    const upcoming = lessons
      .filter(
        (l) =>
          l.class_id === cls.id &&
          l.status === "scheduled" &&
          new Date(l.scheduled_at) >= from
      )
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

    let filled = hoursForCycle(openCycle, lessons); // hours already banked in the open cycle

    for (const l of upcoming) {
      filled += l.duration_hours ?? 0;
      if (filled >= target) {
        payouts.push({
          classId: cls.id,
          title: cls.title,
          cycleNumber: openCycle.cycle_number,
          date: new Date(l.scheduled_at),
          amount,
        });
        break; // only the next cycle for this class
      }
    }
  }

  return payouts.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function buildClassEarningsSummaries(
  classes: { id: string; title: string; cycle_hours?: number }[],
  cycles: EarningsCycle[],
  lessons: EarningsLesson[],
  range: AnalyticsRange,
  convert: (amount: number, from: string) => number
): ClassEarningsSummary[] {
  const start = rangeStart(range);

  return classes.map((cls) => {
    const classCycles = cycles
      .filter((c) => c.class_id === cls.id)
      .sort((a, b) => a.cycle_number - b.cycle_number);
    const openCycle = classCycles.find((c) => !c.closed_at);
    const target = cls.cycle_hours ?? 8;

    const cycleHours = openCycle
      ? hoursForCycle(openCycle, lessons)
      : classCycles.length > 0
        ? hoursForCycle(classCycles[classCycles.length - 1], lessons)
        : 0;

    const earnedInPeriod = classCycles
      .filter((c) => {
        const earnedAt = cycleEarnedDate(c);
        if (!earnedAt || !c.paid_at) return false;
        if (!start) return true;
        return earnedAt >= start;
      })
      .reduce((s, c) => s + convert(c.payment_amount ?? 0, c.payment_currency ?? "GEL"), 0);

    return {
      classId: cls.id,
      title: cls.title,
      cycleNumber: openCycle?.cycle_number ?? classCycles[classCycles.length - 1]?.cycle_number ?? 1,
      cycleHours,
      cycleTarget: target,
      earnedInPeriod,
      isOpen: !!openCycle,
    };
  });
}

export function buildEarningsChartData(
  classes: { id: string; title: string }[],
  cycles: EarningsCycle[],
  range: AnalyticsRange,
  convert: (amount: number, from: string) => number
): EarningsChartRow[] {
  let earliest: Date | undefined;
  for (const cycle of cycles) {
    const earnedAt = cycleEarnedDate(cycle);
    if (!earnedAt) continue;
    if (!earliest || earnedAt < earliest) earliest = earnedAt;
  }
  const windows = getTimeBucketWindows(range, earliest);

  return windows.map((w) => {
    const row: EarningsChartRow = { label: w.label, key: w.key, total: 0 };

    for (const cls of classes) {
      const key = `c_${cls.id}`;
      row[key] = 0;
    }

    for (const cycle of cycles) {
      const earnedAt = cycleEarnedDate(cycle);
      if (!earnedAt || !cycle.paid_at) continue;
      if (!inDateWindow(earnedAt.toISOString(), w.from, w.to)) continue;

      const amount = convert(cycle.payment_amount ?? 0, cycle.payment_currency ?? "GEL");
      const key = `c_${cycle.class_id}`;
      row[key] = (Number(row[key]) || 0) + amount;
      row.total += amount;
    }

    return row;
  });
}

export function computeHourlyRate(
  cycles: EarningsCycle[],
  lessons: EarningsLesson[],
  range: AnalyticsRange,
  convert: (amount: number, from: string) => number
): number | null {
  const start = rangeStart(range);

  const paidInRange = cycles.filter((c) => {
    if (!c.paid_at || (c.payment_amount ?? 0) <= 0) return false;
    if (!start) return true;
    return new Date(c.paid_at) >= start;
  });

  if (paidInRange.length === 0) return null;

  const earned = paidInRange.reduce(
    (s, c) => s + convert(c.payment_amount ?? 0, c.payment_currency ?? "GEL"),
    0
  );
  const hours = paidInRange.reduce((s, c) => s + hoursForCycle(c, lessons), 0);

  if (hours <= 0) return null;
  return earned / hours;
}

export function formatShortDate(d: Date) {
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
