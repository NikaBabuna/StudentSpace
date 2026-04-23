"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SessionTabsProps {
  studentId: string;
  homeworkBadge?: number;
  chatBadge?: number;
}

export default function SessionTabs({ studentId, homeworkBadge, chatBadge }: SessionTabsProps) {
  const pathname = usePathname();

  const tabs = [
    { label: "Overview", href: `/classes/${studentId}/overview` },
    { label: "Homework", href: `/classes/${studentId}/homework`, badge: homeworkBadge },
    { label: "Schedule", href: `/classes/${studentId}/schedule` },
    { label: "Materials", href: `/classes/${studentId}/materials` },
    { label: "Chat", href: `/classes/${studentId}/chat`, badge: chatBadge },
  ];

  return (
    <div
      className="flex"
      style={{ borderBottom: "0.5px solid var(--color-ss-border)" }}
    >
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex items-center gap-1.5 px-4 py-2 text-[13px] transition-colors"
            style={{
              color: active ? "var(--color-ss-amber-light)" : "var(--color-ss-text-faint)",
              borderBottom: active ? "2px solid var(--color-ss-amber-light)" : "2px solid transparent",
              marginBottom: "-0.5px",
            }}
          >
            {tab.label}
            {tab.badge ? (
              <span
                className="text-[10px] font-medium rounded-full px-1.5 py-0.5"
                style={{ background: "#3a2010", color: "#c87a30" }}
              >
                {tab.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}