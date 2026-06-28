/* =============================================================================
 * features/employer/components/EmployerShell.tsx — employer portal chrome
 * -----------------------------------------------------------------------------
 * Role: Layout for organisation (employer) accounts: brand, nav, user card,
 *       sign-out. Below `lg` the rail collapses into an off-canvas drawer.
 * Dependencies: lib/supabase/client (logout), components/ui/*, components/icons
 * Used by: app/employer/layout.tsx
 * Inputs: fullName, userInitials, children
 * Outputs: Employer shell (design-system styled) wrapping portal pages
 * ========================================================================== */
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { IconButton } from "@/components/ui/icon-button";
import {
  Logo,
  MenuIcon,
  CloseIcon,
  LogoutIcon,
  InfoIcon,
  ClassesIcon,
  AnalyticsIcon,
  InboxIcon,
  SettingsIcon,
  type IconProps,
} from "@/components/icons";

type NavItem = { label: string; href: string; icon: (p: IconProps) => React.ReactNode };

const mainNav: NavItem[] = [
  { label: "Overview", href: "/employer", icon: ClassesIcon },
  { label: "Analytics", href: "/employer/analytics", icon: AnalyticsIcon },
  { label: "Inbox", href: "/employer/inbox", icon: InboxIcon },
];

const settingsNav: NavItem[] = [
  { label: "Settings", href: "/employer/settings", icon: SettingsIcon },
];

export default function EmployerShell({
  fullName,
  userInitials,
  children,
}: {
  fullName: string;
  userInitials: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [signingOut, setSigningOut] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  // Close the drawer on navigation (below lg, the sidebar is off-canvas).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNavOpen(false);
  }, [pathname]);

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* Mobile backdrop — tap to dismiss the drawer (hidden at lg+). */}
      <div
        aria-hidden="true"
        onClick={() => setNavOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity lg:hidden",
          navOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      {/* Sidebar — off-canvas drawer below lg, static rail at lg+ */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[232px] shrink-0 flex-col border-r border-line bg-surface transition-transform duration-200 ease-out lg:static lg:translate-x-0 lg:transition-none",
          navOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Close drawer (mobile only) */}
        <IconButton
          aria-label="Close navigation"
          onClick={() => setNavOpen(false)}
          className="absolute right-3 top-3 lg:hidden"
        >
          <CloseIcon size={18} />
        </IconButton>

        {/* Brand → employer home */}
        <Link
          href="/employer"
          className="flex items-center gap-2.5 border-b border-line px-5 py-[18px] transition-opacity hover:opacity-80"
        >
          <span className="flex size-7 items-center justify-center rounded-lg bg-accent text-accent-ink">
            <Logo size={17} />
          </span>
          <span className="text-[15.5px] font-semibold tracking-[-0.01em] text-ink">
            StudentSpace
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
          <NavGroup label="Organisation">
            {mainNav.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </NavGroup>
          <NavGroup label="Settings">
            {settingsNav.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </NavGroup>
        </nav>

        {/* Footer: user card + sign out */}
        <div className="border-t border-line p-3">
          <div className="flex items-center gap-2.5 rounded-xl border border-line bg-surface-2 p-2.5">
            <Avatar initials={userInitials} name={fullName} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium text-ink">{fullName}</div>
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
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile header with menu trigger (hidden at lg+) */}
        <header className="flex h-[58px] shrink-0 items-center gap-2 border-b border-line bg-surface/80 px-4 backdrop-blur-md lg:hidden">
          <IconButton
            aria-label="Open navigation"
            onClick={() => setNavOpen(true)}
            className="-ml-1"
          >
            <MenuIcon size={18} />
          </IconButton>
          <span className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
            StudentSpace
          </span>
        </header>

        {/* Active-development notice — shown on every employer tab so it's clear
         * why the tabs are placeholders. */}
        <div className="flex shrink-0 items-start gap-2.5 border-b border-line bg-accent-tint px-5 py-2.5 sm:px-7">
          <InfoIcon size={16} className="mt-0.5 shrink-0 text-accent" />
          <p className="text-[12.5px] leading-relaxed text-ink-2">
            <span className="font-semibold text-ink">
              The organisation portal is in active development.
            </span>{" "}
            These tabs are placeholders for now — overview, analytics, inbox and
            settings are being built and will roll out in upcoming updates.
          </p>
        </div>

        {children}
      </div>
    </div>
  );
}

/** A single nav row: icon + label, with active styling (matches the main app). */
function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = pathname === item.href;
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
