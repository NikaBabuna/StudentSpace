import { describe, expect, it } from "vitest";

import { getTimeBucketWindows, inDateWindow } from "./analytics-aggregation";

describe("getTimeBucketWindows", () => {
  it("includes today's bucket in the month view", () => {
    const now = new Date();
    const todayAfternoon = new Date(now);
    todayAfternoon.setHours(15, 0, 0, 0);

    const buckets = getTimeBucketWindows("month");
    const todayBucket = buckets[buckets.length - 1];
    expect(inDateWindow(todayAfternoon.toISOString(), todayBucket.from, todayBucket.to)).toBe(true);
  });

  it("returns four weekly buckets for month range", () => {
    const buckets = getTimeBucketWindows("month");
    expect(buckets).toHaveLength(4);
  });
});
