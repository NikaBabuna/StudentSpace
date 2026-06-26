/* =============================================================================
 * ui/toast.tsx — transient confirmation
 * -----------------------------------------------------------------------------
 * A presentational pill pinned to the bottom-center, with an optional inline
 * action (e.g. "Undo"). The parent controls visibility (render it when needed);
 * it inverts ink/bg so it stands out on either theme.
 * ========================================================================== */
import * as React from "react";

import { cn } from "@/lib/utils";

const DOT_TONE = {
  ok: "bg-ok",
  danger: "bg-danger",
  accent: "bg-accent",
} as const;

type ToastProps = {
  message: React.ReactNode;
  tone?: keyof typeof DOT_TONE;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

function Toast({ message, tone = "ok", actionLabel, onAction, className }: ToastProps) {
  return (
    <div
      role="status"
      className={cn(
        "fixed bottom-7 left-1/2 z-[90] flex -translate-x-1/2 items-center gap-3.5 rounded-2xl bg-ink px-4 py-3 text-bg shadow-[var(--shadow)] [animation:toastIn_.3s_ease_both]",
        className
      )}
    >
      <span className={cn("size-2 rounded-full", DOT_TONE[tone])} />
      <span className="text-sm font-medium">{message}</span>
      {actionLabel ? (
        <button
          type="button"
          onClick={onAction}
          className="px-1.5 py-0.5 text-sm font-semibold text-accent"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export { Toast };
