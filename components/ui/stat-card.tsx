/* =============================================================================
 * ui/stat-card.tsx — headline metric
 * -----------------------------------------------------------------------------
 * The dashboard stat tile: a mono uppercase label, a large serif numeral, and
 * an optional colored delta line. Identical cards in a row read as one group.
 * ========================================================================== */
import * as React from "react";

import { cn } from "@/lib/utils";

const DELTA_TONE = {
  up: "text-ok",
  down: "text-danger",
  accent: "text-accent",
  muted: "text-muted",
} as const;

type StatCardProps = {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Optional sub-line (e.g. "+3 this week"). */
  delta?: React.ReactNode;
  deltaTone?: keyof typeof DELTA_TONE;
  className?: string;
};

function StatCard({ label, value, delta, deltaTone = "muted", className }: StatCardProps) {
  return (
    <div className={cn("rounded-2xl border border-line bg-surface p-[18px]", className)}>
      <div className="mb-3 font-mono text-[12px] uppercase tracking-[0.04em] text-muted">
        {label}
      </div>
      <div className="font-serif text-[34px] leading-none tracking-[-0.01em] text-ink">
        {value}
      </div>
      {delta != null ? (
        <div className={cn("mt-2 text-[12.5px] font-medium", DELTA_TONE[deltaTone])}>
          {delta}
        </div>
      ) : null}
    </div>
  );
}

export { StatCard };
