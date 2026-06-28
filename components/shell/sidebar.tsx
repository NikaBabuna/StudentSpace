/* =============================================================================
 * shell/sidebar.tsx — left navigation rail
 * -----------------------------------------------------------------------------
 * Two shapes driven by `mode`:
 *   • "dashboard" — brand, "New class" CTA, primary nav, settings, user card.
 *   • "session"   — brand, back link, the current class (with a settings gear +
 *                   payment-cycle progress), then the in-class nav.
 *
 * Nav icons come from components/icons.tsx; the class settings modal lives in
 * shell/class-settings-modal.tsx. Routes/badges are unchanged from before.
 * ========================================================================== */
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { IconButton } from "@/components/ui/icon-button";
import { Progress } from "@/components/ui/progress";
import { ClassSettingsModal } from "./class-settings-modal";
import { useMobileNav } from "./mobile-nav";
import {
  Logo,
  PlusIcon,
  LogoutIcon,
  SettingsIcon,
  CloseIcon,
  ChevronLeftIcon,
  DashboardIcon,
  AnalyticsIcon,
  InboxIcon,
  ClassesIcon,
  HomeworkIcon,
  ScheduleIcon,
  MaterialsIcon,
  ChatIcon,
  UsersIcon,
  type IconProps,
} from "@/components/icons";

type NavItem = {
  label: string;
  href: string;
  icon: (p: IconProps) => React.ReactNode;
  badge?: number;
  /** When true, only an exact pathname match counts as active. */
  exact?: boolean;
};

export interface SidebarProps {
  mode: "dashboard" | "session";
  student?: {
    id: string;
    name: string;
    initials: string;
    grade: string;
    cycleNumber: number;
    cycleHours: number;
    cycleTotal: number;
    subject?: string | null;
    level?: string | null;
    description?: string | null;
    tutor_notes?: string | null;
    cycleHoursTarget?: number;
    isCreator?: boolean;
  };
  tutorInitials?: string;
  tutorName?: string;
  role?: "tutor" | "student" | "parent" | "employer";
}

const dashboardNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: DashboardIcon, exact: true },
  { label: "My classes", href: "/dashboard/classes", icon: ClassesIcon },
  { label: "Calendar", href: "/calendar", icon: ScheduleIcon },
  { label: "Analytics", href: "/dashboard/analytics", icon: AnalyticsIcon },
  { label: "Inbox", href: "/inbox", icon: InboxIcon },
];

const settingsNav: NavItem[] = [
  { label: "Access & accounts", href: "/settings/access", icon: UsersIcon },
  { label: "Preferences", href: "/settings/preferences", icon: SettingsIcon },
];

export function Sidebar({
  mode,
  student,
  tutorInitials = "",
  tutorName = "",
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { open, setOpen } = useMobileNav();
  const [signingOut, setSigningOut] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/login");
  }

  const sessionNav: NavItem[] = student
    ? [
        { label: "Overview", href: `/classes/${student.id}/overview`, icon: ClassesIcon },
        { label: "Homework", href: `/classes/${student.id}/homework`, icon: HomeworkIcon },
        { label: "Schedule", href: `/classes/${student.id}/schedule`, icon: ScheduleIcon },
        { label: "Materials", href: `/classes/${student.id}/materials`, icon: MaterialsIcon },
        { label: "Chat", href: `/classes/${student.id}/chat`, icon: ChatIcon },
      ]
    : [];

  const cyclePercent = student && student.cycleTotal > 0
    ? Math.min(Math.round((student.cycleHours / student.cycleTotal) * 100), 100)
    : 0;

  return (
    <>
      {/* Mobile backdrop — tap to dismiss the drawer (hidden at lg+). */}
      <div
        aria-hidden="true"
        onClick={() => setOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen w-[248px] shrink-0 flex-col gap-5 overflow-y-auto border-r border-line bg-surface p-4 transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:z-auto lg:translate-x-0 lg:transition-none",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Close drawer (mobile only) */}
        <IconButton
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
          className="absolute right-3 top-3 lg:hidden"
        >
          <CloseIcon size={18} />
        </IconButton>

        {/* Brand → dashboard */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 px-2 py-1 transition-opacity hover:opacity-80"
        >
          <span className="flex size-7 items-center justify-center rounded-lg bg-accent text-accent-ink">
            <Logo size={17} />
          </span>
          <span className="text-[16.5px] font-semibold tracking-[-0.01em] text-ink">
            StudentSpace
          </span>
        </Link>

        {mode === "dashboard" ? (
          <>
            <Button asChild className="w-full">
              <Link href="/classes/new">
                <PlusIcon size={16} /> New class
              </Link>
            </Button>

            <nav className="flex flex-col gap-0.5">
              {dashboardNav.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} />
              ))}
            </nav>

            <NavGroup label="Settings">
              {settingsNav.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} />
              ))}
            </NavGroup>
          </>
        ) : student ? (
          <>
            <Link
              href="/dashboard/classes"
              className="flex items-center gap-1.5 px-2 text-[12px] text-muted transition-colors hover:text-ink-2"
            >
              <ChevronLeftIcon size={14} /> All classes
            </Link>

            {/* Current class header with settings gear */}
            <div className="flex flex-col gap-3 border-b border-line pb-4">
              <div className="flex items-start gap-2.5">
                <Avatar initials={student.initials} name={student.name} size="lg" />
                <div className="flex min-w-0 flex-1 items-start justify-between gap-1.5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-ink">{student.name}</div>
                    {student.grade ? (
                      <div className="mt-0.5 truncate text-[12px] text-muted">{student.grade}</div>
                    ) : null}
                  </div>
                  <IconButton
                    size="sm"
                    aria-label="Class settings"
                    title="Class settings"
                    onClick={() => setShowSettings(true)}
                  >
                    <SettingsIcon size={15} />
                  </IconButton>
                </div>
              </div>

              {/* Payment cycle progress */}
              <div className="rounded-xl border border-line bg-surface-2 p-3">
                <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                  Payment cycle
                </div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[13px] font-medium text-ink">Cycle {student.cycleNumber}</span>
                  <span className="text-[12px] text-muted">
                    {student.cycleHours} / {student.cycleTotal}h
                  </span>
                </div>
                <Progress value={cyclePercent} className="h-1.5" />
              </div>
            </div>

            <nav className="flex flex-col gap-0.5">
              {sessionNav.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} />
              ))}
            </nav>
          </>
        ) : null}

        {/* Footer: user card + sign out */}
        <div className="mt-auto flex items-center gap-2.5 rounded-xl border border-line bg-surface-2 p-2.5">
          <Avatar initials={tutorInitials} name={tutorName} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium text-ink">{tutorName}</div>
          </div>
          <IconButton
            aria-label="Sign out"
            title="Sign out"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            <LogoutIcon size={16} />
          </IconButton>
        </div>
      </aside>

      {showSettings && student ? (
        <ClassSettingsModal
          classId={student.id}
          initialName={student.name}
          initialSubject={student.subject}
          initialLevel={student.level}
          initialDescription={student.description}
          initialTutorNotes={student.tutor_notes}
          initialCycleHours={student.cycleHoursTarget ?? student.cycleTotal}
          isCreator={student.isCreator ?? false}
          onClose={() => setShowSettings(false)}
        />
      ) : null}
    </>
  );
}

/** A single nav row: icon + label + optional count badge, with active styling. */
function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(item.href + "/");
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition-colors",
        active ? "bg-accent-tint text-accent" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
      )}
    >
      <Icon size={18} />
      {item.label}
      {item.badge ? (
        <span className="ml-auto rounded-full bg-accent px-1.5 py-0.5 font-mono text-[10px] font-semibold text-accent-ink">
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}

/** A labelled cluster of nav rows. */
function NavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="px-2.5 pb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
        {label}
      </div>
      {children}
    </div>
  );
}
