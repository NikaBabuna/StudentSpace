/* =============================================================================
 * shell/class-tabs.tsx — in-class navigation tabs
 * -----------------------------------------------------------------------------
 * Replaces the old components/layout/SessionTabs. A thin client wrapper over the
 * <Tabs> primitive that derives the active tab from the current pathname (the
 * class layout is a server component and can't read it directly).
 * ========================================================================== */
"use client";

import { usePathname } from "next/navigation";

import { Tabs, type TabItem } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export function ClassTabs({
  classId,
  homeworkBadge,
  chatBadge,
}: {
  classId: string;
  homeworkBadge?: number;
  chatBadge?: number;
}) {
  const pathname = usePathname();

  const items: TabItem[] = [
    { key: "overview", label: "Overview", href: `/classes/${classId}/overview` },
    {
      key: "homework",
      label: "Homework",
      href: `/classes/${classId}/homework`,
      badge: homeworkBadge ? <Badge tone="accent">{homeworkBadge}</Badge> : undefined,
    },
    { key: "schedule", label: "Schedule", href: `/classes/${classId}/schedule` },
    { key: "materials", label: "Materials", href: `/classes/${classId}/materials` },
    {
      key: "chat",
      label: "Chat",
      href: `/classes/${classId}/chat`,
      badge: chatBadge ? <Badge tone="accent">{chatBadge}</Badge> : undefined,
    },
  ];

  const active = items.find((it) => pathname.startsWith(it.href!))?.key ?? "overview";

  return <Tabs items={items} active={active} />;
}
