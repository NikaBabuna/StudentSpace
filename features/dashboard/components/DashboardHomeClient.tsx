/* =============================================================================
 * features/dashboard/components/DashboardHomeClient.tsx — tutor dashboard home
 * -----------------------------------------------------------------------------
 * Role: Renders greeting, stat cards, today’s sessions, homework attention,
 *       and class shortcuts. Data is preloaded by loadDashboardData().
 * Dependencies: class-shared (ClassCard), components/ui
 * Used by: app/dashboard/page.tsx
 * Inputs: Serializable props from server loader (stats, classes, sessions)
 * Outputs: Interactive dashboard home (links, no mutations here)
 * ========================================================================== */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import type {
  DashboardClassRow,
  HomeworkAttentionRow,
  TodaySessionRow,
} from "@/lib/dashboard-data";
import type { DashboardStat } from "@/lib/dashboard-stats";
import { PageContainer, PageHeader } from "@/components/shell/page-container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PlusIcon, ClassesIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

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

function TodayRow({ session }: { session: TodaySessionRow }) {
  return (
    <Link
      href={`/classes/${session.classId}/schedule`}
      className="flex gap-4 border-t border-line py-3.5 first:border-t-0 first:pt-0 transition-colors hover:opacity-90"
    >
      <div className="min-w-[60px] text-right">
        <div className="text-[15px] font-semibold text-ink">{session.time}</div>
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

function ClassPreviewRow({ cls }: { cls: DashboardClassRow }) {
  const meta = [cls.subject, cls.level].filter(Boolean).join(" · ") || "No subject set";
  return (
    <Link
      href={`/classes/${cls.id}/overview`}
      className="flex items-center gap-3 border-t border-line px-2 py-3 first:border-t-0 transition-colors hover:bg-surface-2 rounded-lg"
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

function HomeworkRow({ item }: { item: HomeworkAttentionRow }) {
  const dueTone = item.dueTone === "warn" ? "warn" : item.dueTone === "ok" ? "ok" : "neutral";
  return (
    <div className="flex items-center gap-3.5 border-t border-line py-3.5 first:border-t-0">
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
        <Link href={`/classes/${item.classId}/homework`}>{item.cta}</Link>
      </Button>
    </div>
  );
}

export default function DashboardHomeClient({
  greeting,
  greetingSub,
  stats,
  allClasses,
  todaySessions,
  homeworkAttention,
  classesHeading,
  homeworkHeading,
}: {
  greeting: string;
  greetingSub: string;
  stats: DashboardStat[];
  allClasses: DashboardClassRow[];
  todaySessions: TodaySessionRow[];
  homeworkAttention: HomeworkAttentionRow[];
  classesHeading: string;
  homeworkHeading: string;
}) {
  const [dateLabel, setDateLabel] = useState("");
  useEffect(() => {
    setDateLabel(
      new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })
    );
  }, []);

  const previewClasses = [...allClasses]
    .sort((a, b) => {
      if (a.nextSession && !b.nextSession) return -1;
      if (!a.nextSession && b.nextSession) return 1;
      return a.title.localeCompare(b.title);
    })
    .slice(0, 5);

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
              title="Today"
              headerRight={
                <span className="font-mono text-[12px] text-muted">
                  {todaySessions.length} session{todaySessions.length === 1 ? "" : "s"}
                </span>
              }
            >
              {todaySessions.length === 0 ? (
                <p className="text-[14px] text-muted">No sessions scheduled for today.</p>
              ) : (
                <div className="flex flex-col">
                  {todaySessions.map((session) => (
                    <TodayRow key={session.id} session={session} />
                  ))}
                </div>
              )}
            </PanelCard>

            <PanelCard
              title={classesHeading}
              headerRight={
                <Link
                  href="/dashboard/classes"
                  className="text-[13px] font-semibold text-accent hover:underline"
                >
                  All
                </Link>
              }
            >
              <div className="flex flex-col">
                {previewClasses.map((cls) => (
                  <ClassPreviewRow key={cls.id} cls={cls} />
                ))}
              </div>
            </PanelCard>
          </div>

          <PanelCard
            title={homeworkHeading}
            className="mt-[18px]"
            headerRight={
              <span className="font-mono text-[12px] text-muted">
                {homeworkAttention.length} item{homeworkAttention.length === 1 ? "" : "s"}
              </span>
            }
          >
            {homeworkAttention.length === 0 ? (
              <p className="text-[14px] text-muted">No homework needs your attention right now.</p>
            ) : (
              <div className="flex flex-col">
                {homeworkAttention.map((item) => (
                  <HomeworkRow key={item.id} item={item} />
                ))}
              </div>
            )}
          </PanelCard>
        </>
      )}
    </PageContainer>
  );
}
