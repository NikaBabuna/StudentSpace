import { describe, expect, it } from "vitest";

import { buildLessonActivityChartData } from "./lesson-activity-aggregation";

describe("buildLessonActivityChartData", () => {
  it("sums completed on-time vs re-scheduled hours separately", () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    const buckets = buildLessonActivityChartData(
      [
        {
          class_id: "class-a",
          scheduled_at: today.toISOString(),
          status: "completed",
          duration_hours: 2,
          replaces_lesson_id: null,
        },
        {
          class_id: "class-a",
          scheduled_at: today.toISOString(),
          status: "completed",
          duration_hours: 1,
          replaces_lesson_id: "missed-lesson-id",
        },
        {
          class_id: "class-a",
          scheduled_at: today.toISOString(),
          status: "missed",
          duration_hours: 1,
        },
      ],
      "month"
    );

    const totals = buckets.reduce(
      (acc, b) => ({
        hours: acc.hours + b.total,
        onTime: acc.onTime + b.completedOnTime,
        rescheduled: acc.rescheduled + b.rescheduled,
      }),
      { hours: 0, onTime: 0, rescheduled: 0 }
    );

    expect(totals.hours).toBe(3);
    expect(totals.onTime).toBe(2);
    expect(totals.rescheduled).toBe(1);
  });
});
