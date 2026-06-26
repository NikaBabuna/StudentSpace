/* =============================================================================
 * ui/tabs.tsx — underline tab row
 * -----------------------------------------------------------------------------
 * A horizontal tab bar with an active underline. Each tab is either:
 *   • a navigation link (provide `href`) — used by route-based class tabs, or
 *   • a button (provide `onSelect`)       — used by in-page tab state.
 * `active` is the key of the current tab.
 * ========================================================================== */
import * as React from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export type TabItem = {
  key: string;
  label: React.ReactNode;
  href?: string;
  badge?: React.ReactNode;
};

type TabsProps = {
  items: TabItem[];
  active: string;
  onSelect?: (key: string) => void;
  className?: string;
};

function Tabs({ items, active, onSelect, className }: TabsProps) {
  return (
    <div className={cn("flex gap-1 overflow-x-auto border-b border-line", className)}>
      {items.map((it) => {
        const isActive = it.key === active;
        const cls = cn(
          "relative -mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors",
          isActive
            ? "border-accent text-ink"
            : "border-transparent text-muted hover:text-ink-2"
        );
        const inner = (
          <>
            {it.label}
            {it.badge}
          </>
        );
        return it.href ? (
          <Link key={it.key} href={it.href} className={cls} aria-current={isActive ? "page" : undefined}>
            {inner}
          </Link>
        ) : (
          <button
            key={it.key}
            type="button"
            onClick={() => onSelect?.(it.key)}
            className={cls}
            aria-pressed={isActive}
          >
            {inner}
          </button>
        );
      })}
    </div>
  );
}

export { Tabs };
