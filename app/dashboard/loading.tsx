/* =============================================================================
 * app/dashboard/loading.tsx — dashboard loading boundary
 * -----------------------------------------------------------------------------
 * Role: Suspense fallback with ShellSkeleton during /dashboard navigation.
 * Dependencies: components/shell/loading-skeleton
 * Used by: Next.js automatic loading UI for dashboard segment
 * ========================================================================== */
import { ShellSkeleton } from "@/components/shell/loading-skeleton";

export default function DashboardLoading() {
  return <ShellSkeleton />;
}
