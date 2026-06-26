/* =============================================================================
 * ui/spinner.tsx — inline busy indicator
 * -----------------------------------------------------------------------------
 * A tiny spinning ring that inherits `currentColor`, so it matches whatever
 * text/button color it sits inside. Used by <Button busy> and anywhere an
 * inline loading state is needed.
 * ========================================================================== */
import * as React from "react";
import { cn } from "@/lib/utils";

export function Spinner({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent align-[-2px]",
        className
      )}
      {...props}
    />
  );
}
