/* =============================================================================
 * shell/loading-skeleton.tsx — route loading placeholders
 * -----------------------------------------------------------------------------
 * Shapes used by loading.tsx files. They deliberately mirror the real layouts
 * (sidebar rail, topbar, page header, stat row, panel grid) so the transition
 * from skeleton → content is a settle, not a re-flow — which reads as "fast".
 *
 *   • ShellSkeleton   — full page (sidebar + topbar + content) for routes whose
 *                       page renders its own AppShell (dashboard, inbox, class).
 *   • ContentSkeleton — content-only, for routes loaded inside an existing shell
 *                       (the class tabs, which sit under classes/[id]/layout).
 * ========================================================================== */
import { Skeleton } from "@/components/ui/skeleton";

/** The fixed left rail — same 248px width + sections as the real Sidebar. */
function SidebarSkeleton() {
  return (
    <div className="flex flex-col gap-5 border-r border-line bg-surface p-4">
      <div className="flex items-center gap-2.5 px-1 py-1">
        <Skeleton className="size-7 rounded-lg" />
        <Skeleton className="h-4 w-28" />
      </div>
      <Skeleton className="h-11 w-full rounded-xl" />
      <div className="flex flex-col gap-1.5">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-9 w-full rounded-lg" />
        ))}
      </div>
      <div className="mt-auto">
        <Skeleton className="h-14 w-full rounded-xl" />
      </div>
    </div>
  );
}

/** Page header (eyebrow + serif title + sub) and the right-aligned action. */
function HeaderSkeleton() {
  return (
    <div className="mb-7 flex items-end justify-between gap-5">
      <div>
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-2.5 h-9 w-72" />
        <Skeleton className="mt-2.5 h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-11 w-32 rounded-xl" />
    </div>
  );
}

/** Four stat cards in a responsive row. */
function StatRowSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-[92px] rounded-2xl" />
      ))}
    </div>
  );
}

export function ShellSkeleton() {
  return (
    <div className="grid min-h-screen grid-cols-[248px_1fr] bg-bg">
      <SidebarSkeleton />
      <div className="flex min-w-0 flex-col">
        <div className="h-[62px] border-b border-line" />
        <div className="mx-auto w-full max-w-[1200px] px-6 py-8 md:px-10">
          <HeaderSkeleton />
          <StatRowSkeleton />
          <div className="mt-[18px] grid grid-cols-1 gap-[18px] lg:grid-cols-[1.45fr_1fr]">
            <Skeleton className="h-72 rounded-2xl" />
            <Skeleton className="h-72 rounded-2xl" />
          </div>
          <Skeleton className="mt-[18px] h-56 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export function ContentSkeleton() {
  return (
    <div className="flex flex-col gap-[18px]">
      <StatRowSkeleton />
      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-2">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  );
}
