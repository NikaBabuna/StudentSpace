/* =============================================================================
 * features/dashboard/components/EarningsAnalytics.tsx — earnings section
 * ----------------------------------------------------------------------------- */
"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { IconButton } from "@/components/ui/icon-button";
import { CloseIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { classColor } from "@/features/calendar/lib/calendar-utils";
import AnalyticsRangePicker from "@/features/dashboard/components/AnalyticsRangePicker";
import type { AnalyticsRange } from "@/features/dashboard/lib/analytics-aggregation";
import { useChartFocus } from "@/features/dashboard/hooks/use-chart-focus";
import {
  buildClassEarningsSummaries,
  buildEarningsChartData,
  buildProjectedPayouts,
  computeHourlyRate,
  formatShortDate,
  type EarningsCycle,
  type EarningsLesson,
  type ProjectedPayout,
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
  const [showProjections, setShowProjections] = useState(false);
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

  // Next projected cycle payout per class, from the scheduled-lesson pipeline.
  // Not scoped to the range picker: it's a forward-looking view of what each
  // class will next pay out, and by when, if its already-scheduled lessons
  // are completed. At most one entry per class (buildProjectedPayouts stops
  // at the next cycle close — it doesn't chain further future cycles).
  const payouts = useMemo(
    () => buildProjectedPayouts(tutorClasses, cycles, lessons, convert),
    [tutorClasses, cycles, lessons, convert]
  );
  const projectedTotal = payouts.reduce((s, p) => s + p.amount, 0);
  // The headline date is the LAST class's next cycle to close — "if every
  // class completes what's already scheduled, this is the total, and this
  // is the day the last of it lands."
  const lastPayout = payouts[payouts.length - 1] ?? null;

  const payoutByClass = useMemo(() => {
    const map = new Map<string, ProjectedPayout>();
    for (const p of payouts) map.set(p.classId, p);
    return map;
  }, [payouts]);

  const totalEarned = summaries.reduce((s, c) => s + c.earnedInPeriod, 0);

  const hourlyRate = useMemo(
    () => computeHourlyRate(cycles, lessons, earningsRange, convert),
    [cycles, lessons, earningsRange, convert]
  );

  return (
    <AnalyticsChartCard
      title="Earnings"
      description="Paid cycles, projected income from scheduled lessons, and per-class breakdown"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <AnalyticsRangePicker range={earningsRange} onChange={setEarningsRange} />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-muted">Currency</span>
          <select
            value={currency}
            onChange={(e) => onCurrencyChange(e.target.value)}
            className="h-9 rounded-xl border border-line-2 bg-surface px-3 text-[12px] text-ink outline-none transition-colors hover:bg-surface-2 focus-visible:border-accent focus-visible:bg-surface focus-visible:ring-2 focus-visible:ring-accent/30"
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
        <button
          type="button"
          onClick={() => setShowProjections(true)}
          disabled={payouts.length === 0}
          className="group -m-1 rounded-lg p-1 text-left transition-colors hover:bg-surface-2 disabled:cursor-default disabled:hover:bg-transparent"
        >
          <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted">
            {lastPayout ? `Projected · by ${formatShortDate(lastPayout.date)}` : "Projected"}
          </div>
          <div className="inline-flex items-center gap-1.5 font-serif text-[22px] text-warn">
            {projectedTotal > 0 ? `${sym}${Math.round(projectedTotal)}` : "—"}
            {payouts.length > 0 ? (
              <span className="text-[14px] text-muted transition-colors group-hover:text-accent">›</span>
            ) : null}
          </div>
          {payouts.length > 0 ? (
            <div className="mt-0.5 text-[11px] text-muted group-hover:text-accent">
              {payouts.length} {payouts.length === 1 ? "class" : "classes"} · view breakdown
            </div>
          ) : null}
        </button>
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
              {(() => {
                const p = payoutByClass.get(row.classId);
                if (!row.isOpen || !p) return null;
                return (
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-warn">
                      Next cycle · {sym}
                      {Math.round(p.amount)} by {formatShortDate(p.date)}
                    </span>
                    <Badge tone="warn" className="text-[9px]">
                      Cycle {p.cycleNumber}
                    </Badge>
                  </div>
                );
              })()}
            </button>
          );
        })}
      </div>

      {showProjections ? (
        <ProjectionsDialog
          payouts={payouts}
          sym={sym}
          total={projectedTotal}
          onClose={() => setShowProjections(false)}
        />
      ) : null}
    </AnalyticsChartCard>
  );
}

/** Breakdown of projected cycle payouts — which class earns what, and by when. */
function ProjectionsDialog({
  payouts,
  sym,
  total,
  onClose,
}: {
  payouts: ProjectedPayout[];
  sym: string;
  total: number;
  onClose: () => void;
}) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-[520px] flex-col overflow-hidden rounded-2xl border border-line bg-bg shadow-[var(--shadow)]"
        role="dialog"
        aria-labelledby="projections-title"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 id="projections-title" className="text-[17px] font-semibold text-ink">
              Projected earnings
            </h2>
            <p className="mt-0.5 text-[12px] text-muted">
              Each class&apos;s next cycle, based on lessons already scheduled
            </p>
          </div>
          <IconButton aria-label="Close" onClick={onClose}>
            <CloseIcon size={16} />
          </IconButton>
        </div>

        <div className="flex flex-col gap-2 overflow-y-auto p-5">
          {payouts.length === 0 ? (
            <p className="text-[13px] text-muted">
              No class has enough scheduled lessons to close its next cycle yet.
            </p>
          ) : (
            payouts.map((p, i) => {
              const color = classColor(p.classId);
              return (
                <div
                  key={`${p.classId}-${p.cycleNumber}-${i}`}
                  className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-3.5 py-3"
                >
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: color.bar }} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold text-ink">{p.title}</div>
                    <div className="text-[12px] text-muted">
                      Cycle {p.cycleNumber} · closes {formatShortDate(p.date)}
                    </div>
                  </div>
                  <div className="shrink-0 font-serif text-[16px] text-ink">
                    {sym}
                    {Math.round(p.amount)}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {payouts.length > 0 ? (
          <div className="flex shrink-0 items-center justify-between border-t border-line px-5 py-4">
            <span className="text-[13px] text-muted">Total projected</span>
            <span className="font-serif text-[20px] text-warn">
              {sym}
              {Math.round(total)}
            </span>
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
