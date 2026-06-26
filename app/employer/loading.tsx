/* =============================================================================
 * app/employer/loading.tsx — employer portal loading boundary
 * -----------------------------------------------------------------------------
 * Role: Next.js Suspense fallback — full ShellSkeleton while employer pages load.
 * Dependencies: components/shell/loading-skeleton (ShellSkeleton)
 * Used by: Next.js for /employer/* routes during navigation
 * Outputs: Placeholder shell UI
 * ========================================================================== */
import { ShellSkeleton } from "@/components/shell/loading-skeleton";

export default function EmployerLoading() {
  return <ShellSkeleton />;
}
