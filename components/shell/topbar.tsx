/* =============================================================================
 * shell/topbar.tsx — sticky top bar
 * -----------------------------------------------------------------------------
 * The thin bar above page content: a breadcrumb on the left, the theme toggle
 * (and any page-specific actions) on the right. Rendered by <AppShell>.
 *
 * Mockup-only chrome that we intentionally skip: the "View as" role switcher and
 * the HCI "concepts" toggle — neither maps to real functionality.
 * ========================================================================== */
import * as React from "react";

import { ThemeToggle } from "./theme-toggle";
import { SidebarTrigger } from "./mobile-nav";

export type Breadcrumb = { root: string; leaf?: string };

export function Topbar({
  breadcrumb,
  actions,
}: {
  breadcrumb?: Breadcrumb;
  /** Optional right-aligned actions, shown before the theme toggle. */
  actions?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-[62px] items-center justify-between gap-3 border-b border-line bg-surface/80 px-4 backdrop-blur-md lg:gap-5 lg:px-7">
      <div className="flex min-w-0 flex-1 items-center gap-2 text-sm text-muted">
        <SidebarTrigger className="-ml-1 shrink-0 lg:hidden" />
        {breadcrumb ? (
          <>
            <span className="whitespace-nowrap font-mono text-[12px] uppercase tracking-[0.05em]">
              {breadcrumb.root}
            </span>
            {breadcrumb.leaf ? (
              <>
                <span className="opacity-50">/</span>
                <span className="truncate font-semibold text-ink">{breadcrumb.leaf}</span>
              </>
            ) : null}
          </>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {actions}
        <ThemeToggle />
      </div>
    </header>
  );
}
