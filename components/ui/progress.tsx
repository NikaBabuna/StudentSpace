/* =============================================================================
 * ui/progress.tsx — horizontal progress bar
 * -----------------------------------------------------------------------------
 * Accent-filled track for syllabus completion, payment cycles, etc. `value` is
 * a 0–100 percentage (clamped). Override the fill via `barClassName`.
 * ========================================================================== */
import * as React from "react";

import { cn } from "@/lib/utils";

type ProgressProps = {
  value: number;
  className?: string;
  barClassName?: string;
};

function Progress({ value, className, barClassName }: ProgressProps) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-3", className)}
    >
      <div
        className={cn("h-full rounded-full bg-accent transition-[width] duration-500", barClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export { Progress };
