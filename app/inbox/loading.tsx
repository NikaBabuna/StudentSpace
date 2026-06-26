/* =============================================================================
 * app/inbox/loading.tsx — inbox loading boundary
 * -----------------------------------------------------------------------------
 * Role: ShellSkeleton while /inbox page data loads.
 * Dependencies: components/shell/loading-skeleton
 * ========================================================================== */
import { ShellSkeleton } from "@/components/shell/loading-skeleton";

export default function InboxLoading() {
  return <ShellSkeleton />;
}
