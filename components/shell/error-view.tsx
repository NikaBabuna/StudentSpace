/* =============================================================================
 * shell/error-view.tsx — shared error boundary UI
 * -----------------------------------------------------------------------------
 * Presentational error card used by all route error.tsx boundaries, so they
 * look consistent. Each boundary keeps its own Sentry reporting and passes
 * `onRetry` (the boundary's reset) + the right "home" destination.
 * ========================================================================== */
"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

export function ErrorView({
  title = "Something went wrong",
  description = "An unexpected error occurred. You can try again or head back.",
  onRetry,
  homeHref = "/dashboard",
  homeLabel = "Go to dashboard",
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  homeHref?: string;
  homeLabel?: string;
}) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center bg-bg px-4">
      <div className="w-full max-w-[420px] rounded-2xl border border-line bg-surface p-8 text-center shadow-[var(--shadow)]">
        <h2 className="font-serif text-[24px] tracking-[-0.01em] text-ink">{title}</h2>
        <p className="mt-2 mb-6 text-sm leading-relaxed text-ink-2">{description}</p>
        <div className="flex flex-col gap-2">
          {onRetry ? (
            <Button onClick={onRetry} className="w-full">
              Try again
            </Button>
          ) : null}
          <Button asChild variant="secondary" className="w-full">
            <Link href={homeHref}>{homeLabel}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
