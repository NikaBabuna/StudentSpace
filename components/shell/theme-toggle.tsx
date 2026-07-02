/* =============================================================================
 * shell/theme-toggle.tsx — dark/light switch
 * -----------------------------------------------------------------------------
 * A single icon button that flips the theme. The actual work (attribute flip +
 * persistence + change notification) lives in lib/theme.ts; this component only
 * reflects and triggers it. useSyncExternalStore keeps the server and first
 * client render agreeing on the default theme (no hydration mismatch) and
 * re-renders every toggle instance when the theme changes.
 * ========================================================================== */
"use client";

import { useSyncExternalStore } from "react";

import { IconButton } from "@/components/ui/icon-button";
import { SunIcon, MoonIcon } from "@/components/icons";
import { getActiveTheme, getServerTheme, subscribeTheme, toggleTheme } from "@/lib/theme";

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribeTheme, getActiveTheme, getServerTheme);

  return (
    <IconButton
      variant="secondary"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      onClick={toggleTheme}
      className={className}
    >
      {theme === "dark" ? <SunIcon size={16} /> : <MoonIcon size={16} />}
    </IconButton>
  );
}
