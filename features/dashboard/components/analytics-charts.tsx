/* =============================================================================
 * features/dashboard/components/analytics-charts.tsx — Recharts wrappers
 * ----------------------------------------------------------------------------- */
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  BarChart as RechartsBarChart,
  Rectangle,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  HomeworkChartRow,
  NamedValue,
} from "@/features/dashboard/lib/analytics-aggregation";
import type { EarningsChartRow } from "@/features/dashboard/lib/earnings-aggregation";
import type { LessonActivityChartRow } from "@/features/dashboard/lib/lesson-activity-aggregation";
import { classColor } from "@/features/calendar/lib/calendar-utils";

type ChartTheme = {
  accent: string;
  ok: string;
  okMuted: string;
  warn: string;
  danger: string;
  muted: string;
  ink: string;
  ink2: string;
  line: string;
  surface: string;
};

const FALLBACK_THEME: ChartTheme = {
  accent: "oklch(0.72 0.14 266)",
  ok: "oklch(0.72 0.13 158)",
  okMuted: "oklch(0.72 0.13 158 / 0.55)",
  warn: "oklch(0.78 0.12 75)",
  danger: "oklch(0.68 0.16 25)",
  muted: "oklch(0.62 0.02 265)",
  ink: "oklch(0.93 0.01 265)",
  ink2: "oklch(0.78 0.02 265)",
  line: "oklch(0.34 0.02 265)",
  surface: "oklch(0.22 0.02 265)",
};

/** Add an alpha channel to a functional color (oklch()/rgb()/hsl() tokens). */
function withAlpha(color: string, alpha: number) {
  return color.replace(/\)\s*$/, ` / ${alpha})`);
}

function useChartTheme(): ChartTheme {
  const [theme, setTheme] = useState(FALLBACK_THEME);

  useEffect(() => {
    function read() {
      const root = document.documentElement;
      const get = (name: string) => getComputedStyle(root).getPropertyValue(name).trim();
      setTheme({
        accent: get("--accent") || FALLBACK_THEME.accent,
        ok: get("--ok") || FALLBACK_THEME.ok,
        okMuted: get("--ok") ? withAlpha(get("--ok"), 0.55) : FALLBACK_THEME.okMuted,
        warn: get("--warn") || FALLBACK_THEME.warn,
        danger: get("--danger") || FALLBACK_THEME.danger,
        muted: get("--muted") || FALLBACK_THEME.muted,
        ink: get("--ink") || FALLBACK_THEME.ink,
        ink2: get("--ink-2") || FALLBACK_THEME.ink2,
        line: get("--line") || FALLBACK_THEME.line,
        surface: get("--surface-2") || FALLBACK_THEME.surface,
      });
    }
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return theme;
}

/** Full category band shown behind the hovered bar or bucket. */
function CategoryBandCursor({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  theme,
}: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  theme: ChartTheme;
}) {
  if (width <= 0 || height <= 0) return null;
  return (
    <Rectangle
      x={x}
      y={y}
      width={width}
      height={height}
      fill={theme.accent}
      fillOpacity={0.06}
      stroke={theme.accent}
      strokeOpacity={0.35}
      strokeWidth={1}
      strokeDasharray="4 3"
      radius={4}
    />
  );
}

function categoryBandCursorElement(theme: ChartTheme) {
  return <CategoryBandCursor theme={theme} />;
}

function lineCursor(theme: ChartTheme) {
  return {
    stroke: theme.muted,
    strokeOpacity: 0.45,
    strokeDasharray: "4 4",
    strokeWidth: 1,
  };
}

function activeBarStyle() {
  return { filter: "brightness(1.06)" };
}

const CHART_MARGIN = { top: 8, right: 12, left: 8, bottom: 0 } as const;
const BAR_CHART_MARGIN = { top: 8, right: 12, left: 8, bottom: 24 } as const;

function chartShellClassName() {
  return cn(
    "w-full select-none outline-none",
    "[&_.recharts-wrapper]:outline-none [&_.recharts-surface]:outline-none [&_svg]:outline-none",
    "[&_.recharts-wrapper]:focus:outline-none [&_*]:focus:outline-none [&_*]:focus-visible:outline-none"
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  theme,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string; dataKey: string }[];
  label?: string | number;
  theme: ChartTheme;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl border px-3 py-2.5 shadow-[var(--shadow-md)]"
      style={{ borderColor: theme.line, background: theme.surface }}
    >
      {label ? (
        <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider" style={{ color: theme.muted }}>
          {label}
        </div>
      ) : null}
      <div className="flex flex-col gap-1">
        {payload.map((p) => (
          <div key={p.dataKey} className="flex items-center justify-between gap-4 text-[12px]">
            <span className="flex items-center gap-1.5" style={{ color: theme.ink2 }}>
              <span className="size-2 rounded-sm" style={{ background: p.color }} />
              {p.name}
            </span>
            <span className="font-medium tabular-nums" style={{ color: theme.ink }}>
              {typeof p.value === "number" && p.value % 1 !== 0 ? p.value.toFixed(1) : p.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EarningsTooltip({
  active,
  payload,
  label,
  theme,
  currencySymbol,
  classTitles,
  focusClassId,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string; dataKey: string }[];
  label?: string | number;
  theme: ChartTheme;
  currencySymbol: string;
  classTitles: Record<string, string>;
  focusClassId?: string | null;
}) {
  if (!active || !payload?.length) return null;

  const total = payload.find((p) => p.dataKey === "total");
  const focusKey = focusClassId ? `c_${focusClassId}` : null;
  const focusRow = focusKey ? payload.find((p) => p.dataKey === focusKey) : null;

  if (focusClassId && focusRow) {
    const title = classTitles[focusClassId] ?? focusRow.name;
    const color = focusRow.color;
    return (
      <div
        className="rounded-xl border px-3 py-2.5 shadow-[var(--shadow-md)]"
        style={{ borderColor: theme.line, background: theme.surface }}
      >
        {label ? (
          <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider" style={{ color: theme.muted }}>
            {label}
          </div>
        ) : null}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-4 text-[12px]">
            <span className="flex items-center gap-1.5" style={{ color: theme.ink2 }}>
              <span className="size-2 rounded-full" style={{ background: color }} />
              {title}
            </span>
            <span className="font-medium tabular-nums" style={{ color: theme.ink }}>
              {currencySymbol}
              {Math.round(focusRow.value)}
            </span>
          </div>
          {total ? (
            <div className="flex items-center justify-between gap-4 text-[11px] opacity-50">
              <span style={{ color: theme.muted }}>of {currencySymbol}{Math.round(total.value)} total</span>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  const classRows = payload
    .filter((p) => p.dataKey.startsWith("c_") && p.value > 0)
    .sort((a, b) => b.value - a.value)
    .map((p) => ({
      title: classTitles[p.dataKey.slice(2)] ?? p.name,
      value: p.value,
      color: p.color,
    }));

  return (
    <div
      className="rounded-xl border px-3 py-2.5 shadow-[var(--shadow-md)]"
      style={{ borderColor: theme.line, background: theme.surface }}
    >
      {label ? (
        <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider" style={{ color: theme.muted }}>
          {label}
        </div>
      ) : null}
      <div className="flex flex-col gap-1">
        {total ? (
          <div className="flex items-center justify-between gap-4 text-[12px]">
            <span className="flex items-center gap-1.5" style={{ color: theme.ink2 }}>
              <span className="size-2 rounded-full" style={{ background: theme.ok }} />
              Total earned
            </span>
            <span className="font-medium tabular-nums" style={{ color: theme.ink }}>
              {currencySymbol}
              {Math.round(total.value)}
            </span>
          </div>
        ) : null}
        {classRows.map((row) => (
          <div key={row.title} className="flex items-center justify-between gap-4 text-[12px]">
            <span className="flex items-center gap-1.5" style={{ color: theme.ink2 }}>
              <span className="size-2 rounded-full" style={{ background: row.color }} />
              {row.title}
            </span>
            <span className="font-medium tabular-nums" style={{ color: theme.ink }}>
              {currencySymbol}
              {Math.round(row.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

type ChartInteractionState = {
  activePayload?: Array<{ dataKey?: string | number; value?: number }>;
  activeLabel?: string | number;
};

function classIdFromDataKey(dataKey?: string | number): string | null {
  if (typeof dataKey !== "string" || !dataKey.startsWith("c_")) return null;
  return dataKey.slice(2);
}

/** Hover highlights a class bar segment with earnings in the active bucket. */
function classIdFromChartHover(state: ChartInteractionState | null | undefined): string | null {
  const payload = state?.activePayload;
  if (!payload?.length) return null;
  const hit = [...payload]
    .reverse()
    .find((p) => classIdFromDataKey(p.dataKey) && Number(p.value) > 0);
  return classIdFromDataKey(hit?.dataKey);
}

export type LessonActivitySegment = "onTime" | "rescheduled";

function segmentDataKey(segment: LessonActivitySegment) {
  return segment === "onTime" ? "completedOnTime" : "rescheduled";
}

function segmentFromDataKey(dataKey?: string | number): LessonActivitySegment | null {
  if (dataKey === "completedOnTime") return "onTime";
  if (dataKey === "rescheduled") return "rescheduled";
  return null;
}

function segmentFromChartHover(state: ChartInteractionState | null | undefined): LessonActivitySegment | null {
  const payload = state?.activePayload;
  if (!payload?.length) return null;
  const hit = [...payload]
    .reverse()
    .find((p) => segmentFromDataKey(p.dataKey) && Number(p.value) > 0);
  return segmentFromDataKey(hit?.dataKey);
}

const EARNINGS_BAR_SIZE = 4;
const EARNINGS_ANIMATION_MS = 700;

/** Pill-shaped bar for per-bucket class earnings in focus mode. */
function RoundedEarningsBar(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
  fillOpacity?: number | string;
}) {
  const { x = 0, y = 0, width = 0, height = 0, fill, fillOpacity = 1 } = props;
  if (height <= 0 || width <= 0) return null;
  const radius = Math.min(width / 2, 2);
  const opacity = typeof fillOpacity === "number" ? fillOpacity : Number(fillOpacity) || 1;
  return (
    <Rectangle
      x={x}
      y={y}
      width={width}
      height={height}
      radius={radius}
      fill={fill}
      fillOpacity={opacity}
    />
  );
}

export function AnalyticsChartCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="flex-col items-start gap-1 pb-2">
        <CardTitle className="text-[15px]">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

const LESSON_ANIMATION_MS = 700;

function formatHours(value: number) {
  return value % 1 !== 0 ? `${value.toFixed(1)}h` : `${value}h`;
}

function LessonActivityTooltip({
  active,
  payload,
  label,
  theme,
  focusSegment,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string; dataKey: string }[];
  label?: string | number;
  theme: ChartTheme;
  focusSegment?: LessonActivitySegment | null;
}) {
  if (!active || !payload?.length) return null;

  const total = payload.find((p) => p.dataKey === "total");
  const onTime = payload.find((p) => p.dataKey === "completedOnTime");
  const rescheduled = payload.find((p) => p.dataKey === "rescheduled");
  const focusRow =
    focusSegment === "onTime"
      ? onTime
      : focusSegment === "rescheduled"
        ? rescheduled
        : null;

  if (focusSegment && focusRow) {
    const title = focusSegment === "onTime" ? "Completed on time" : "Completed on re-schedule";
    const color = focusSegment === "onTime" ? theme.ok : theme.warn;
    return (
      <div
        className="rounded-xl border px-3 py-2.5 shadow-[var(--shadow-md)]"
        style={{ borderColor: theme.line, background: theme.surface }}
      >
        {label ? (
          <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider" style={{ color: theme.muted }}>
            {label}
          </div>
        ) : null}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-4 text-[12px]">
            <span className="flex items-center gap-1.5" style={{ color: theme.ink2 }}>
              <span className="size-2 rounded-full" style={{ background: color }} />
              {title}
            </span>
            <span className="font-medium tabular-nums" style={{ color: theme.ink }}>
              {formatHours(focusRow.value)}
            </span>
          </div>
          {total ? (
            <div className="flex items-center justify-between gap-4 text-[11px] opacity-50">
              <span style={{ color: theme.muted }}>of {formatHours(total.value)} total</span>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border px-3 py-2.5 shadow-[var(--shadow-md)]"
      style={{ borderColor: theme.line, background: theme.surface }}
    >
      {label ? (
        <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider" style={{ color: theme.muted }}>
          {label}
        </div>
      ) : null}
      {total ? (
        <div className="flex items-center justify-between gap-4 text-[12px]">
          <span className="flex items-center gap-1.5" style={{ color: theme.ink2 }}>
            <span className="size-2 rounded-full" style={{ background: theme.accent }} />
            Hours completed
          </span>
          <span className="font-medium tabular-nums" style={{ color: theme.ink }}>
            {formatHours(total.value)}
          </span>
        </div>
      ) : null}
      {onTime && onTime.value > 0 ? (
        <div className="mt-1 flex items-center justify-between gap-4 text-[12px]">
          <span className="flex items-center gap-1.5" style={{ color: theme.ink2 }}>
            <span className="size-2 rounded-full" style={{ background: theme.ok }} />
            Completed on time
          </span>
          <span className="font-medium tabular-nums" style={{ color: theme.ink }}>
            {formatHours(onTime.value)}
          </span>
        </div>
      ) : null}
      {rescheduled && rescheduled.value > 0 ? (
        <div className="mt-1 flex items-center justify-between gap-4 text-[12px]">
          <span className="flex items-center gap-1.5" style={{ color: theme.ink2 }}>
            <span className="size-2 rounded-full" style={{ background: theme.warn }} />
            Completed on re-schedule
          </span>
          <span className="font-medium tabular-nums" style={{ color: theme.ink }}>
            {formatHours(rescheduled.value)}
          </span>
        </div>
      ) : null}
    </div>
  );
}

export function LessonActivityComposedChart({
  data,
  highlightSegment,
  pinnedSegment,
  onHoverSegment,
  onPinSegment,
  onClearFocus,
}: {
  data: LessonActivityChartRow[];
  highlightSegment: LessonActivitySegment | null;
  pinnedSegment: LessonActivitySegment | null;
  onHoverSegment: (segment: LessonActivitySegment | null) => void;
  onPinSegment: (segment: LessonActivitySegment | null) => void;
  onClearFocus: () => void;
}) {
  const theme = useChartTheme();
  const hasHours = data.some((d) => d.total > 0);
  const focusSegment = highlightSegment;
  const focusKey = focusSegment ? segmentDataKey(focusSegment) : null;
  const focusColor = focusSegment === "onTime" ? theme.ok : focusSegment === "rescheduled" ? theme.warn : null;
  const isFocus = !!focusSegment && !!focusKey && !!focusColor;

  const handleMouseMove = (state: ChartInteractionState) => {
    if (pinnedSegment) return;
    onHoverSegment(segmentFromChartHover(state));
  };

  const handleMouseLeave = () => {
    if (!pinnedSegment) onHoverSegment(null);
  };

  const handleBarClick = (segment: LessonActivitySegment, value: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (value <= 0) return;
    onPinSegment(segment);
  };

  const empty =
    data.length === 0 || !data.some((d) => d.total > 0 || d.completedOnTime > 0 || d.rescheduled > 0);

  // Segment order stays STABLE across focus changes — reordering stacked Bar
  // children breaks Recharts' stack layout (see EarningsComposedChart).
  const segments = useMemo(
    () => [
      { id: "onTime" as const, dataKey: "completedOnTime", name: "Completed on time", fill: theme.ok },
      { id: "rescheduled" as const, dataKey: "rescheduled", name: "Completed on re-schedule", fill: theme.warn },
    ],
    [theme.ok, theme.warn]
  );

  return (
    <div className={cn("h-[320px] w-full", chartShellClassName())}>
      {empty ? (
        <div className="flex h-full items-center justify-center text-[13px] text-muted">
          No lesson activity in this period.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={CHART_MARGIN}
            barCategoryGap="32%"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={onClearFocus}
          >
            <defs>
              <linearGradient id="lessonHoursGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={theme.accent}
                  stopOpacity={isFocus ? 0.08 : hasHours ? 0.22 : 0.08}
                />
                <stop offset="100%" stopColor={theme.accent} stopOpacity={0} />
              </linearGradient>
              {isFocus && focusColor && focusKey ? (
                <linearGradient id={`lessonFocus-${focusKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={focusColor} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={focusColor} stopOpacity={0.02} />
                </linearGradient>
              ) : null}
            </defs>
            <CartesianGrid stroke={theme.line} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: theme.muted, fontSize: 10 }}
              axisLine={{ stroke: theme.line }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: theme.muted, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={36}
              tickFormatter={(v) => `${v}h`}
            />
            <Tooltip
              cursor={lineCursor(theme)}
              content={({ active, payload, label }) => (
                <LessonActivityTooltip
                  active={active}
                  label={label}
                  theme={theme}
                  focusSegment={focusSegment}
                  payload={payload?.map((p) => ({
                    name: String(p.name ?? ""),
                    value: Number(p.value ?? 0),
                    color: String(p.color ?? theme.muted),
                    dataKey: String(p.dataKey ?? ""),
                  }))}
                />
              )}
            />
            {segments.map((segment) => (
              <Bar
                key={segment.dataKey}
                dataKey={segment.dataKey}
                name={segment.name}
                stackId="lessonHours"
                fill={segment.fill}
                fillOpacity={isFocus && focusSegment !== segment.id ? 0.3 : 0.92}
                maxBarSize={EARNINGS_BAR_SIZE}
                barSize={EARNINGS_BAR_SIZE}
                legendType="none"
                shape={RoundedEarningsBar}
                isAnimationActive={false}
                onClick={(row, _index, e) => {
                  const payload = row as { payload?: Record<string, number> };
                  const value = Number(payload.payload?.[segment.dataKey] ?? 0);
                  handleBarClick(segment.id, value, e);
                }}
              />
            ))}
            <Area
              type="monotone"
              dataKey="total"
              name="Hours completed"
              stroke={theme.accent}
              fill="url(#lessonHoursGradient)"
              strokeWidth={2}
              strokeOpacity={isFocus ? 0.25 : hasHours ? 0.85 : 0.35}
              fillOpacity={1}
              legendType="none"
              dot={false}
              activeDot={{ r: 4, fill: theme.accent, strokeWidth: 0 }}
              animationDuration={LESSON_ANIMATION_MS}
              style={{ pointerEvents: "none" }}
            />
            {isFocus && focusKey && focusColor ? (
              <Area
                type="monotone"
                dataKey={focusKey}
                name={focusSegment === "onTime" ? "Completed on time" : "Completed on re-schedule"}
                stroke={focusColor}
                fill={`url(#lessonFocus-${focusKey})`}
                strokeWidth={2}
                fillOpacity={1}
                legendType="none"
                dot={false}
                activeDot={{ r: 4, fill: focusColor, strokeWidth: 0 }}
                animationDuration={LESSON_ANIMATION_MS}
                style={{ pointerEvents: "none" }}
              />
            ) : null}
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function LessonActivitySegmentLegend({
  highlightSegment,
  pinnedSegment,
  onHoverSegment,
  onPinSegment,
}: {
  highlightSegment: LessonActivitySegment | null;
  pinnedSegment: LessonActivitySegment | null;
  onHoverSegment?: (segment: LessonActivitySegment | null) => void;
  onPinSegment?: (segment: LessonActivitySegment | null) => void;
}) {
  const theme = useChartTheme();
  const effectiveHighlight = pinnedSegment ?? highlightSegment;
  const segments: { id: LessonActivitySegment; label: string; color: string }[] = [
    { id: "onTime", label: "Completed on time", color: theme.ok },
    { id: "rescheduled", label: "Completed on re-schedule", color: theme.warn },
  ];

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="flex items-center gap-1.5 text-[11px] text-muted">
        <span className="size-2 rounded-full bg-accent" />
        Total hours
      </span>
      {segments.map((segment) => {
        const active = effectiveHighlight === segment.id;
        return (
          <button
            key={segment.id}
            type="button"
            data-lesson-activity-pin=""
            onMouseEnter={() => onHoverSegment?.(segment.id)}
            onMouseLeave={() => onHoverSegment?.(null)}
            onClick={() => onPinSegment?.(segment.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] transition-all",
              effectiveHighlight && !active ? "opacity-35" : "opacity-100",
              active ? "font-medium text-ink" : "text-muted hover:text-ink-2"
            )}
          >
            <span className="size-2 rounded-full" style={{ background: segment.color }} />
            {segment.label}
          </button>
        );
      })}
    </div>
  );
}

function percentBarColor(value: number, theme: ChartTheme, invert = false) {
  if (invert) {
    if (value === 0) return theme.ok;
    if (value <= 15) return theme.warn;
    return theme.danger;
  }
  if (value >= 85) return theme.ok;
  if (value >= 70) return theme.warn;
  return theme.danger;
}

export function PercentBarChart({
  data,
  description,
  invert = false,
}: {
  data: NamedValue[];
  description?: string;
  invert?: boolean;
}) {
  const theme = useChartTheme();
  const colored = data.map((d) => ({
    ...d,
    fill: percentBarColor(d.value, theme, invert),
  }));

  return (
    <div className={cn("h-[280px] w-full", chartShellClassName())}>
      {data.length === 0 ? (
        <div className="flex h-full items-center justify-center text-[13px] text-muted">
          {description ?? "No data yet."}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart data={colored} margin={BAR_CHART_MARGIN}>
            <CartesianGrid stroke={theme.line} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: theme.muted, fontSize: 10 }}
              axisLine={{ stroke: theme.line }}
              tickLine={false}
              interval={0}
              angle={data.length > 4 ? -24 : 0}
              textAnchor={data.length > 4 ? "end" : "middle"}
              height={data.length > 4 ? 52 : 32}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: theme.muted, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
              width={48}
            />
            <Tooltip
              cursor={categoryBandCursorElement(theme)}
              content={({ active, payload, label }) => (
                <ChartTooltip
                  active={active}
                  label={label}
                  theme={theme}
                  payload={payload?.map((p) => ({
                    name: "Rate",
                    value: p.value as number,
                    color: (p.payload as { fill: string }).fill,
                    dataKey: "value",
                  }))}
                />
              )}
            />
            <Bar
              dataKey="value"
              name="Rate"
              radius={[6, 6, 0, 0]}
              maxBarSize={48}
              activeBar={activeBarStyle()}
            >
              {colored.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Bar>
          </RechartsBarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function HomeworkStackedChart({
  data,
  legend,
}: {
  data: HomeworkChartRow[];
  legend: { key: keyof HomeworkChartRow; label: string; color: string }[];
}) {
  const theme = useChartTheme();
  const keys = legend.filter((l) => l.key !== "name");

  return (
    <div className={cn("h-[300px] w-full", chartShellClassName())}>
      {data.length === 0 ? (
        <div className="flex h-full items-center justify-center text-[13px] text-muted">
          No homework in this period.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart data={data} margin={BAR_CHART_MARGIN}>
            <CartesianGrid stroke={theme.line} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: theme.muted, fontSize: 10 }}
              axisLine={{ stroke: theme.line }}
              tickLine={false}
              interval={0}
              angle={data.length > 3 ? -20 : 0}
              textAnchor={data.length > 3 ? "end" : "middle"}
              height={data.length > 3 ? 48 : 32}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: theme.muted, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <Tooltip content={<ChartTooltip theme={theme} />} cursor={categoryBandCursorElement(theme)} />
            <Legend wrapperStyle={{ fontSize: 11, color: theme.muted, paddingTop: 8 }} iconType="circle" iconSize={8} />
            {keys.map((item) => (
              <Bar
                key={item.key}
                dataKey={item.key}
                name={item.label}
                stackId="hw"
                fill={item.color}
                radius={item.key === "overdue" ? [6, 6, 0, 0] : undefined}
                maxBarSize={56}
                activeBar={activeBarStyle()}
              />
            ))}
          </RechartsBarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function EarningsComposedChart({
  data,
  classes,
  highlightClassId,
  pinnedClassId,
  onHoverClassId,
  onPinClassId,
  onClearFocus,
  currencySymbol,
}: {
  data: EarningsChartRow[];
  classes: { id: string; title: string }[];
  highlightClassId: string | null;
  pinnedClassId: string | null;
  onHoverClassId: (id: string | null) => void;
  onPinClassId: (id: string | null) => void;
  onClearFocus: () => void;
  currencySymbol: string;
}) {
  const theme = useChartTheme();
  const hasPaidEarnings = data.some((d) => d.total > 0);
  const classTitles = Object.fromEntries(classes.map((c) => [c.id, c.title]));
  const focusClassId = highlightClassId;
  const focusKey = focusClassId ? `c_${focusClassId}` : null;
  const focusPalette = focusClassId ? classColor(focusClassId) : null;
  const isFocus = !!focusClassId && !!focusKey && !!focusPalette;

  const handleMouseMove = (state: ChartInteractionState) => {
    if (pinnedClassId) return;
    onHoverClassId(classIdFromChartHover(state));
  };

  const handleMouseLeave = () => {
    if (!pinnedClassId) onHoverClassId(null);
  };

  const handleChartClick = () => {
    onClearFocus();
  };

  const handleBarClick = (classId: string, value: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (value <= 0) return;
    onPinClassId(classId);
  };

  return (
    <div className={cn("h-[320px] w-full", chartShellClassName())}>
      {data.length === 0 ? (
        <div className="flex h-full items-center justify-center text-[13px] text-muted">
          No earnings data for this period yet.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={CHART_MARGIN}
            barCategoryGap="32%"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={handleChartClick}
          >
            <defs>
              <linearGradient id="earningsTotalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={theme.ok}
                  stopOpacity={isFocus ? 0.08 : hasPaidEarnings ? 0.22 : 0.08}
                />
                <stop offset="100%" stopColor={theme.ok} stopOpacity={0} />
              </linearGradient>
              {isFocus && focusClassId ? (
                <linearGradient id={`earningsFocus-${focusClassId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={focusPalette!.bar} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={focusPalette!.bar} stopOpacity={0.02} />
                </linearGradient>
              ) : null}
            </defs>
            <CartesianGrid stroke={theme.line} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: theme.muted, fontSize: 10 }}
              axisLine={{ stroke: theme.line }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: theme.muted, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${currencySymbol}${v}`}
              width={48}
            />
            <Tooltip
              cursor={lineCursor(theme)}
              content={({ active, payload, label }) => (
                <EarningsTooltip
                  active={active}
                  label={label}
                  theme={theme}
                  currencySymbol={currencySymbol}
                  classTitles={classTitles}
                  focusClassId={focusClassId}
                  payload={payload?.map((p) => ({
                    name: String(p.name ?? ""),
                    value: Number(p.value ?? 0),
                    color: String(p.color ?? theme.muted),
                    dataKey: String(p.dataKey ?? ""),
                  }))}
                />
              )}
            />
            {/* Bar order must stay STABLE across focus changes: reordering
              * children that share a stackId makes Recharts drop the stack
              * layout and render stray side-by-side bars. Focus emphasis
              * comes from dimming + the overlay area instead. */}
            {classes.map((cls) => {
              const color = classColor(cls.id);
              const key = `c_${cls.id}`;
              const dimmed = isFocus && focusClassId !== cls.id;
              return (
                <Bar
                  key={cls.id}
                  dataKey={key}
                  name={cls.title}
                  stackId="earnings"
                  fill={color.bar}
                  fillOpacity={dimmed ? 0.3 : 0.92}
                  maxBarSize={EARNINGS_BAR_SIZE}
                  barSize={EARNINGS_BAR_SIZE}
                  legendType="none"
                  shape={RoundedEarningsBar}
                  isAnimationActive={false}
                  onClick={(row, _index, e) => {
                    const payload = row as { payload?: Record<string, number> };
                    const value = Number(payload.payload?.[key] ?? 0);
                    handleBarClick(cls.id, value, e);
                  }}
                />
              );
            })}
            <Area
              type="monotone"
              dataKey="total"
              name="Total earned"
              stroke={theme.ok}
              fill="url(#earningsTotalGradient)"
              strokeWidth={2}
              strokeOpacity={isFocus ? 0.25 : hasPaidEarnings ? 0.85 : 0.35}
              fillOpacity={1}
              legendType="none"
              dot={false}
              activeDot={{ r: 4, fill: theme.ok, strokeWidth: 0 }}
              animationDuration={EARNINGS_ANIMATION_MS}
              style={{ pointerEvents: "none" }}
            />
            {isFocus && focusKey && focusPalette ? (
              <Area
                type="monotone"
                dataKey={focusKey}
                name={classTitles[focusClassId] ?? "Class"}
                stroke={focusPalette.bar}
                fill={`url(#earningsFocus-${focusClassId})`}
                strokeWidth={2}
                fillOpacity={1}
                legendType="none"
                dot={false}
                activeDot={{ r: 4, fill: focusPalette.bar, strokeWidth: 0 }}
                animationDuration={EARNINGS_ANIMATION_MS}
                style={{ pointerEvents: "none" }}
              />
            ) : null}
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function ClassFocusChartLegend({
  classes,
  highlightClassId,
  pinnedClassId,
  totalLabel,
  totalDotClassName = "bg-ok",
  onHoverClassId,
  onPinClassId,
  pinAttribute = "data-chart-pin",
  className,
}: {
  classes: { id: string; title: string }[];
  highlightClassId: string | null;
  pinnedClassId: string | null;
  totalLabel: string;
  totalDotClassName?: string;
  onHoverClassId?: (id: string | null) => void;
  onPinClassId?: (id: string | null) => void;
  pinAttribute?: string;
  className?: string;
}) {
  const effectiveHighlight = pinnedClassId ?? highlightClassId;

  return (
    <div className={cn("mt-3 flex flex-wrap items-center gap-x-3 gap-y-2", className)}>
      {totalLabel ? (
        <span className="flex items-center gap-1.5 text-[11px] text-muted">
          <span className={cn("size-2 rounded-full", totalDotClassName)} />
          {totalLabel}
        </span>
      ) : null}
      {classes.map((cls) => {
        const color = classColor(cls.id);
        const active = effectiveHighlight === cls.id;
        return (
          <button
            key={cls.id}
            type="button"
            {...{ [pinAttribute]: "" }}
            onMouseEnter={() => onHoverClassId?.(cls.id)}
            onMouseLeave={() => onHoverClassId?.(null)}
            onClick={() => onPinClassId?.(cls.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] transition-all",
              effectiveHighlight && !active ? "opacity-35" : "opacity-100",
              active ? "font-medium text-ink" : "text-muted hover:text-ink-2"
            )}
          >
            <span className="size-2 rounded-full" style={{ background: color.bar }} />
            {cls.title}
          </button>
        );
      })}
    </div>
  );
}

export function hwLegendTutor(theme: ChartTheme) {
  return [
    { key: "feedback" as const, label: "Feedback given", color: theme.ok },
    { key: "submitted" as const, label: "Submitted", color: theme.okMuted },
    { key: "pending" as const, label: "Pending", color: theme.warn },
    { key: "overdue" as const, label: "Past due", color: theme.danger },
  ];
}

export function hwLegendStudent(theme: ChartTheme) {
  return [
    { key: "feedback" as const, label: "Feedback received", color: theme.ok },
    { key: "submitted" as const, label: "Submitted", color: theme.okMuted },
    { key: "pending" as const, label: "Pending", color: theme.warn },
    { key: "overdue" as const, label: "Missed", color: theme.danger },
  ];
}

export { useChartTheme };
