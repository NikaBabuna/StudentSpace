/* =============================================================================
 * features/dashboard/lib/lesson-activity-aggregation.ts — lesson activity chart data
 * ----------------------------------------------------------------------------- */
import {
  getTimeBucketWindows,
  inDateWindow,
  type AnalyticsRange,
} from "@/features/dashboard/lib/analytics-aggregation";

export type LessonActivityLesson = {
  class_id: string;
  scheduled_at: string;
  status: string;
  duration_hours?: number;
  replaces_lesson_id?: string | null;
};

export type LessonActivityChartRow = {
  label: string;
  key: string;
  total: number;
  completedOnTime: number;
  rescheduled: number;
};

function summarizeBucket(lessons: LessonActivityLesson[]) {
  const completed = lessons.filter((l) => l.status === "completed");
  const onTime = completed.filter((l) => !l.replaces_lesson_id);
  const rescheduled = completed.filter((l) => !!l.replaces_lesson_id);

  const completedOnTime = onTime.reduce((s, l) => s + (l.duration_hours ?? 0), 0);
  const rescheduledHours = rescheduled.reduce((s, l) => s + (l.duration_hours ?? 0), 0);

  return {
    total: completedOnTime + rescheduledHours,
    completedOnTime,
    rescheduled: rescheduledHours,
  };
}

export function buildLessonActivityChartData(
  lessons: LessonActivityLesson[],
  range: AnalyticsRange
): LessonActivityChartRow[] {
  let earliest: Date | undefined;
  for (const lesson of lessons) {
    const t = new Date(lesson.scheduled_at);
    if (Number.isNaN(t.getTime())) continue;
    if (!earliest || t < earliest) earliest = t;
  }

  const windows = getTimeBucketWindows(range, earliest);

  return windows.map((w) => {
    const slice = lessons.filter((l) => inDateWindow(l.scheduled_at, w.from, w.to));
    return {
      label: w.label,
      key: w.key,
      ...summarizeBucket(slice),
    };
  });
}
