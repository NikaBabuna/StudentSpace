/* =============================================================================
 * features/employer/components/EmployerComingSoon.tsx — org portal placeholder
 * -----------------------------------------------------------------------------
 * Role: Shared "coming in the next update" placeholder for every employer
 *       (organisation) tab while the portal is still being built. Replaces the
 *       previous per-page ad-hoc markup with one design-system component.
 * Dependencies: components/ui/badge, components/shell/page-container
 * Used by: app/employer/{page,analytics,inbox,settings} routes
 * Inputs: title, optional icon + description
 * Outputs: Header bar + centered "next update" card
 * ========================================================================== */
import * as React from "react";

import { Badge } from "@/components/ui/badge";

export function EmployerComingSoon({
  title,
  icon,
  description,
}: {
  title: string;
  icon?: React.ReactNode;
  description?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Tab header — mirrors the main app's page header rhythm */}
      <header className="shrink-0 border-b border-line px-5 py-4 sm:px-7">
        <h1 className="font-serif text-[22px] leading-tight tracking-[-0.01em] text-ink">
          {title}
        </h1>
        <p className="mt-0.5 text-[12.5px] text-muted">Coming soon</p>
      </header>

      <div className="flex flex-1 items-center justify-center overflow-y-auto p-6">
        <div className="w-full max-w-[440px] rounded-2xl border border-line bg-surface p-8 text-center shadow-[var(--shadow-sm)]">
          {icon ? (
            <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-2xl bg-accent-tint text-accent">
              {icon}
            </div>
          ) : null}
          <Badge tone="accent">Next update</Badge>
          <h2 className="mt-3 font-serif text-[24px] leading-snug tracking-[-0.01em] text-ink">
            {title} is on the way
          </h2>
          <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">
            {description ??
              "This part of the organisation portal is still being built. It’ll arrive in a future update."}
          </p>
        </div>
      </div>
    </div>
  );
}
