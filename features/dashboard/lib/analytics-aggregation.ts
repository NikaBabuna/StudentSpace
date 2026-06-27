/* =============================================================================
 * features/dashboard/lib/analytics-aggregation.ts — shared analytics primitives
 * ----------------------------------------------------------------------------- */

export type AnalyticsRange = "week" | "month" | "year" | "all";

export type HomeworkChartRow = {
  name: string;
  feedback: number;
  submitted: number;
  pending: number;
  overdue: number;
};

export type NamedValue = {
  name: string;
  value: number;
};

export function rangeStart(range: AnalyticsRange): Date | null {
  const now = new Date();
  if (range === "week") return new Date(now.getTime() - 6 * 86400000);
  if (range === "month") return new Date(now.getTime() - 27 * 86400000);
  if (range === "year") return new Date(now.getFullYear(), now.getMonth() - 11, 1);
  return null;
}

export function inDateWindow(dateStr: string, from: Date, to: Date) {
  const t = new Date(dateStr);
  return t >= from && t < to;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(24, 0, 0, 0);
  return x;
}

export function truncateLabel(name: string, max = 14) {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}

export type BucketWindow = { key: string; label: string; from: Date; to: Date };

export function getTimeBucketWindows(range: AnalyticsRange, earliest?: Date): BucketWindow[] {
  const now = new Date();
  const today = startOfDay(now);

  if (range === "week") {
    return Array.from({ length: 7 }, (_, i) => {
      const from = new Date(today);
      from.setDate(from.getDate() - (6 - i));
      const to =
        i === 6
          ? endOfDay(today)
          : (() => {
              const t = new Date(from);
              t.setDate(t.getDate() + 1);
              return t;
            })();
      return {
        key: from.toISOString(),
        label: from.toLocaleDateString(undefined, { weekday: "short" }),
        from,
        to,
      };
    });
  }

  if (range === "month") {
    return Array.from({ length: 4 }, (_, i) => {
      const from = new Date(today);
      from.setDate(from.getDate() - (27 - i * 7));
      const to =
        i === 3
          ? endOfDay(today)
          : (() => {
              const t = new Date(from);
              t.setDate(t.getDate() + 7);
              return t;
            })();
      const endLabel = new Date(to);
      endLabel.setDate(endLabel.getDate() - 1);
      const label =
        i === 3
          ? `${from.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – Today`
          : `${from.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${endLabel.toLocaleDateString(undefined, { day: "numeric" })}`;
      return { key: from.toISOString(), label, from, to };
    });
  }

  if (range === "year") {
    return Array.from({ length: 12 }, (_, i) => {
      const from = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const to = new Date(from.getFullYear(), from.getMonth() + 1, 1);
      return {
        key: from.toISOString(),
        label: from.toLocaleDateString(undefined, { month: "short" }),
        from,
        to,
      };
    });
  }

  const dated = earliest ?? now;
  const fromMonth = new Date(dated.getFullYear(), dated.getMonth(), 1);
  const buckets: BucketWindow[] = [];
  let cursor = new Date(fromMonth);
  while (cursor <= now && buckets.length < 24) {
    const to = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    buckets.push({
      key: cursor.toISOString(),
      label: cursor.toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
      from: new Date(cursor),
      to,
    });
    cursor = to;
  }
  return buckets.length > 0
    ? buckets
    : [{ key: today.toISOString(), label: today.toLocaleDateString(undefined, { month: "short" }), from: today, to: endOfDay(today) }];
}
