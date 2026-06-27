/* =============================================================================
 * features/dashboard/components/EarningsAnalytics.tsx — earnings section
 * ----------------------------------------------------------------------------- */
"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { classColor } from "@/features/calendar/lib/calendar-utils";
import AnalyticsRangePicker from "@/features/dashboard/components/AnalyticsRangePicker";
import type { AnalyticsRange } from "@/features/dashboard/lib/analytics-aggregation";
import { useChartFocus } from "@/features/dashboard/hooks/use-chart-focus";
import {
  buildClassEarningsSummaries,
  buildEarningsChartData,
  computeHourlyRate,
  formatShortDate,
  type EarningsCycle,
  type EarningsLesson,
} from "@/features/dashboard/lib/earnings-aggregation";
import {
  AnalyticsChartCard,
  ClassFocusChartLegend,
  EarningsComposedChart,
} from "@/features/dashboard/components/analytics-charts";

const SYMS: Record<string, string> = { GEL: "₾", USD: "$", EUR: "€", RUB: "₽" };

export default function EarningsAnalytics({
  tutorClasses,
  cycles,
  lessons,
  currency,
  onCurrencyChange,
  ratesLive,
  convert,
}: {
  tutorClasses: { id: string; title: string; cycle_hours?: number }[];
  cycles: EarningsCycle[];
  lessons: EarningsLesson[];
  currency: string;
  onCurrencyChange: (c: string) => void;
  ratesLive: boolean;
  convert: (amount: number, from: string) => number;
}) {
  const [earningsRange, setEarningsRange] = useState<AnalyticsRange>("month");
  const { pinned, highlight, clearFocus, pinFocus, hoverFocus } = useChartFocus<string>("data-earnings-pin");

  const sym = SYMS[currency] ?? currency;

  const summaries = useMemo(
    () => buildClassEarningsSummaries(tutorClasses, cycles, lessons, earningsRange, convert),
    [tutorClasses, cycles, lessons, earningsRange, convert]
  );

  const chartData = useMemo(
    () => buildEarningsChartData(tutorClasses, cycles, earningsRange, convert),
    [tutorClasses, cycles, earningsRange, convert]
  );

  const totalEarned = summaries.reduce((s, c) => s + c.earnedInPeriod, 0);
  const projectedTotal = summaries.reduce((s, c) => s + (c.isOpen ? c.projectedAmount : 0), 0);
  const nearestProjection = summaries
    .filter((c) => c.projectedDate && c.projectedAmount > 0)
    .sort((a, b) => (a.projectedDate!.getTime() > b.projectedDate!.getTime() ? 1 : -1))[0];

  const hourlyRate = useMemo(
    () => computeHourlyRate(cycles, lessons, earningsRange, convert),
    [cycles, lessons, earningsRange, convert]
  );

  return (
    <AnalyticsChartCard
      title="Earnings"
      description="Paid cycles, projections, and per-class breakdown over time"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <AnalyticsRangePicker range={earningsRange} onChange={setEarningsRange} />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-muted">Currency</span>
          <select
            value={currency}
            onChange={(e) => onCurrencyChange(e.target.value)}
            className="h-9 rounded-xl border border-line-2 bg-surface px-3 text-[12px] text-ink outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
          >
            <option value="GEL">GEL — Georgian Lari</option>
            <option value="USD">USD — US Dollar</option>
            <option value="EUR">EUR — Euro</option>
            <option value="RUB">RUB — Russian Ruble</option>
          </select>
          {ratesLive ? <span className="text-[11px] text-ok">Live rates</span> : null}
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted">Total earned</div>
          <div className="font-serif text-[22px] text-ink">
            {sym}
            {Math.round(totalEarned)}
          </div>
        </div>
        <div>
          <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted">
            {nearestProjection
              ? `Projected for ${formatShortDate(nearestProjection.projectedDate!)}`
              : "Projected"}
          </div>
          <div className="font-serif text-[22px] text-warn">
            {projectedTotal > 0 ? `${sym}${Math.round(projectedTotal)}` : "—"}
          </div>
        </div>
        <div>
          <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted">Mean hourly rate</div>
          <div className="font-serif text-[22px] text-ink">
            {hourlyRate != null ? `${sym}${hourlyRate.toFixed(1)}/h` : "—"}
          </div>
        </div>
      </div>

      <EarningsComposedChart
        data={chartData}
        classes={tutorClasses}
        highlightClassId={highlight}
        pinnedClassId={pinned}
        onHoverClassId={hoverFocus}
        onPinClassId={pinFocus}
        onClearFocus={clearFocus}
        currencySymbol={sym}
      />

      <ClassFocusChartLegend
        classes={tutorClasses}
        highlightClassId={highlight}
        pinnedClassId={pinned}
        totalLabel="Total earned"
        onHoverClassId={hoverFocus}
        onPinClassId={pinFocus}
        pinAttribute="data-earnings-pin"
      />

      {!chartData.some((d) => d.total > 0) && chartData.length > 0 ? (
        <p className="mt-2 text-[11px] text-muted">
          No paid cycles in this period — bars will fill when cycles are marked paid.
        </p>
      ) : (
        <p className="mt-2 text-[11px] text-muted">
          Hover a class to preview its contribution · click to lock · click anywhere else to release
        </p>
      )}

      <div className="mt-5 flex flex-col gap-2">
        {summaries.map((row) => {
          const color = classColor(row.classId);
          const pct =
            row.cycleTarget > 0
              ? Math.min(Math.round((row.cycleHours / row.cycleTarget) * 100), 100)
              : 0;
          const active = pinned === row.classId;
          const highlighted = highlight === row.classId;

          return (
            <button
              key={row.classId}
              type="button"
              data-earnings-pin=""
              onMouseEnter={() => hoverFocus(row.classId)}
              onMouseLeave={() => hoverFocus(null)}
              onClick={() => pinFocus(row.classId)}
              className={cn(
                "flex w-full flex-col gap-2.5 rounded-xl border px-4 py-3 text-left transition-colors",
                active
                  ? "border-accent/50 bg-accent-tint/40"
                  : highlighted
                    ? "border-line-2 bg-surface"
                    : "border-line bg-surface-2 hover:border-line-2 hover:bg-surface"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: color.bar }}
                  />
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-semibold text-ink">{row.title}</div>
                    <div className="mt-0.5 text-[12px] text-muted">
                      Cycle {row.cycleNumber} · {row.cycleHours}/{row.cycleTarget}h
                    </div>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[14px] font-semibold text-ink">
                    {sym}
                    {Math.round(row.earnedInPeriod)}
                  </div>
                  <div className="text-[11px] text-muted">earned in period</div>
                </div>
              </div>
              <Progress value={pct} className="h-1.5" />
              {row.isOpen && row.projectedAmount > 0 && row.projectedDate ? (
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-warn">
                    Projected for {formatShortDate(row.projectedDate)} · {sym}
                    {Math.round(row.projectedAmount)}
                  </span>
                  <Badge tone="warn" className="text-[9px]">
                    Open cycle
                  </Badge>
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </AnalyticsChartCard>
  );
}
