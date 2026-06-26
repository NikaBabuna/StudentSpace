/* =============================================================================
 * app/classes/[id]/loading.tsx — in-class tab loading boundary
 * -----------------------------------------------------------------------------
 * Role: Lighter ContentSkeleton inside the class shell when switching tabs.
 * Dependencies: components/shell/loading-skeleton (ContentSkeleton)
 * Used by: Next.js for nested routes under /classes/[id]/*
 * ========================================================================== */
import { ContentSkeleton } from "@/components/shell/loading-skeleton";

export default function ClassLoading() {
  return <ContentSkeleton />;
}
