/* =============================================================================
 * shell/page.tsx — page layout helpers
 * -----------------------------------------------------------------------------
 * Small building blocks every in-app screen uses, so spacing/max-width and the
 * page-title pattern are defined once.
 *
 *   <PageContainer>            — centered, padded content column (max 1200px)
 *   <PageHeader title sub action> — the serif title + sub + right-aligned action
 * ========================================================================== */
import * as React from "react";

import { cn } from "@/lib/utils";

export function PageContainer({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mx-auto w-full max-w-[1200px] px-6 py-8 md:px-10", className)}
      {...props}
    />
  );
}

export function PageHeader({
  eyebrow,
  title,
  sub,
  action,
  className,
}: {
  /** Small mono uppercase line above the title (e.g. a date). */
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  sub?: React.ReactNode;
  /** Right-aligned action (usually a primary <Button>). */
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-7 flex items-end justify-between gap-5", className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <div className="mb-2 font-mono text-[12px] uppercase tracking-[0.06em] text-muted">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="font-serif text-[32px] leading-[1.05] tracking-[-0.01em] text-ink">
          {title}
        </h1>
        {sub ? <p className="mt-1.5 text-[15px] text-ink-2">{sub}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
