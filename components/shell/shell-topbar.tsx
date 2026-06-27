/* =============================================================================
 * shell/shell-topbar.tsx — topbar with pathname-driven breadcrumb
 * -----------------------------------------------------------------------------
 * Client wrapper for routes under the persistent dashboard shell layout. Reads
 * the current pathname and maps it to a breadcrumb label — no server round-trip
 * per navigation.
 * ========================================================================== */
"use client";

import { usePathname } from "next/navigation";

import { breadcrumbForPath } from "./breadcrumbs";
import { Topbar } from "./topbar";

export function ShellTopbar({ actions }: { actions?: React.ReactNode }) {
  const pathname = usePathname();
  return <Topbar breadcrumb={breadcrumbForPath(pathname)} actions={actions} />;
}
