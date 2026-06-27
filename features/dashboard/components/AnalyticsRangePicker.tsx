/* =============================================================================
 * features/dashboard/components/AnalyticsRangePicker.tsx — shared time range control
 * ----------------------------------------------------------------------------- */
"use client";

import { cn } from "@/lib/utils";
import type { AnalyticsRange } from "@/features/dashboard/lib/analytics-aggregation";

const RANGES: { label: string; value: AnalyticsRange }[] = [
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Year", value: "year" },
  { label: "All time", value: "all" },
];

export default function AnalyticsRangePicker({
  range,
  onChange,
  className,
}: {
  range: AnalyticsRange;
  onChange: (range: AnalyticsRange) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex rounded-lg border border-line bg-surface-2 p-0.5", className)}>
      {RANGES.map((r) => (
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
