/* =============================================================================
 * features/dashboard/lib/analytics-aggregation.test.ts
 * -----------------------------------------------------------------------------
 * Role: Verifies analytics range starts, date windows, label truncation, and
 *       the time-bucket builders for every range (week/month/year/all).
 * Dependencies: vitest, analytics-aggregation
 * Used by: npm test / CI
 * ========================================================================== */
import { describe, expect, it } from "vitest";

import {
  getTimeBucketWindows,
  inDateWindow,
  rangeStart,
  truncateLabel,
} from "./analytics-aggregation";

describe("rangeStart", () => {
  it("returns a start 6 days back for week", () => {
    const start = rangeStart("week")!;
    const days = (Date.now() - start.getTime()) / 86400000;
    expect(days).toBeCloseTo(6, 1);
  });

  it("returns a start 27 days back for month", () => {
    const start = rangeStart("month")!;
    const days = (Date.now() - start.getTime()) / 86400000;
    expect(days).toBeCloseTo(27, 1);
  });

  it("returns the first of the month 11 months back for year", () => {
    const start = rangeStart("year")!;
    expect(start.getDate()).toBe(1);
  });

  it("returns null for all-time (no lower bound)", () => {
    expect(rangeStart("all")).toBeNull();
  });
});

describe("inDateWindow", () => {
  const from = new Date("2026-06-01T00:00:00Z");
  const to = new Date("2026-06-02T00:00:00Z");

  it("includes the lower bound and excludes the upper bound", () => {
    expect(inDateWindow("2026-06-01T00:00:00Z", from, to)).toBe(true);
    expect(inDateWindow("2026-06-01T23:59:59Z", from, to)).toBe(true);
    expect(inDateWindow("2026-06-02T00:00:00Z", from, to)).toBe(false);
  });
});

describe("truncateLabel", () => {
  it("keeps short names unchanged", () => {
    expect(truncateLabel("Algebra")).toBe("Algebra");
  });

  it("truncates long names with an ellipsis at the max length", () => {
    const long = "Very Long Class Name Indeed";
    const out = truncateLabel(long, 14);
    expect(out).toHaveLength(14);
    expect(out.endsWith("…")).toBe(true);
  });
});

describe("getTimeBucketWindows", () => {
  it("returns seven contiguous daily buckets for week, ending today", () => {
    const buckets = getTimeBucketWindows("week");
    expect(buckets).toHaveLength(7);
    for (let i = 1; i < buckets.length; i++) {
      expect(buckets[i].from.getTime()).toBe(buckets[i - 1].to.getTime());
    }
    const now = new Date();
    expect(inDateWindow(now.toISOString(), buckets[6].from, buckets[6].to)).toBe(true);
  });

  it("returns four weekly buckets for month range", () => {
    const buckets = getTimeBucketWindows("month");
    expect(buckets).toHaveLength(4);
  });

  it("includes today's bucket in the month view", () => {
    const now = new Date();
    const todayAfternoon = new Date(now);
    todayAfternoon.setHours(15, 0, 0, 0);

    const buckets = getTimeBucketWindows("month");
    const todayBucket = buckets[buckets.length - 1];
    expect(inDateWindow(todayAfternoon.toISOString(), todayBucket.from, todayBucket.to)).toBe(true);
  });

  it("returns twelve calendar-month buckets for year, aligned to month starts", () => {
    const buckets = getTimeBucketWindows("year");
    expect(buckets).toHaveLength(12);
    for (const b of buckets) {
      expect(b.from.getDate()).toBe(1);
      expect(b.to.getDate()).toBe(1);
    }
    const now = new Date();
    const last = buckets[11];
    expect(inDateWindow(now.toISOString(), last.from, last.to)).toBe(true);
  });

  it("builds monthly buckets from the earliest date for all-time", () => {
    const now = new Date();
    const earliest = new Date(now.getFullYear(), now.getMonth() - 2, 15);
    const buckets = getTimeBucketWindows("all", earliest);
    expect(buckets).toHaveLength(3); // two full past months + the current one
    expect(buckets[0].from.getMonth()).toBe(earliest.getMonth());
    expect(buckets[0].from.getDate()).toBe(1);
  });

  it("caps all-time at 24 buckets", () => {
    const now = new Date();
    const earliest = new Date(now.getFullYear() - 5, 0, 1);
    expect(getTimeBucketWindows("all", earliest).length).toBeLessThanOrEqual(24);
  });

  it("falls back to a single today-bucket when there is no history", () => {
    const now = new Date();
    const future = new Date(now.getFullYear(), now.getMonth() + 2, 1);
    const buckets = getTimeBucketWindows("all", future);
    expect(buckets).toHaveLength(1);
    expect(inDateWindow(now.toISOString(), buckets[0].from, buckets[0].to)).toBe(true);
  });
});
