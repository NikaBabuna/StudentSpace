/* =============================================================================
 * shell/loading-skeleton.tsx — route loading placeholders
 * -----------------------------------------------------------------------------
 * Two shapes used by loading.tsx files:
 *   • ShellSkeleton   — full page (sidebar + topbar + content) for routes whose
 *                       page renders its own AppShell (dashboard, inbox, …).
 *   • ContentSkeleton — content-only, for routes loaded inside an existing shell
 *                       (the class tabs, which sit under classes/[id]/layout).
 * ========================================================================== */
import { Skeleton } from "@/components/ui/skeleton";

export function ShellSkeleton() {
  return (
    <div className="grid min-h-screen grid-cols-[248px_1fr] bg-bg">
      <div className="flex flex-col gap-4 border-r border-line bg-surface p-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-11 w-full" />
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      </div>
      <div className="flex flex-col">
        <div className="h-[62px] border-b border-line" />
        <div className="mx-auto w-full max-w-[1200px] px-10 py-8">
          <Skeleton className="h-9 w-64" />
          <div className="mt-6 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ContentSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-6 py-8 md:px-10">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
