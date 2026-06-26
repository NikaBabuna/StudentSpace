# Front-End Redesign — Gap Analysis & Migration Plan

**Reference mockup:** `StudentSpace Redesign.html` (bundled interactive prototype in Downloads)

**Decoded design (readable HTML):** [`design/StudentSpace-Redesign-decoded.html`](./design/StudentSpace-Redesign-decoded.html) — unpacked from the bundler template. Open in a browser for static layout reference (scripts/assets from the original bundle are not included; use the Downloads file for the full interactive prototype).

**Regenerate decoded file:**

```bash
node scripts/decode-redesign-html.mjs "C:/Users/USER/Downloads/StudentSpace Redesign.html"
```

**Design system docs:** [`DESIGN-SYSTEM.md`](./DESIGN-SYSTEM.md), implementation in [`app/globals.css`](./app/globals.css), [`components/ui/`](./components/ui/), [`components/shell/`](./components/shell/)

**Status:** In progress. Implementation log below.

---

## Implementation log

### Performance — server data loaders (done)

Every server loader was a sequential waterfall of Supabase round-trips, and the
class layout re-fetched user/membership/class that each page then fetched again.

- Added request-cached helpers in [`lib/auth.ts`](./lib/auth.ts): `getServerClient`,
  `getCurrentUser`, `getClassMembership`, `getClassRow` (all wrapped in React
  `cache()`), so a layout and the page it wraps share one client + one
  auth/membership/class fetch per request.
- Parallelised independent queries with `Promise.all` in: `lib/dashboard-data.ts`,
  `classes/[id]/layout.tsx`, `overview`, `schedule`, `homework`, `homework/[hwId]`,
  `dashboard/analytics`, `inbox`, `settings/access`, `employer`.
- **Convention for new server loaders:** use the cached helpers; never re-`getUser`
  or re-query the class in a page the layout already loaded; batch independent
  reads in one `Promise.all`; only serialise when there is a real data dependency.

### Consistency — token migration (partial)

- `classes/new`: was a floating centered page with raw hex; now a server page in
  `AppShell` (breadcrumb `Classes / New class`) wrapping `NewClassForm` built on
  `Field`/`Input`/`Textarea`/`Button`/`Card`.
- `classes/[id]/invite`: was a full-screen takeover inside the class shell with
  raw hex; now a focused in-workspace card on primitives.
- **Remaining legacy hex:** the employer portal (`employer/*`, ~5 files) and
  `global-error.tsx` (intentional — it renders outside the themed app).

### Perceived speed (done)

- Loading skeletons in `components/shell/loading-skeleton.tsx` reshaped to mirror
  the real sidebar + header + stat row + panel grid (settle, not re-flow).
- Added `app/classes/loading.tsx` (full shell while the class *layout* fetches on
  dashboard→class) and `app/dashboard/analytics/loading.tsx`.
- Chat send is now optimistic (instant bubble + rollback on error).
- Confirmed all client mutations use `router.refresh()` (soft refresh), not full
  reloads.

---

## What the mockup covers

The HTML prototype defines **four flows**:

| Flow | Screens |
|------|---------|
| Auth | Login (split-panel) |
| Dashboard | Greeting, stats, Today panel, class list, homework attention |
| Class workspace | Header + tabs: Overview, Schedule, Homework, Chat |
| New class | 4-step wizard inside app shell |

Everything else in the live app (Materials, Analytics, Inbox invites, employer portal, submissions grading, settings, landing, signup) has **no mockup screen**. Those pages should match the **design system** (tokens, shell, primitives), not pixel parity with a missing screen.

---

## Global chrome (affects every in-app page)

Differences that appear wherever `AppShell` is used.

| Area | Mockup | Current app | Severity |
|------|--------|-------------|----------|
| **Sidebar IA** | 4 items: Dashboard, Classes, Schedule, Messages | Dashboard mode: My classes, Analytics, Inbox + Settings group | **High** — different information architecture |
| **Session sidebar** | Same global sidebar always; class context only in main area | Switches to “session mode”: class card, payment cycle, duplicate in-class nav | **High** — structural divergence |
| **Topbar** | Breadcrumb + View as (tutor/student/parent) + Concepts toggle + segmented Light/Dark | Breadcrumb + single-icon theme toggle only | Medium (View as / Concepts intentionally dropped; theme control differs) |
| **User footer** | Avatar + name + role label + logout icon | Avatar + name + logout; no role | Low |
| **Auth brand panel** | `background: var(--ink)` (warm near-black), footer “Trusted by 1,200+ tutors…” | `bg-brand` (indigo via `--brand` token) | Medium |
| **Default theme** | Prototype defaults to light | App defaults to dark | Low (tokens support both) |
| **Styling system** | 100% semantic CSS variables | Split: shell/dashboard/auth on new tokens; most feature clients on `--color-ss-*` + inline hex | **High** — “two apps” feel |

---

## Page-by-page inconsistencies

### `/` — Landing

**Not in mockup.** Mockup starts at login.

| Issue | Detail |
|-------|--------|
| No reference screen | Current landing uses redesign copy and new primitives — closest to spec of any public page |
| Extra content | “Active development” banner and terms line — product addition, not a redesign gap |

---

### `/login` — Login

| Area | Mockup | Current | Severity |
|------|--------|---------|----------|
| Layout | Split panel | `AuthShell` split panel | — |
| Brand panel color | `var(--ink)` | `bg-brand` (indigo) | Medium |
| Brand footer | Social proof line | Missing | Low |
| Password row | Label + “Forgot?” link | Label only | Low |
| Primary CTA | Disabled/grey until valid email+password | Always enabled until submit | Low |
| Extra actions | “Explore the live demo →” button | Missing | Low (demo not a real feature) |
| Typography | “Welcome back” serif ~30px | Matches | — |

**Verdict:** Structure matches; brand panel treatment and small auth affordances differ.

---

### `/signup` — Signup

**Not in mockup** (only a “Create an account” link on login).

| Issue | Detail |
|-------|--------|
| Uses new `AuthShell` + primitives | Consistent with login migration |
| Extra fields | Account type, bio, email verification — real product |
| Plan | Extrapolate login patterns; already mostly done |

---

### `/dashboard` — Dashboard

| Area | Mockup | Current | Severity |
|------|--------|---------|----------|
| Greeting | Time-based: “Good afternoon, Mariam” + rich subtitle | “Hello, {firstName}” + class count only | **High** |
| Stat cards | Active classes, Students, Avg. attendance, To grade | All classes, Teaching, Attending, Pending invites | **High** |
| Main layout | 2-column: “Today” sessions + compact class list | 3 grouped card grids (teach / attend / observe) | **High** |
| Homework strip | Full-width “Homework that needs you” section with CTAs | Missing entirely | **High** |
| Class rows | Dot + title + meta + “next session” time | Card with avatar, badges, cycle/payment chips, ⋯ menu | **High** |
| Sidebar nav | No Analytics / Inbox in mockup | Extra nav items | Medium (real features) |
| Visual system | Token-based cards, serif numerals | `StatCard` + new cards — partially aligned | Medium |

**Verdict:** Layout and content model are the biggest dashboard gaps, not just colors.

---

### `/classes/new` — Create class

| Area | Mockup | Current | Severity |
|------|--------|---------|----------|
| Shell | Inside app shell with breadcrumb “Classes / New class” | Standalone centered page, no sidebar/topbar | **High** |
| Flow | 4-step wizard: Basics → Schedule → Students → Review | Single form (title, subject, level, description, cycle hours, payment) | **High** |
| Controls | Chip selectors for subject/level/days/duration/capacity | Free-text inputs + number fields | **High** |
| Invites | Step 3: email invite list | Not on create flow (separate `/invite` later) | Medium |
| Styling | New design tokens | Legacy `--color-ss-*`, inline styles | **High** |
| Success | Toast + undo | Redirect to class overview | Low |

---

### `/classes/[id]/*` — Class workspace (layout + tabs)

Applies to all class sub-routes.

| Area | Mockup | Current | Severity |
|------|--------|---------|----------|
| Navigation model | Tabs only in main content; sidebar stays global | Tabs in header band + duplicate nav in session sidebar | **High** |
| Tab set | Overview, Schedule, Homework, Chat (4 tabs) | Overview, Homework, Schedule, Materials, Chat (5 tabs; order differs) | Medium (Materials is real product) |
| Header title | Serif 30px | Serif 28px | Low |
| Header meta | Students · recurring schedule · syllabus % | Members · payment cycle hours | **High** |
| Primary action | “Start session” | Tutor: Members + Invite | **High** |
| Tab styling | Underline tabs | `ClassTabs` → `Tabs` primitive — close match | Low |

---

### `/classes/[id]/overview` — Overview

| Area | Mockup | Current | Severity |
|------|--------|---------|----------|
| Layout | Simple 2-column: Syllabus progress + Students list | Role-specific dense stats dashboard | **High** |
| Syllabus | 72% progress bar + topic checklist | No syllabus concept in product | **High** (feature gap or mockup fiction) |
| Students | Avatar rows with attendance % | Different member presentation | Medium |
| Styling | Token-based `surface` cards | Heavy inline hex (`#201e18`, `#c8a050`, etc.) | **High** |

---

### `/classes/[id]/schedule` — Schedule

| Area | Mockup | Current | Severity |
|------|--------|---------|----------|
| **Paradigm** | Vertical list of sessions in one card | Weekly calendar grid + side panel | **Critical** |
| Status tags | Mono uppercase pills on token tints | Custom hex status chips | High |
| Actions | View-only in mockup | Full tutor CRUD (complete, miss, makeup, pay cycle) | Expected (real app > mockup) |
| Styling | New tokens | Legacy amber/green/red hex system | High |

**Verdict:** Largest layout mismatch in the class workspace. Mockup is a list; the app is a calendar.

---

### `/classes/[id]/homework` — Homework

| Area | Mockup | Current | Severity |
|------|--------|---------|----------|
| List pattern | Rows: icon square + title + sub + due pill + CTA | Expandable cards, drag-drop zones, legacy badges | **High** |
| Header row | Lead text + single “Post homework” CTA | Different header/actions layout | Medium |
| Due badges | Rounded pills on `--warn-tint` / `--ok-tint` | Inline hex badge styles | High |
| Interactions | Simple row actions (Grade / Open / Review) | Full create/edit/delete/submit modals | Expected |

---

### `/classes/[id]/homework/[hwId]` — Submissions

**Not in mockup.**

| Issue | Detail |
|-------|--------|
| No reference layout | Fully legacy styled |
| Plan | Inherit homework row patterns when migrated |

---

### `/classes/[id]/chat` — Chat

| Area | Mockup | Current | Severity |
|------|--------|---------|----------|
| Container | Rounded card, fixed 520px height, group header with green dot | Full-height layout, participant chips bar | Medium |
| Bubbles (self) | `var(--accent)` fill, accent-ink text | Amber/brown custom colors | **High** |
| Bubbles (others) | `surface-2` + `line` border | Legacy ss secondary colors | High |
| Input | Token input + accent Send (disabled when empty) | Legacy styled input + amber Send | High |
| Placeholder | “Message your class…” | “Write a message…” | Low |

---

### `/classes/[id]/materials` — Materials

**Not in mockup** (no Materials tab).

| Issue | Detail |
|-------|--------|
| Entire feature post-mockup | Accordion groups + file grid |
| Styling | Fully legacy inline hex |
| Plan | Apply design-system cards/accordions; keep current IA |

---

### `/classes/[id]/invite` — Invite

**Not in mockup** (invites are part of new-class wizard step 3).

| Issue | Detail |
|-------|--------|
| Separate route vs wizard step | IA difference |
| Styling | Legacy |

---

### `/dashboard/analytics` — Analytics

| Issue | Detail |
|-------|--------|
| No mockup screen | — |
| Stat numerals | Sans 22px, not serif display | Medium |
| Cards | Amber borders (`#6a5530`) | High vs indigo system |
| Charts | Hard-coded greens/ambers | High |

---

### `/inbox` — Inbox

| Issue | Detail |
|-------|--------|
| Mockup “Messages” = class chat, not invites | Different feature |
| Duplicate header | Inner H1 duplicates topbar breadcrumb | Medium |
| Styling | Legacy card/button styling | High |
| Plan | `PageHeader`, `Card`, `Badge`, `Button` |

---

### `/settings/access` — Access & accounts

| Issue | Detail |
|-------|--------|
| No mockup | — |
| Styling | Fully legacy |
| Components | Local `Section` / `PersonRow` instead of primitives | Medium |

---

### `/settings/preferences` — Preferences

| Issue | Detail |
|-------|--------|
| No mockup | — |
| Status | **Already migrated** (AppShell + EmptyState) — reference for other settings pages |

---

### Employer portal (`/employer/*`)

| Issue | Detail |
|-------|--------|
| No mockup | Separate persona |
| Layout | `EmployerLayout` instead of `AppShell` | **High** |
| Styling | Amber dot nav, inline styles, no theme toggle | High |
| Typography | 16px sans headers vs serif `PageHeader` | Medium |

---

### Error / loading states

| Issue | Detail |
|-------|--------|
| `ErrorView`, `ShellSkeleton` | Aligned with new system |
| Employer route errors | Still inside legacy shell | Medium |

---

## Summary diagram

```
┌─────────────────────────────────────────────────────────────┐
│  MOSTLY ALIGNED                                             │
│  Login/Signup shell · AppShell grid · Topbar breadcrumb     │
│  Dashboard stat cards (partial) · Preferences · UI primitives│
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  STRUCTURAL MISMATCHES                                        │
│  Dashboard layout (Today + HW sections)                     │
│  Session sidebar vs global-only sidebar                     │
│  Schedule: calendar vs list                                   │
│  New class: wizard vs single form                           │
│  Overview: simple 2-col vs stats wall                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  COSMETIC / TOKEN DRIFT                                       │
│  Legacy hex in 15+ client components                        │
│  Auth brand panel color · Chat bubbles · Employer skin       │
└─────────────────────────────────────────────────────────────┘
```

---

## Migration plan

### Phase 0 — Lock the contract

1. **Mockup is canonical for:** shell grid, typography, color tokens, card/list row patterns, tab bar, auth split layout, dashboard composition, class header + tabs, homework row list, chat card, schedule list (see Phase 3 decision).
2. **App is canonical for:** Materials, Analytics, Inbox (invites), employer portal, payment cycles, invite route, submissions grading, role-based permissions.
3. **Explicitly out of scope:** “View as” role switcher, HCI Concepts toggle, “Explore live demo”, syllabus % (unless syllabus tracking is built), “Start session” (unless lesson launch is built).
4. Keep this file updated as pages are migrated.

---

### Phase 1 — Foundation (low risk, high leverage)

**Goal:** Every page can migrate without rewriting styles again.

1. Add composite primitives extracted from the mockup:
   - `ListRow` — time column + accent bar + body + status pill
   - `SessionCard` / `AttentionRow` — dashboard Today + homework rows
   - `ClassListRow` — compact class picker
   - `ChatPanel` — header + scroll + composer
   - `SegmentedControl` — optional; for theme toggle if adopting mockup sun/moon segment
2. Extend `Badge` variants for mockup due/status pills (warn, ok, neutral mono uppercase).
3. Remove `--color-ss-*` usage file-by-file; delete aliases from `globals.css` when count hits zero.
4. Fix auth brand panel: `AuthShell` left panel from `bg-brand` → `bg-ink` with warm off-white text (match mockup).
5. Theme toggle: keep single icon (document as intentional) **or** adopt mockup segmented control in `topbar.tsx`.

---

### Phase 2 — Chrome alignment (navigation)

**Goal:** One consistent frame.

1. **Resolve sidebar IA** — pick one:
   - **Option A (mockup-faithful):** Global sidebar only; class tabs only in main content; remove session-mode duplicate nav.
   - **Option B (recommended):** Keep session sidebar for class identity + payment cycle; remove redundant Overview/Homework/… links from sidebar **or** from header tabs, not both.
2. Add role label under user name in sidebar footer.
3. Breadcrumb rules: `Dashboard` vs `Classes / {title}` vs `Classes / New class`.
4. Wrap `/classes/new` in `AppShell` with breadcrumb (stop using floating centered page).

---

### Phase 3 — Page migrations (by visibility)

| Order | Page | Work |
|-------|------|------|
| 1 | **Dashboard** | Add Today + homework sections (wire lessons/HW in `page.tsx`); time-of-day greeting; reshape stats where data exists; compact class list |
| 2 | **Class layout** | Restyle header meta; style Invite/Members as secondary + primary; align title size |
| 3 | **Homework** + **Submissions** | Row list pattern; `Button` / `Badge` tokens |
| 4 | **Chat** | Rebuild on `ChatPanel`; accent self-bubbles |
| 5 | **Schedule** | **Decision required** — see below |
| 6 | **Overview** | Simplify toward 2-column mockup where data exists; keep cycle stats as sections below |
| 7 | **New class** | Multi-step wizard UI mapped to existing `createClass` action |
| 8 | **Inbox** | `PageHeader` + card rows; remove inner H1 |
| 9 | **Settings / Access** | Same pattern as Preferences |
| 10 | **Materials** | Accordion + file grid on `Card` |
| 11 | **Analytics** | Serif stat numerals, token bars, remove amber accordion borders |
| 12 | **Employer portal** | `AppShell` variant or full token restyle — do last |

**Schedule decision (item 5):**

- **(a) Recommended:** Mockup list as default; keep calendar as “Calendar” sub-view for power users.
- **(b)** Replace calendar entirely with list.
- **(c)** Keep calendar only; restyle to tokens without layout change.

---

### Phase 4 — Verification

1. Visual checklist: light + dark on every route.
2. CI grep gate: fail on `style={{` or `--color-ss-` in `app/` (allowlist employer until Phase 3.12).
3. Side-by-side review against mockup HTML for the five canonical screens.

---

## Effort estimate

| Phase | Effort |
|-------|--------|
| 0 — Contract | ½ day |
| 1 — Primitives + token purge | 2–3 days |
| 2 — Chrome / nav | 1–2 days |
| 3 — Pages (1–7) | 4–6 days |
| 3 — Pages (8–12) | 3–4 days |
| 4 — QA | 1 day |

**Total:** ~2–3 weeks focused UI pass, assuming no new features (syllabus, demo mode, start session).

---

## Decisions required before implementation

| # | Question | Options |
|---|----------|---------|
| 1 | Schedule | List only (mockup) / calendar only (current) / both (recommended) |
| 2 | Sidebar | Global-only (mockup) / session sidebar with cycle widget (recommended) |
| 3 | Dashboard stats | Mockup metrics (attendance, to-grade) / current role-centric counts / hybrid |
| 4 | Overview syllabus | Build syllabus tracking / skip / replace with payment-cycle progress |
| 5 | Employer portal | Merge into `AppShell` / separate skin with same tokens |

Record decisions in this file when made.

---

## Related files

| File | Role |
|------|------|
| [`DESIGN-SYSTEM.md`](./DESIGN-SYSTEM.md) | Token and primitive reference |
| [`app/globals.css`](./app/globals.css) | CSS variable source of truth |
| [`components/ui/`](./components/ui/) | Primitives |
| [`components/shell/`](./components/shell/) | App chrome |
| [`ReduMe.md`](./ReduMe.md) | Product spec (features the UI must support) |
| [`design/StudentSpace-Redesign-decoded.html`](./design/StudentSpace-Redesign-decoded.html) | Unpacked mockup markup + inline styles |
| [`scripts/decode-redesign-html.mjs`](./scripts/decode-redesign-html.mjs) | Re-decode if the bundled HTML is updated |
