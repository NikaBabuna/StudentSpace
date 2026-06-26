/* =============================================================================
 * ui/empty-state.tsx — empty / zero-data placeholder
 * -----------------------------------------------------------------------------
 * Centered icon + title + description + optional action, inside a dashed
 * border. Used wherever a list has no items yet.
 * ========================================================================== */
import * as React from "react";

import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
};

function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-2 px-6 py-14 text-center",
        className
      )}
    >
      {icon ? (
        <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-surface-2 text-muted">
          {icon}
        </div>
      ) : null}
      <div className="text-[15px] font-semibold text-ink">{title}</div>
      {description ? <p className="mt-1 max-w-sm text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export { EmptyState };
