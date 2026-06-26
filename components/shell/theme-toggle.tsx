/* =============================================================================
 * shell/theme-toggle.tsx — dark/light switch
 * -----------------------------------------------------------------------------
 * A single icon button that flips the theme. The actual work (attribute flip +
 * persistence) lives in lib/theme.ts; this component only reflects and triggers
 * it. We read the active theme in an effect (not during render) so the server
 * and first client render agree — avoiding hydration mismatches.
 * ========================================================================== */
"use client";

import { useEffect, useState } from "react";

import { IconButton } from "@/components/ui/icon-button";
import { SunIcon, MoonIcon } from "@/components/icons";
import { getActiveTheme, toggleTheme, type Theme } from "@/lib/theme";

export function ThemeToggle({ className }: { className?: string }) {
  // Start at the default; sync to the real value once mounted on the client.
  const [theme, setTheme] = useState<Theme>("dark");
  useEffect(() => setTheme(getActiveTheme()), []);

  return (
    <IconButton
      variant="secondary"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      onClick={() => setTheme(toggleTheme())}
      className={className}
    >
      {theme === "dark" ? <SunIcon size={16} /> : <MoonIcon size={16} />}
    </IconButton>
  );
}
