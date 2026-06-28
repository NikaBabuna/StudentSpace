/* =============================================================================
 * shell/app-shell.tsx — the in-app frame
 * -----------------------------------------------------------------------------
 * Replaces the old components/layout/AppLayout. Lays out a fixed sidebar and a
 * scrolling content column with a sticky topbar:
 *
 *     ┌────────────┬─────────────────────────────┐
 *     │            │ Topbar (breadcrumb + theme) │
 *     │  Sidebar   ├─────────────────────────────┤
 *     │            │ main (scrolls)              │
 *     └────────────┴─────────────────────────────┘
 *
 * Props mirror the old AppLayout (so callers change only the import + tag),
 * with an added optional `breadcrumb` and `topbarActions` for the topbar.
 * Server-component friendly: it renders the client Sidebar/Topbar as children.
 * ========================================================================== */
import * as React from "react";

import { Sidebar, type SidebarProps } from "./sidebar";
import { ShellTopbar } from "./shell-topbar";
import { Topbar, type Breadcrumb } from "./topbar";
import { MobileNavProvider } from "./mobile-nav";

type AppShellProps = SidebarProps & {
  children: React.ReactNode;
  breadcrumb?: Breadcrumb;
  /** When true, breadcrumb is derived from the current pathname (dashboard shell layout). */
  autoBreadcrumb?: boolean;
  topbarActions?: React.ReactNode;
};

export function AppShell({
  children,
  breadcrumb,
  autoBreadcrumb,
  topbarActions,
  ...sidebar
}: AppShellProps) {
  return (
    // Below `lg` the sidebar is an off-canvas drawer (handled inside <Sidebar>),
    // so the shell is a single column; at `lg`+ it becomes the fixed two-col grid.
    <MobileNavProvider>
      <div className="min-h-screen bg-bg lg:grid lg:grid-cols-[248px_1fr]">
        <Sidebar {...sidebar} />
        <div className="flex min-h-screen min-w-0 flex-col">
          {autoBreadcrumb ? (
            <ShellTopbar actions={topbarActions} />
          ) : (
            <Topbar breadcrumb={breadcrumb} actions={topbarActions} />
          )}
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </MobileNavProvider>
  );
}
