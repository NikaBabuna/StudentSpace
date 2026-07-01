/* =============================================================================
 * ui/textarea.tsx — multi-line text input
 * -----------------------------------------------------------------------------
 * Same visual language as <Input>, taller, vertically resizable.
 * ========================================================================== */
import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-[88px] w-full resize-y rounded-xl border border-line-2 bg-surface px-3.5 py-2.5 text-sm leading-relaxed text-ink transition-colors outline-none placeholder:text-muted",
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

export { Textarea };
