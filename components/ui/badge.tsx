/* =============================================================================
 * ui/badge.tsx — status pill
 * -----------------------------------------------------------------------------
 * Small rounded label for statuses, counts, and tags. `tone` picks a
 * theme-aware tint background + matching text color.
 * ========================================================================== */
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11.5px] font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        accent: "bg-accent-tint text-accent",
        ok: "bg-ok-tint text-ok",
        warn: "bg-warn-tint text-warn",
        danger: "bg-danger-tint text-danger",
        neutral: "border border-line bg-surface-2 text-muted",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
);

type BadgeProps = React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>;

function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export { Badge, badgeVariants };
