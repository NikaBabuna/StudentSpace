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
import { Topbar, type Breadcrumb } from "./topbar";

type AppShellProps = SidebarProps & {
  children: React.ReactNode;
  breadcrumb?: Breadcrumb;
  topbarActions?: React.ReactNode;
};

export function AppShell({
  children,
  breadcrumb,
  topbarActions,
  ...sidebar
}: AppShellProps) {
  return (
    <div className="grid min-h-screen grid-cols-[248px_1fr] bg-bg">
      <Sidebar {...sidebar} />
      <div className="flex min-h-screen min-w-0 flex-col">
        <Topbar breadcrumb={breadcrumb} actions={topbarActions} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
