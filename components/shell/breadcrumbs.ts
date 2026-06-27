/* =============================================================================
 * shell/breadcrumbs.ts — pathname → topbar breadcrumb map
 * -----------------------------------------------------------------------------
 * Used by the persistent dashboard shell layout so each page doesn't pass its
 * own breadcrumb prop (which would require re-rendering the whole AppShell).
 * ========================================================================== */
import type { Breadcrumb } from "./topbar";

const BREADCRUMBS: Record<string, Breadcrumb> = {
  "/dashboard": { root: "Dashboard" },
  "/dashboard/classes": { root: "My classes" },
  "/dashboard/analytics": { root: "Analytics" },
  "/calendar": { root: "Calendar" },
  "/inbox": { root: "Inbox" },
  "/settings/access": { root: "Settings", leaf: "Access & accounts" },
  "/settings/preferences": { root: "Settings", leaf: "Preferences" },
  "/classes/new": { root: "Classes", leaf: "New class" },
};

export function breadcrumbForPath(pathname: string): Breadcrumb | undefined {
  return BREADCRUMBS[pathname];
}
