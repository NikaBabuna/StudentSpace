/* =============================================================================
 * app/dashboard/analytics/loading.tsx — analytics loading boundary
 * -----------------------------------------------------------------------------
 * Role: ShellSkeleton while /dashboard/analytics data loads.
 * Dependencies: components/shell/loading-skeleton
 * ========================================================================== */
import { ShellSkeleton } from "@/components/shell/loading-skeleton";

export default function AnalyticsLoading() {
  return <ShellSkeleton />;
}
