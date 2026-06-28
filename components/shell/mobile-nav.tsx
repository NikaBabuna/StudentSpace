/* =============================================================================
 * shell/mobile-nav.tsx — mobile drawer state for the app shell
 * -----------------------------------------------------------------------------
 * Below the `lg` breakpoint the sidebar collapses into an off-canvas drawer
 * opened by a hamburger button in the topbar. The trigger (in the topbar) and
 * the drawer (in the sidebar) live in different parts of the tree, so a tiny
 * context holds the shared open/closed state. The drawer auto-closes on every
 * navigation and locks body scroll while open.
 *
 * At `lg`+ none of this is visible: the sidebar renders as a static rail and the
 * trigger/backdrop are hidden, so desktop layout is unchanged.
 * ========================================================================== */
"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { IconButton } from "@/components/ui/icon-button";
import { MenuIcon } from "@/components/icons";

type MobileNavContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const MobileNavContext = React.createContext<MobileNavContextValue | null>(null);

export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  // Close the drawer whenever the route changes — covers every nav link tap.
  // Syncing drawer state to the router (an external system) is a legitimate
  // effect; the lint heuristic can't tell, so it's disabled for this line only.
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  // Lock background scroll while the drawer is open.
  React.useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <MobileNavContext.Provider value={{ open, setOpen }}>
      {children}
    </MobileNavContext.Provider>
  );
}

export function useMobileNav() {
  const ctx = React.useContext(MobileNavContext);
  if (!ctx) {
    throw new Error("useMobileNav must be used within a MobileNavProvider");
  }
  return ctx;
}

/** Hamburger button — shown only below `lg`; opens the drawer. */
export function SidebarTrigger({ className }: { className?: string }) {
  const { setOpen } = useMobileNav();
  return (
    <IconButton
      aria-label="Open navigation"
      className={className}
      onClick={() => setOpen(true)}
    >
      <MenuIcon size={18} />
    </IconButton>
  );
}
