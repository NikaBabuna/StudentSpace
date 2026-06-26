/* =============================================================================
 * ui/skeleton.tsx — loading placeholder block
 * -----------------------------------------------------------------------------
 * A pulsing surface block used to build loading skeletons. Size/shape it with
 * className (height, width, rounding).
 * ========================================================================== */
import * as React from "react";

import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div aria-hidden className={cn("animate-pulse rounded-lg bg-surface-2", className)} {...props} />
  );
}
