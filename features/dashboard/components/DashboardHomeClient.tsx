/* =============================================================================
 * features/dashboard/components/DashboardHomeClient.tsx — tutor dashboard home
 * -----------------------------------------------------------------------------
 * Role: Renders greeting, stat cards, upcoming lessons, homework attention,
 *       and class shortcuts. Data is preloaded by loadDashboardData().
 * Dependencies: class-shared (ClassCard), components/ui
 * Used by: app/(shell)/dashboard/page.tsx
 * Inputs: Serializable props from server loader (stats, classes, sessions)
 * Outputs: Interactive dashboard home (links, no mutations here)
 * ========================================================================== */
"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";

import type {
  DashboardClassRow,
  HomeworkAttentionRow,
  UpcomingSessionRow,
} from "@/lib/dashboard-data";
import type { DashboardStat } from "@/lib/dashboard-stats";
import { PageContainer, PageHeader } from "@/components/shell/page-container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PlusIcon, ClassesIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import {
  getRecentClassVisitsSnapshot,
  getServerRecentClassVisits,
  sortClassesByRecency,
  sortItemsByClassRecency,
  subscribeRecentClassVisits,
} from "@/lib/recent-classes";

function PanelCard({
  title,
  headerRight,
  children,
  className,
}: {
  title: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-line bg-surface p-[22px]", className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
        {headerRight}
      </div>
      {children}
    </section>
  );
}

const UPCOMING_PREVIEW_LIMIT = 4;
const CLASS_PREVIEW_COUNT = 4;
const HOMEWORK_PREVIEW_COUNT = 3;

/** Shared "See all (N)" footer row — same treatment in every preview panel. */
function SeeAllRow({ href, count }: { href: string; count: number }) {
  return (
    <div className="border-t border-line pt-3">
      <Link href={href} className="text-[13px] font-semibold text-accent hover:underline">
        See all ({count})
      </Link>
    </div>
  );
}

function LessonsToggle({
  value,
  onChange,
}: {
  value: "today" | "overall";
  onChange: (value: "today" | "overall") => void;
}) {
  const opts: { key: "today" | "overall"; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "overall", label: "Overall" },
  ];

  return (
    <div className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface-2 p-1">
      {opts.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors",
            value === o.key
              ? "bg-surface text-ink shadow-[var(--shadow-sm)]"
              : "text-muted hover:text-ink-2"
          )}
          aria-pressed={value === o.key}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function UpcomingRow({
  session,
  showWhen,
}: {
  session: UpcomingSessionRow;
  showWhen: boolean;
}) {
  return (
    <Link
      href={`/classes/${session.classId}/schedule`}
      className="flex gap-4 border-t border-line py-3.5 first:border-t-0 first:pt-0 transition-colors hover:opacity-90"
    >
      <div className="min-w-[88px] text-right">
        <div className="text-[15px] font-semibold text-ink">{showWhen ? session.when : session.time}</div>
        <div className="font-mono text-[12px] text-muted">{session.duration}</div>
      </div>
      <div className="w-[3px] shrink-0 rounded-sm bg-accent" />
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold text-ink">{session.title}</div>
        <div className="text-[13px] text-ink-2">{session.sub}</div>
      </div>
      <Badge tone={session.tagTone} className="h-fit shrink-0 font-mono text-[11px] uppercase tracking-[0.03em]">
        {session.kind}
      </Badge>
    </Link>
  );
}

function ClassPreviewRow({
  cls,
  className,
}: {
  cls: DashboardClassRow;
  className?: string;
}) {
  const meta = [cls.subject, cls.level].filter(Boolean).join(" · ") || "No subject set";
  return (
    <Link
      href={`/classes/${cls.id}/overview`}
      className={cn(
        "flex items-center gap-3 border-t border-line px-2 py-3 first:border-t-0 transition-colors hover:bg-surface-2 rounded-lg",
        className
      )}
    >
      <span className="size-[9px] shrink-0 rounded-full" style={{ background: cls.dotColor }} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14.5px] font-semibold text-ink">{cls.title}</div>
        <div className="truncate text-[12.5px] text-muted">{meta}</div>
      </div>
      <span className="shrink-0 font-mono text-[12px] text-ink-2">
        {cls.nextSession ?? "No upcoming"}
      </span>
    </Link>
  );
}

function ClassesPreviewList({
  classes,
}: {
  classes: DashboardClassRow[];
}) {
  const primary = classes.slice(0, CLASS_PREVIEW_COUNT);

  return (
    <div className="flex flex-col">
      {primary.map((cls) => (
        <ClassPreviewRow key={cls.id} cls={cls} />
      ))}
      {classes.length > CLASS_PREVIEW_COUNT ? (
        <SeeAllRow href="/dashboard/classes" count={classes.length} />
      ) : null}
    </div>
  );
}

function HomeworkRow({
  item,
  className,
}: {
  item: HomeworkAttentionRow;
  className?: string;
}) {
  const dueTone = item.dueTone === "warn" ? "warn" : item.dueTone === "ok" ? "ok" : "neutral";
  const href =
    item.cta === "Grade"
      ? `/classes/${item.classId}/homework/${item.id}`
      : `/classes/${item.classId}/homework`;

  return (
    <div className={cn("flex items-center gap-3.5 border-t border-line py-3.5 first:border-t-0", className)}>
      <span className="size-[9px] shrink-0 rounded-full" style={{ background: item.dotColor }} />
      <div className="min-w-0 flex-1">
        <div className="text-[14.5px] font-semibold text-ink">{item.title}</div>
        <div className="text-[12.5px] text-muted">
          {item.classTitle} · {item.sub}
        </div>
      </div>
      <Badge tone={dueTone} className="shrink-0 text-[12px] font-semibold">
        {item.due}
      </Badge>
      <Button
        asChild
        variant={item.ctaVariant === "primary" ? "primary" : "secondary"}
        size="sm"
        className="h-9 shrink-0 px-4 text-[13px]"
      >
        <Link href={href}>{item.cta}</Link>
      </Button>
    </div>
  );
}

function HomeworkPreviewList({
  items,
}: {
  items: HomeworkAttentionRow[];
}) {
  const primary = items.slice(0, HOMEWORK_PREVIEW_COUNT);

  return (
    <div className="flex flex-col">
      {primary.map((item) => (
        <HomeworkRow key={item.id} item={item} />
      ))}
      {items.length > HOMEWORK_PREVIEW_COUNT ? (
        <SeeAllRow href="/dashboard/classes" count={items.length} />
      ) : null}
    </div>
  );
}

export default function DashboardHomeClient({
  dateLabel,
  greeting,
  greetingSub,
  stats,
  allClasses,
  todaySessions,
  upcomingSessions,
  homeworkAttention,
  classesHeading,
  homeworkHeading,
}: {
  dateLabel: string;
  greeting: string;
  greetingSub: string;
  stats: DashboardStat[];
  allClasses: DashboardClassRow[];
  todaySessions: UpcomingSessionRow[];
  upcomingSessions: UpcomingSessionRow[];
  homeworkAttention: HomeworkAttentionRow[];
  classesHeading: string;
  homeworkHeading: string;
}) {
  const [lessonsView, setLessonsView] = useState<"today" | "overall">("today");

  // Recent-visit ordering comes from localStorage: read it as an external
  // store (server renders the unsorted fallback, client re-renders sorted).
  const visits = useSyncExternalStore(
    subscribeRecentClassVisits,
    getRecentClassVisitsSnapshot,
    getServerRecentClassVisits
  );
  const previewClasses = useMemo(() => sortClassesByRecency(allClasses, visits), [allClasses, visits]);
  const previewHomework = useMemo(
    () => sortItemsByClassRecency(homeworkAttention, visits),
    [homeworkAttention, visits]
  );

  const activeSessions = lessonsView === "today" ? todaySessions : upcomingSessions;
  const previewSessions = activeSessions.slice(0, UPCOMING_PREVIEW_LIMIT);
  const hasMoreSessions = activeSessions.length > UPCOMING_PREVIEW_LIMIT;
  const emptyMessage =
    lessonsView === "today"
      ? "No sessions scheduled for today."
      : "No upcoming sessions across your classes.";

  return (
    <PageContainer>
      <PageHeader
        eyebrow={dateLabel}
        title={greeting}
        sub={greetingSub}
        action={
          <Button asChild>
            <Link href="/classes/new">
              <PlusIcon size={16} /> New class
            </Link>
          </Button>
        }
      />

      <div className="mb-8 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            delta={stat.delta}
            deltaTone={stat.deltaTone}
          />
        ))}
      </div>

      {allClasses.length === 0 ? (
        <EmptyState
          icon={<ClassesIcon size={20} />}
          title="No classes yet"
          description="Create your first class or wait for an invite from a tutor."
          action={
            <Button asChild>
              <Link href="/classes/new">
                <PlusIcon size={16} /> Create class
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="mb-[18px] grid grid-cols-1 gap-[18px] lg:grid-cols-[1.45fr_1fr]">
            <PanelCard
              title="Upcoming lessons"
              headerRight={<LessonsToggle value={lessonsView} onChange={setLessonsView} />}
            >
              {activeSessions.length === 0 ? (
                <p className="text-[14px] text-muted">{emptyMessage}</p>
              ) : (
                <div className="flex flex-col">
                  {previewSessions.map((session) => (
                    <UpcomingRow
                      key={session.id}
                      session={session}
                      showWhen={lessonsView === "overall"}
                    />
                  ))}
                  {hasMoreSessions ? (
                    <SeeAllRow href="/calendar" count={activeSessions.length} />
                  ) : null}
                </div>
              )}
            </PanelCard>

            <PanelCard
              title={classesHeading}
              headerRight={
                allClasses.length > CLASS_PREVIEW_COUNT ? (
                  <span className="font-mono text-[12px] text-muted">
                    {allClasses.length} classes
                  </span>
                ) : null
              }
            >
              <ClassesPreviewList classes={previewClasses} />
            </PanelCard>
          </div>

          <PanelCard
            title={homeworkHeading}
            className="mt-[18px]"
            headerRight={
              previewHomework.length > 0 ? (
                <span className="font-mono text-[12px] text-muted">
                  {previewHomework.length} item{previewHomework.length === 1 ? "" : "s"}
                </span>
              ) : null
            }
          >
            {previewHomework.length === 0 ? (
              <p className="text-[14px] text-muted">No submissions need feedback right now.</p>
            ) : (
              <HomeworkPreviewList items={previewHomework} />
            )}
          </PanelCard>
        </>
      )}
    </PageContainer>
  );
}
