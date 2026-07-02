/* =============================================================================
 * lib/theme.ts — theme constants & helpers
 * -----------------------------------------------------------------------------
 * Small, framework-agnostic utilities for reading/writing the active theme.
 *
 * The theme is stored in two places that are kept in sync:
 *   • <html data-theme="…">  — what the CSS in globals.css actually reacts to.
 *   • localStorage["theme"]  — persistence across reloads; read by the no-FOUC
 *                              init script in app/layout.tsx on first paint.
 *
 * Keeping this logic here (rather than inside the toggle component) means the
 * init script, the toggle, and any future server/client code share one
 * definition of the storage key and the allowed values.
 * ========================================================================== */

export type Theme = "dark" | "light";

/** Default when the user has never chosen — dark, per product decision. */
export const DEFAULT_THEME: Theme = "dark";

/** localStorage key. Must match the inline init script in app/layout.tsx. */
export const THEME_STORAGE_KEY = "theme";

/** Read the theme currently applied to <html>, falling back to the default. */
export function getActiveTheme(): Theme {
  if (typeof document === "undefined") return DEFAULT_THEME;
  const t = document.documentElement.dataset.theme;
  return t === "light" || t === "dark" ? t : DEFAULT_THEME;
}

/** Server-render snapshot for useSyncExternalStore — always the default. */
export function getServerTheme(): Theme {
  return DEFAULT_THEME;
}

// Components subscribe via useSyncExternalStore so every toggle instance
// re-renders when applyTheme() runs, without effect-driven state syncing.
const listeners = new Set<() => void>();

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Apply a theme: flip the <html> attribute (re-themes the UI instantly) and
 * persist the choice. Safe to call on the client only.
 */
export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* private mode / storage disabled — the attribute still applies for now */
  }
  listeners.forEach((l) => l());
}

/** Switch to the opposite theme and return the new value. */
export function toggleTheme(): Theme {
  const next: Theme = getActiveTheme() === "dark" ? "light" : "dark";
  applyTheme(next);
  return next;
}
