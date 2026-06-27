/* =============================================================================
 * features/dashboard/components/LessonActivityAnalytics.tsx — lesson activity chart
 * ----------------------------------------------------------------------------- */
"use client";

import { useMemo } from "react";

import {
  LessonActivityComposedChart,
  LessonActivitySegmentLegend,
  type LessonActivitySegment,
} from "@/features/dashboard/components/analytics-charts";
import { useChartFocus } from "@/features/dashboard/hooks/use-chart-focus";
import type { AnalyticsRange } from "@/features/dashboard/lib/analytics-aggregation";
import {
  buildLessonActivityChartData,
  type LessonActivityLesson,
} from "@/features/dashboard/lib/lesson-activity-aggregation";

export default function LessonActivityAnalytics({
  lessons,
  range,
}: {
  lessons: LessonActivityLesson[];
  range: AnalyticsRange;
}) {
  const { pinned, highlight, clearFocus, pinFocus, hoverFocus } =
    useChartFocus<LessonActivitySegment>("data-lesson-activity-pin");

  const chartData = useMemo(() => buildLessonActivityChartData(lessons, range), [lessons, range]);

  const hasData = chartData.some((d) => d.total > 0 || d.completedOnTime > 0 || d.rescheduled > 0);

  return (
    <>
      <LessonActivityComposedChart
        data={chartData}
        highlightSegment={highlight}
        pinnedSegment={pinned}
        onHoverSegment={hoverFocus}
        onPinSegment={pinFocus}
        onClearFocus={clearFocus}
      />

      <LessonActivitySegmentLegend
        highlightSegment={highlight}
        pinnedSegment={pinned}
        onHoverSegment={hoverFocus}
        onPinSegment={pinFocus}
      />

      {hasData ? (
        <p className="mt-2 text-[11px] text-muted">
          Hover a segment to preview its hours · click to lock · click anywhere else to release
        </p>
      ) : (
        <p className="mt-2 text-[11px] text-muted">No lesson activity in this period.</p>
      )}
    </>
  );
}
