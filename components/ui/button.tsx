/* =============================================================================
 * ui/button.tsx — the one button
 * -----------------------------------------------------------------------------
 * Token-driven button. All button styling in the app lives here; screens pick a
 * `variant` + `size` instead of hand-rolling inline styles.
 *
 *   variant: primary (accent fill) | secondary (surface + hairline) |
 *            ghost (text only) | destructive (danger tint)
 *   size:    sm | md | lg
 *   busy:    shows a spinner and disables the button (for async actions)
 *   asChild: render as a child element (e.g. a Next <Link>) while keeping styles
 * ========================================================================== */
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

export const buttonVariants = cva(
  "relative inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border font-medium whitespace-nowrap transition-[filter,background-color,border-color,color] outline-none select-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-55 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "border-transparent bg-accent text-accent-ink shadow-[var(--shadow-sm)] hover:brightness-[1.06]",
        secondary: "border-line bg-surface text-ink hover:bg-surface-2",
        ghost: "border-transparent text-ink-2 hover:bg-surface-2 hover:text-ink",
        destructive:
          "border-transparent bg-danger-tint text-danger hover:brightness-[1.05]",
      },
      size: {
        sm: "h-9 px-3 text-[13px]",
        md: "h-11 px-4 text-sm",
        lg: "h-12 px-5 text-[15px]",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    /** Show a spinner and disable interaction while an action is in flight. */
    busy?: boolean;
  };

function Button({
  className,
  variant,
  size,
  asChild = false,
  busy = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      className={cn(buttonVariants({ variant, size }), className)}
      // Slot forwards to an arbitrary child (often a non-<button>), so only set
      // the native disabled attribute when we actually render a <button>.
      disabled={asChild ? undefined : disabled || busy}
      aria-busy={busy || undefined}
      {...props}
    >
      {/* Slot (asChild) requires exactly one child, so don't inject a spinner
       * sibling there — only the plain <button> form shows the busy spinner. */}
      {asChild ? (
        children
      ) : (
        <>
          {busy ? <Spinner /> : null}
          {children}
        </>
      )}
    </Comp>
  );
}

export { Button };
