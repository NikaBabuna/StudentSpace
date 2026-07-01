/* =============================================================================
 * ui/input.tsx — text input
 * -----------------------------------------------------------------------------
 * 44px token-styled input with focus ring and aria-invalid styling. Pair with
 * <Field> for label + error, or use standalone.
 * ========================================================================== */
import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-xl border border-line-2 bg-surface px-3.5 text-sm text-ink transition-colors outline-none placeholder:text-muted",
        "hover:bg-surface-2",
        "focus-visible:border-accent focus-visible:bg-surface focus-visible:ring-2 focus-visible:ring-accent/30",
        "disabled:pointer-events-none disabled:opacity-55",
        "aria-invalid:border-danger aria-invalid:ring-2 aria-invalid:ring-danger/25",
        className
      )}
      {...props}
    />
  );
}

export { Input };
