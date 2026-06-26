/* =============================================================================
 * ui/icon-button.tsx — square, icon-only button
 * -----------------------------------------------------------------------------
 * For toolbar/utility actions (close, settings, theme toggle). Always pass an
 * `aria-label` since there is no visible text.
 * ========================================================================== */
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const iconButtonVariants = cva(
  "inline-flex items-center justify-center rounded-lg border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-55 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        ghost: "border-transparent text-ink-2 hover:bg-surface-2 hover:text-ink",
        secondary:
          "border-line bg-surface text-ink-2 hover:bg-surface-2 hover:text-ink",
      },
      size: { sm: "size-8", md: "size-9", lg: "size-10" },
    },
    defaultVariants: { variant: "ghost", size: "md" },
  }
);

type IconButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof iconButtonVariants>;

function IconButton({ className, variant, size, ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      className={cn(iconButtonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { IconButton };
