# StudentSpace Design System

The editorial design language used across the app: warm, calm surfaces, a serif
display face for headings/numerals, a mono face for labels, and an indigo
accent. Dark is the default theme; light is an opt-in toggle.

This document is the quick reference. The implementation lives in
[`app/globals.css`](./app/globals.css) (tokens), [`components/ui/`](./components/ui)
(primitives), and [`components/shell/`](./components/shell) (app chrome).

---

## 1. Theming

The active theme is a `data-theme` attribute on `<html>` (`"dark"` | `"light"`).
CSS in `globals.css` reacts to it, so switching themes is a single attribute
flip — no React re-render, no flash on load.

| Where | What |
| --- | --- |
| `app/layout.tsx` | Renders `data-theme="dark"` by default + an inline script that applies the saved theme before first paint (no FOUC). |
| `lib/theme.ts` | `getActiveTheme()`, `applyTheme()`, `toggleTheme()`, `THEME_STORAGE_KEY`. |
| `components/shell/theme-toggle.tsx` | The user-facing sun/moon toggle. |

Persistence: the choice is saved to `localStorage["theme"]`.

---

## 2. Color tokens

Defined as CSS variables, exposed to Tailwind via `@theme inline` so they become
utilities. **Use the utility, never a raw hex.**

| Token | Utility examples | Meaning |
| --- | --- | --- |
| `--bg` | `bg-bg` | App background (the page) |
| `--surface` | `bg-surface` | Card / panel background |
| `--surface-2`, `--surface-3` | `bg-surface-2` | Insets, hovers, nested fills |
| `--ink` | `text-ink` | Primary text |
| `--ink-2` | `text-ink-2` | Secondary text |
| `--muted` | `text-muted` | Tertiary / metadata text |
| `--line`, `--line-2` | `border-line` | Hairlines, borders |
| `--accent` | `bg-accent`, `text-accent` | Indigo brand accent |
| `--accent-ink` | `text-accent-ink` | Text/icon on an accent fill |
| `--accent-tint` | `bg-accent-tint` | Soft accent background |
| `--ok`, `--ok-tint` | `text-ok`, `bg-ok-tint` | Success / positive |
| `--warn`, `--warn-tint` | `text-warn`, `bg-warn-tint` | Warning |
| `--danger`, `--danger-tint` | `text-danger`, `bg-danger-tint` | Error / destructive |

Opacity modifiers work (`bg-accent/15`, `border-line/60`) via `color-mix`.

**shadcn aliases** (`bg-card`, `text-foreground`, `border-border`, `bg-primary`,
`text-muted-foreground`, …) still resolve — they point at the same palette so
the `components/ui/*` primitives and not-yet-migrated screens keep working.

**Legacy `--color-ss-*`** tokens are temporarily re-pointed at this palette so
old inline-styled screens adopt the new theme during migration. They are removed
once every screen uses primitives.

---

## 3. Typography

| Family | Variable / utility | Use |
| --- | --- | --- |
| Geist (sans) | `font-sans` | Body, UI, buttons |
| Newsreader (serif) | `font-serif` | Display headings, large numerals |
| Geist Mono | `font-mono` | Uppercase labels, metadata, timestamps |

Pattern: section labels are mono, uppercase, tracked, `text-muted`; headline
numbers (stats, percentages) are serif and large.

---

## 4. Primitives (`components/ui/`)

Each primitive is the **only** place its style recipe lives. Build screens by
composing these instead of writing inline styles.

| Component | Purpose |
| --- | --- |
| `Button` | `primary` / `secondary` / `ghost` / `destructive`; `sm`/`md`/`lg`; `busy`. |
| `Card`, `CardHeader`, `CardTitle`, `CardContent` | Surface panel + header slots. |
| `Input`, `Textarea`, `Label`, `Field` | Form controls; `Field` wraps label + control + error. |
| `Badge` | Status pills (accent / ok / warn / danger / neutral). |
| `Avatar` | Initials bubble with a deterministic color. |
| `StatCard` | Mono label + serif numeral + delta. |
| `Progress` | Token-colored progress bar. |
| `Tabs` | Underline tab row with active state. |
| `Toast` | Transient confirmation (uses `toastIn`). |
| `EmptyState` | Icon + message + optional action. |
| `Spinner` | Inline busy indicator (uses `spin`). |
| `IconButton` | Square icon-only button. |

Icons come from [`components/icons.tsx`](./components/icons.tsx) and inherit
`currentColor`.

---

## 5. Shape & elevation

- Radius: inputs/buttons `rounded-xl`, cards `rounded-2xl`.
- Borders: 1px `border-line` (hairline aesthetic).
- Shadow: `shadow-[var(--shadow-sm)]` for buttons, `shadow-[var(--shadow)]` for
  floating elements (modals, toasts).

---

## 6. Do / Don't

- ✅ `className="bg-surface border border-line text-ink"`
- ✅ Compose `Card` + `Button` + `Field`.
- ❌ `style={{ background: "#201e18", color: "#e8d5b0" }}` (raw hex — bypasses theming).
- ❌ New `--color-ss-*` references (legacy, being removed).
