/* =============================================================================
 * app/classes/loading.tsx — entering a class route loading boundary
 * -----------------------------------------------------------------------------
 * Role: Full ShellSkeleton when navigating into /classes/* from outside (e.g.
 *       dashboard). Tab switches inside a class use classes/[id]/loading instead.
 * Dependencies: components/shell/loading-skeleton (ShellSkeleton)
 * Used by: Next.js for /classes segment during slow layout fetch
 * ========================================================================== */
import { ShellSkeleton } from "@/components/shell/loading-skeleton";

export default function ClassesLoading() {
  return <ShellSkeleton />;
}
