/* =============================================================================
 * app/settings/access/loading.tsx — settings access loading boundary
 * -----------------------------------------------------------------------------
 * Role: ShellSkeleton while /settings/access loads.
 * Dependencies: components/shell/loading-skeleton
 * ========================================================================== */
import { ShellSkeleton } from "@/components/shell/loading-skeleton";

export default function SettingsLoading() {
  return <ShellSkeleton />;
}
