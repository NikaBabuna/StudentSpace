/* =============================================================================
 * shell/loading-skeleton.tsx — route loading placeholders
 * -----------------------------------------------------------------------------
 * Each skeleton mirrors the layout of its target page so the transition from
 * placeholder → content is a settle, not a re-flow.
 *
 *   ShellSkeleton          — full page when entering a class from outside
 *   ShellContentSkeleton   — generic fallback (prefer page-specific exports)
 *   DashboardHomeSkeleton, ClassesListSkeleton, … — per-route shapes
 *   Class*Skeleton         — in-class tab shapes (under classes/[id]/layout)
 * ========================================================================== */
import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer } from "@/components/shell/page-container";
import { cn } from "@/lib/utils";

/* ---- Shared primitives ---------------------------------------------------- */

function SidebarSkeleton() {
  return (
    <div className="hidden flex-col gap-5 border-r border-line bg-surface p-4 lg:flex">
      <div className="flex items-center gap-2.5 px-1 py-1">
        <Skeleton className="size-7 rounded-lg" />
        <Skeleton className="h-4 w-28" />
      </div>
      <Skeleton className="h-11 w-full rounded-xl" />
      <div className="flex flex-col gap-1.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-9 w-full rounded-lg" />
        ))}
      </div>
      <div className="mt-auto">
        <Skeleton className="h-14 w-full rounded-xl" />
      </div>
    </div>
  );
}

function HeaderSkeleton({
  eyebrow = false,
  action = false,
}: {
  eyebrow?: boolean;
  action?: boolean;
}) {
  return (
    <div className="mb-7 flex items-end justify-between gap-5">
      <div className="min-w-0 flex-1">
        {eyebrow ? <Skeleton className="h-3 w-36" /> : null}
        <Skeleton className={cn(eyebrow ? "mt-2.5" : "", "h-9 w-56 max-w-full")} />
        <Skeleton className="mt-2.5 h-4 w-72 max-w-full" />
      </div>
      {action ? <Skeleton className="h-11 w-32 shrink-0 rounded-xl" /> : null}
    </div>
  );
}

function StatRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-[92px] rounded-2xl" />
      ))}
    </div>
  );
}

function PanelSkeleton({
  height = "h-72",
  titleWidth = "w-36",
}: {
  height?: string;
  titleWidth?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-line bg-surface p-[22px]", height)}>
      <Skeleton className={cn("h-4", titleWidth)} />
      <div className="mt-5 flex flex-col gap-3.5">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function ClassCardSkeleton() {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="mb-3 flex items-center gap-2.5">
        <Skeleton className="size-10 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="mt-1.5 h-3 w-1/2" />
        </div>
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

function ListRowSkeleton() {
  return <Skeleton className="h-[62px] w-full rounded-xl" />;
}

function CardBlockSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="mt-2 h-3.5 w-64 max-w-full" />
      <div className="mt-5 flex flex-col gap-2.5">
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} className="h-11 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/* ---- Full-page shell (entering a class from outside) ---------------------- */

export function ShellSkeleton() {
  return (
    <div className="min-h-screen bg-bg lg:grid lg:grid-cols-[248px_1fr]">
      <SidebarSkeleton />
      <div className="flex min-w-0 flex-col">
        <div className="h-[62px] border-b border-line" />
        <PageContainer className="pb-16 pt-[34px]">
          <div className="mb-6 flex items-start gap-4">
            <Skeleton className="size-[52px] shrink-0 rounded-[14px]" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-2 h-8 w-56" />
              <Skeleton className="mt-2 h-4 w-40" />
            </div>
          </div>
          <ClassOverviewSkeleton />
        </PageContainer>
      </div>
    </div>
  );
}

/* ---- Dashboard shell routes ----------------------------------------------- */

export function DashboardHomeSkeleton() {
  return (
    <PageContainer>
      <HeaderSkeleton eyebrow action />
      <StatRowSkeleton />
      <div className="mt-8 grid grid-cols-1 gap-[18px] lg:grid-cols-[1.45fr_1fr]">
        <div className="min-h-[300px] rounded-2xl border border-line bg-surface p-[22px]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-8 w-[148px] rounded-xl" />
          </div>
          <div className="flex flex-col gap-3.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4 border-t border-line py-3.5 first:border-t-0 first:pt-0">
                <div className="w-[88px] shrink-0 text-right">
                  <Skeleton className="ml-auto h-4 w-14" />
                  <Skeleton className="ml-auto mt-1 h-3 w-10" />
                </div>
                <Skeleton className="w-0.5 shrink-0 self-stretch rounded-sm" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="mt-1.5 h-3 w-1/2" />
                </div>
                <Skeleton className="h-5 w-14 shrink-0 rounded-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="min-h-[300px] rounded-2xl border border-line bg-surface p-[22px]">
          <Skeleton className="h-4 w-28" />
          <div className="mt-5 flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-10 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="mt-1.5 h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-[18px] min-h-[220px] rounded-2xl border border-line bg-surface p-[22px]">
        <Skeleton className="h-4 w-44" />
        <div className="mt-5 flex flex-col gap-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </PageContainer>
  );
}

export function ClassesListSkeleton() {
  return (
    <PageContainer>
      <HeaderSkeleton action />
      <section className="mb-9">
        <Skeleton className="mb-3 h-3 w-32" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ClassCardSkeleton />
          <ClassCardSkeleton />
        </div>
      </section>
      <section className="mb-9">
        <Skeleton className="mb-3 h-3 w-36" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ClassCardSkeleton />
        </div>
      </section>
    </PageContainer>
  );
}

export function AnalyticsSkeleton() {
  return (
    <PageContainer>
      <HeaderSkeleton action />
      <div className="mt-2 flex gap-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-lg" />
        ))}
      </div>
      <div className="mt-6 flex flex-col gap-4">
        <StatRowSkeleton />
        <Skeleton className="h-[300px] w-full rounded-2xl" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-[280px] rounded-2xl" />
          <Skeleton className="h-[280px] rounded-2xl" />
        </div>
        <Skeleton className="h-[300px] w-full rounded-2xl" />
        <Skeleton className="h-[200px] w-full rounded-2xl" />
        <Skeleton className="h-[360px] w-full rounded-2xl" />
      </div>
    </PageContainer>
  );
}

export function CalendarSkeleton() {
  return (
    <PageContainer>
      <HeaderSkeleton action />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Skeleton className="h-10 w-[140px] rounded-xl" />
        <div className="flex items-center gap-1.5">
          <Skeleton className="size-8 rounded-lg" />
          <Skeleton className="h-5 w-44" />
          <Skeleton className="size-8 rounded-lg" />
          <Skeleton className="ml-1 h-8 w-16 rounded-lg" />
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="flex border-b border-line">
          <div className="w-[52px] shrink-0" />
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1 px-2 py-2.5">
              <Skeleton className="h-2.5 w-6" />
              <Skeleton className="size-6 rounded-full" />
            </div>
          ))}
        </div>
        <Skeleton className="h-[480px] w-full rounded-none" />
      </div>
    </PageContainer>
  );
}

export function InboxSkeleton() {
  return (
    <PageContainer>
      <HeaderSkeleton />
      <div className="flex max-w-2xl flex-col gap-8">
        <section>
          <Skeleton className="mb-3 h-3 w-28" />
          <div className="flex flex-col gap-2.5">
            <CardBlockSkeleton lines={2} />
            <CardBlockSkeleton lines={2} />
          </div>
        </section>
        <section>
          <Skeleton className="mb-3 h-3 w-36" />
          <div className="flex flex-col gap-2">
            <ListRowSkeleton />
            <ListRowSkeleton />
          </div>
        </section>
      </div>
    </PageContainer>
  );
}

export function AccessSettingsSkeleton() {
  return (
    <PageContainer>
      <HeaderSkeleton />
      <div className="flex max-w-xl flex-col gap-6">
        <CardBlockSkeleton lines={4} />
        <CardBlockSkeleton lines={2} />
      </div>
    </PageContainer>
  );
}

export function PreferencesSkeleton() {
  return (
    <PageContainer>
      <HeaderSkeleton />
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-line-2 px-6 py-16">
        <Skeleton className="size-10 rounded-xl" />
        <Skeleton className="mt-4 h-5 w-40" />
        <Skeleton className="mt-2 h-4 w-64 max-w-full" />
      </div>
    </PageContainer>
  );
}

export function NewClassSkeleton() {
  return (
    <PageContainer className="max-w-[660px]">
      <div className="mb-7">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-56" />
      </div>
      <div className="mb-7 flex items-center gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-1 items-center gap-2">
            <Skeleton className="size-7 shrink-0 rounded-full" />
            <Skeleton className="hidden h-3 w-16 sm:block" />
            {i < 4 ? <Skeleton className="mx-1 h-px flex-1" /> : null}
          </div>
        ))}
      </div>
      <div className="min-h-[300px] rounded-2xl border border-line bg-surface p-7">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-3 h-11 w-full rounded-xl" />
        <Skeleton className="mt-5 h-4 w-16" />
        <div className="mt-3 flex flex-wrap gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-20 rounded-[11px]" />
          ))}
        </div>
        <Skeleton className="mt-5 h-4 w-14" />
        <div className="mt-3 flex flex-wrap gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-24 rounded-[11px]" />
          ))}
        </div>
      </div>
    </PageContainer>
  );
}

/** @deprecated Prefer page-specific skeleton exports. */
export function ShellContentSkeleton() {
  return <DashboardHomeSkeleton />;
}

/* ---- Class tab routes (inside classes/[id]/layout) ------------------------ */

export function ClassOverviewSkeleton() {
  return (
    <div className="flex flex-col gap-[18px]">
      <StatRowSkeleton />
      <div className="grid gap-[18px] lg:grid-cols-2">
        <PanelSkeleton height="min-h-[200px]" titleWidth="w-28" />
        <PanelSkeleton height="min-h-[200px]" titleWidth="w-32" />
      </div>
      <PanelSkeleton height="min-h-[240px]" titleWidth="w-36" />
    </div>
  );
}

export function ClassHomeworkSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="mb-1 flex items-center justify-between gap-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-32 rounded-lg" />
      </div>
      <Skeleton className="mb-2 h-3 w-16" />
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-line bg-surface p-4">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="mt-2 h-5 w-28 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ClassScheduleSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-2xl border border-line bg-surface p-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 border-t border-line px-3 py-4 first:border-t-0">
              <div className="w-28 shrink-0">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="mt-1.5 h-3 w-20" />
              </div>
              <Skeleton className="h-10 w-0.5 shrink-0 rounded-sm" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-1.5 h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-4">
          <CardBlockSkeleton lines={2} />
          <CardBlockSkeleton lines={3} />
        </div>
      </div>
    </div>
  );
}

export function ClassMaterialsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-line bg-surface">
            <div className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="size-5 shrink-0 rounded" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ClassChatSkeleton() {
  return (
    <div className="flex h-[min(520px,calc(100dvh-18rem))] flex-col overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="flex shrink-0 items-center gap-2.5 border-b border-line px-5 py-3.5">
        <Skeleton className="size-2 rounded-full" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="ml-auto h-3.5 w-20" />
      </div>
      <div className="flex flex-1 flex-col gap-3 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-line" />
          <Skeleton className="h-2.5 w-16" />
          <div className="h-px flex-1 bg-line" />
        </div>
        <div className="flex max-w-[70%] flex-col gap-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-14 w-56 rounded-[15px_15px_15px_5px]" />
        </div>
        <div className="ml-auto flex max-w-[70%] flex-col items-end gap-1">
          <Skeleton className="h-10 w-44 rounded-[15px_15px_5px_15px]" />
        </div>
        <div className="flex max-w-[70%] flex-col gap-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-16 w-64 rounded-[15px_15px_15px_5px]" />
        </div>
      </div>
      <div className="shrink-0 border-t border-line px-5 py-3.5">
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
    </div>
  );
}

/** @deprecated Use ClassOverviewSkeleton or a tab-specific export. */
export function ContentSkeleton() {
  return <ClassOverviewSkeleton />;
}
