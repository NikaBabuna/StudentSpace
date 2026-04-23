"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
  badge?: number;
}

interface SidebarProps {
  mode: "dashboard" | "session";
  student?: {
    id: string;
    name: string;
    initials: string;
    grade: string;
    cycleNumber: number;
    cycleHours: number;
    cycleTotal: number;
  };
  tutorInitials?: string;
  tutorName?: string;
  role?: "tutor" | "student" | "parent" | "employer";
}

const dashboardNav: NavItem[] = [
  { label: "My classes", href: "/dashboard" },
  { label: "Analytics", href: "/dashboard/analytics" },
  { label: "Inbox", href: "/inbox" },
];

const dashboardSettingsNav: NavItem[] = [
  { label: "Access & accounts", href: "/settings/access" },
  { label: "Preferences", href: "/settings/preferences" },
];

export default function Sidebar({
  mode,
  student,
  tutorInitials = "TN",
  tutorName = "",
  role = "tutor",
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/login");
  }

  const sessionNav: NavItem[] = student
    ? [
        { label: "Overview",  href: `/classes/${student.id}/overview` },
        { label: "Homework",  href: `/classes/${student.id}/homework` },
        { label: "Schedule",  href: `/classes/${student.id}/schedule` },
        { label: "Materials", href: `/classes/${student.id}/materials` },
        { label: "Chat",      href: `/classes/${student.id}/chat` },
      ]
    : [];

  const cyclePercent = student
    ? Math.min(Math.round((student.cycleHours / student.cycleTotal) * 100), 100)
    : 0;

  return (
    <aside className="w-[220px] shrink-0 flex flex-col" style={{
      background: "var(--color-ss-sidebar)",
      borderRight: "0.5px solid var(--color-ss-border)",
    }}>
      {/* Logo */}
      <div className="px-5 py-5" style={{ borderBottom: "0.5px solid var(--color-ss-border)" }}>
        <div className="text-[15px] font-medium" style={{ color: "var(--color-ss-text-primary)" }}>
          StudentSpace
        </div>
      </div>

      {/* Session mode: back + class info */}
      {mode === "session" && student && (
        <>
          <Link href="/dashboard"
            className="flex items-center gap-1.5 px-5 py-3 text-[12px] hover:opacity-80"
            style={{ color: "var(--color-ss-text-faint)" }}>
            <span>←</span> All classes
          </Link>

          <div className="px-5 pb-4" style={{ borderBottom: "0.5px solid var(--color-ss-border)" }}>
            <div className="w-[42px] h-[42px] rounded-full flex items-center justify-center text-[14px] font-medium mb-2"
              style={{ background: "var(--color-ss-orange-bg)", border: "1px solid var(--color-ss-orange-border)", color: "var(--color-ss-orange)" }}>
              {student.initials}
            </div>
            <div className="text-[14px] font-medium" style={{ color: "#d8c8a0" }}>{student.name}</div>
            {student.grade && (
              <div className="text-[11px] mt-0.5" style={{ color: "var(--color-ss-text-faint)" }}>{student.grade}</div>
            )}
          </div>

          {/* Payment cycle */}
          <div className="mx-5 my-4 rounded-md p-3" style={{
            background: "var(--color-ss-bg-secondary)",
            border: "0.5px solid var(--color-ss-border)",
          }}>
            <div className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: "var(--color-ss-text-ghost)" }}>
              Payment cycle
            </div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[13px] font-medium" style={{ color: "#d8c8a0" }}>
                Cycle {student.cycleNumber}
              </span>
              <span className="text-[12px]" style={{ color: "#9a8060" }}>
                {student.cycleHours} / {student.cycleTotal}h
              </span>
            </div>
            <div className="h-[5px] rounded-full overflow-hidden" style={{ background: "#2a2820" }}>
              <div className="h-full rounded-full"
                style={{ background: "var(--color-ss-amber)", width: `${cyclePercent}%` }} />
            </div>
          </div>
        </>
      )}

      {/* Nav */}
      <nav className="flex flex-col gap-0 px-3 flex-1">
        {mode === "dashboard" && (
          <>
            <NavSection label="Main" items={dashboardNav} pathname={pathname} />
            <NavSection label="Settings" items={dashboardSettingsNav} pathname={pathname} />
          </>
        )}
        {mode === "session" && (
          <NavSection label="Session" items={sessionNav} pathname={pathname} />
        )}
      </nav>

      {/* Footer — profile + sign out */}
      <div className="px-4 py-4" style={{ borderTop: "0.5px solid var(--color-ss-border)" }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-[28px] h-[28px] rounded-full flex items-center justify-center text-[10px] font-medium shrink-0"
            style={{ background: "#3a2e1a", border: "1px solid #6a5530", color: "var(--color-ss-amber-light)" }}>
            {tutorInitials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-medium truncate" style={{ color: "#b0a080" }}>{tutorName}</div>
          </div>
        </div>
        <button onClick={handleSignOut} disabled={signingOut}
          className="w-full text-[11px] py-1.5 rounded-md"
          style={{
            background: "#2a2820",
            color: "var(--color-ss-text-faint)",
            border: "0.5px solid var(--color-ss-border)",
            opacity: signingOut ? 0.6 : 1,
          }}>
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </aside>
  );
}

function NavSection({ label, items, pathname }: { label: string; items: NavItem[]; pathname: string }) {
  return (
    <div className="mb-4">
      <div className="text-[10px] uppercase tracking-widest px-2 mb-1" style={{ color: "#5a5248" }}>
        {label}
      </div>
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link key={item.href} href={item.href}
            className="flex items-center gap-2 px-2.5 py-[7px] rounded-md text-[13px]"
            style={{
              background: active ? "#2a2318" : "transparent",
              color: active ? "var(--color-ss-amber-light)" : "var(--color-ss-text-muted)",
            }}>
            <span className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: active ? "var(--color-ss-amber-light)" : "#5a5248" }} />
            {item.label}
            {item.badge ? (
              <span className="ml-auto text-[10px] font-medium rounded-full px-1.5 py-0.5"
                style={{ background: "#3a2010", color: "#c87a30" }}>
                {item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}