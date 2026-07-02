# Changelog

## Analytics fixes + cross-tab UI consistency polish + calendar upgrade

### Summary

Fixed six analytics/data bugs (the biggest: the parent tab silently showed no
data; the most visible: focusing a class shattered the earnings chart's
stacked bars), unified the small interaction details that differed from tab
to tab — dialog dismissal, overlay styling, button glyphs, role-badge
colours — rebalanced the dashboard preview panels, and upgraded the calendar
with a now-line, click-to-add slots, class filtering, status glyphs, and
keyboard navigation.

### Analytics bug fixes

- **Parent tab had no data.** `load-analytics-data.ts` only fetched lessons /
  homework / members for tutor+student class ids, so classes where the user is
  a **parent** member came back empty and their titles rendered as "Unknown".
  The loader now queries all memberships and exposes `parentClasses` so the
  parent tab resolves titles and stats correctly.
- **Stat totals vs chart buckets disagreed on the first day.** `rangeStart`
  returned a mid-day instant (now − 6/27 days) while chart buckets are
  day-aligned, so the first bucket's morning was excluded from the stat cards.
  Week/month starts are now aligned to start-of-day (tests updated to pin the
  bucket alignment).
- **All-time chart dropped recent months.** The 24-bucket cap truncated from
  the earliest month forward, cutting off the *newest* months once history
  exceeded 24. The window is now anchored to the current month and drops the
  oldest months instead (test strengthened: last bucket must contain today).
- **"Submitted" and "Feedback given" had identical legend colours.**
  `useChartTheme` read `--ok` verbatim for `okMuted`; it now applies a 0.55
  alpha (and the chart's compensating double-opacity hack was removed).
- **Class overview bucketed "due today" in the server's timezone.** One bare
  `toDateString()` comparison in the student homework list is now
  `isSameDayInZone` per the timezone rules.
- Tutor stat card relabelled "Total lessons" → "Lessons completed" (it always
  showed the completed count); the tab row is hidden when only one role tab
  exists.

### Chart focus stacking fix

- **Focusing a class broke the earnings chart's stacked bars** (stray
  side-by-side / full-height bars). The focus mode reordered the stacked `Bar`
  children to bottom-align the focused class, and Recharts drops the stack
  layout when children with a shared `stackId` reorder. Bar order is now
  stable; focus emphasis comes from dimming + the overlay area. Same latent
  bug removed from the lesson-activity chart's segment ordering.

### Dashboard home

- Replaced the fade-out "peek" rows in the classes and homework panels (the
  "See all" link rendered on top of a half-visible row) with a clean
  "See all (N)" footer row shared by all three panels; classes preview now
  shows 4 rows so the two side-by-side panels balance.
- Sessions 7+ days out now show their date ("Thu 9 Jul · 22:00") instead of a
  bare weekday, which read as out-of-order in the Overall list.

### Calendar upgrade

- **Now line** — red current-time marker across today's column, updating
  every minute.
- **Click an empty slot to add a lesson** (tutors) — opens the add dialog
  pre-filled with that day and the clicked time snapped to 30 minutes
  (`AddLessonDialog` gained `initialTime`).
- **Legend chips are now class filters** — click to hide/show a class in both
  views, with a "Show all" reset.
- **Status at a glance** — completed lessons show a ✓, missed show a ✕,
  cancelled titles are struck through (week blocks and month chips).
- **Keyboard navigation** — ← / → page the week/month, T jumps to today
  (disabled while dialogs are open or typing).
- Weekend columns get a subtle tint; an empty week shows a centered hint; a
  one-line affordance hint sits under the week grid.

### UI consistency polish

- **Every dialog now closes on Escape** via the new shared
  `components/ui/use-escape-close.ts` hook (previously only 2 of 10 dialogs
  did); the two hand-rolled listeners were replaced with the hook.
- **One overlay/panel recipe for all dialogs:** `bg-black/70` scrim +
  `bg-bg` panel (the class edit/settings modals used `/55` + `bg-surface`).
- **Close buttons use `CloseIcon`** everywhere (Members and Materials dialogs
  used a literal "✕").
- **Toolbar "+" buttons use `PlusIcon`** everywhere (Post homework, Upload,
  Invite, Submit work — Resubmit uses `RepeatIcon`), matching New class /
  Add lessons / Add lesson.
- **Members dialog role-badge colours** now match the class cards and inbox
  (student = green, parent = amber; they were flipped).
- **Class-tab toolbar summary lines** (schedule / homework / materials) share
  one style: `text-[14px] text-ink-2` with muted secondary counts.
- Overview panel header links gained the standard `hover:underline`.

## Testing & logging infrastructure — error codes, coverage gates, doc suite completion

### Summary

The app now has a real observability and testing backbone: every unexpected
server failure is logged under a documented error code (users see only friendly
messages), the unit suite grew from 17 to **88 tests** with CI-enforced coverage
thresholds on all pure domain modules, and the doc suite gained three new
documents (TESTING, QUALITY, ERRORS) with `AGENTS.md` rewritten as the single
routing file for AI agents. Also closed from the roadmap: storage buckets
private + RLS confirmed (done by the user in Supabase), and the duplicated
`FileDropZone` extracted to the design system.

### Error codes + logging (new)

- **New `lib/errors.ts`** — central catalog of 40 error codes
  (`SS-<DOMAIN>-<NN>`), each with a user-facing message and a severity
  (`warn` = expected denial, `error` = broken operation → Sentry).
- **New `lib/log.ts`** — `logEvent` (structured console + Sentry with `code`
  tags) and `actionFail(code, detail, context)`: logs the raw technical detail,
  returns only the catalogued friendly message to the client.
- **Every server action rewired** (all 10 action files — chat, classes×3,
  dashboard, schedule, homework×2, materials, inbox, settings): raw
  `error.message` from Supabase **never reaches the UI anymore**. Deliberate
  rule feedback ("deadline has passed") stays inline and unlogged, by design.
- **`lib/storage.ts`** — failed URL signing now logs `SS-STORE-01` instead of
  silently falling back (matters now that buckets are private: the fallback
  URL won't open).
- **New `docs/ERRORS.md`** — the full catalog: what each code means, where
  it's raised, how to read a log line, where logs live (dev terminal / Vercel
  function logs / Sentry). **`lib/errors.test.ts` fails CI if the doc and the
  catalog drift apart.**

### Testing (17 → 88 tests, coverage now CI-gated)

- **New test files:** `lib/time.test.ts` (timezone conversions — the recurring
  bug source), `lib/rate-limit.test.ts`, `lib/dashboard-stats.test.ts`
  (timezone-correct greeting + "today" bucketing), `lib/validation.test.ts`,
  `lib/errors.test.ts` (catalog invariants + doc sync),
  `lib/recent-classes.test.ts`; expanded `analytics-aggregation.test.ts` and
  `homework-stats.test.ts` from 3 tests to full behavioural coverage.
- **Found and fixed a real bug:** `zonedWallClockToUtcIso` treated
  already-zoned ISO strings (e.g. `…T18:30:00.000Z`) as naive wall clocks and
  silently shifted them 4 hours — the new pass-through test caught it; zoned
  values are now detected before the wall-clock parse.
- **Coverage as a contract:** installed `@vitest/coverage-v8`;
  `vitest.config.ts` lists the 10 pure domain modules whose coverage is
  enforced (85% stmts / 80% branches / 90% funcs / 85% lines — currently at
  99.5/80.4/100/100). New pure modules must be added to the list with tests.
- **CI now runs `npm run test:coverage`** — dropping coverage fails the build.
- **New `docs/TESTING.md`** — the contract: every feature ships with its
  test; pure logic gets unit tests, I/O gets build + smoke test; how to write
  tests here (fixed UTC instants, fake timers, regression-test-first).

### Docs & AI routing

- **New `docs/QUALITY.md`** — the quality bar: four CI gates (lint 0/0, tsc,
  coverage, build), code standards per layer, definition-of-done checklist,
  and the "sufficient, proceed" philosophy with its floor.
- **`AGENTS.md` rewritten as the core routing file** — a question→doc table
  and six rules of engagement (read before write, feature ships with test,
  failures get codes, verify all four gates, update invalidated docs +
  changelog, ask before irreversible changes).
- **`docs/DECISIONS.md`** — two new entries: §13 errors are catalogued (users
  never see internals), §14 tests are part of the feature.
- Repo `CLAUDE.md` and parent-folder `CLAUDE.md` point at the full doc suite;
  ENGINEERING/ARCHITECTURE updated for the new modules and conventions.

### Roadmap items closed

- **Phase 1 complete** (user-verified 2026-07-02): storage buckets private
  with signed URLs; RLS confirmed in production; per-role spot-check done.
- **Phase 4 "extract shared components"**: `FileDropZone` + `formatFileSize`
  deduplicated from `HomeworkClient`/`MaterialsClient` into
  `components/ui/file-drop-zone.tsx` (~180 duplicated lines removed).
  (`DeadlineBadge` had only one copy — left in place.)
- `coverage/` output ignored by git and ESLint.

### Verified

`npm run lint` — 0 errors, 0 warnings · `npx tsc --noEmit` — clean ·
`npm run test:coverage` — 88/88, thresholds pass · `npm run build` — ✓

---

## Polish pass — lint to zero, timezone fixes, rate limiting, docs for AI navigation

### Summary

A structural polish across the whole app: every ESLint error and warning fixed
(9 errors + 6 warnings → **0/0**, and lint is now a **blocking** CI gate), three
real timezone bugs fixed, email-lookup actions rate-limited, dead code removed,
and the documentation suite extended with a plain-English design-decisions
document so both humans and AI agents can navigate the codebase from the docs
alone. No feature behaviour changed except where noted as a bug fix.

### Bug fixes (timezone — server code ran in UTC, not the app zone)

- **`lib/dashboard-stats.ts`** — `greetingForHour` used the server's clock
  (UTC on Vercel), so "Good morning/afternoon/evening" was 4 hours off; and
  `todaySessionCount` bucketed "today" by UTC day boundaries. Both now use
  `lib/time.ts` (`hourInZone`, `dayKeyInZone`).
- **`app/classes/[id]/overview/page.tsx`** — lesson/homework dates and the
  "Due today" check formatted in the server's zone; now `formatDateInZone` /
  `formatTimeInZone` / `isSameDayInZone`.
- New helper: `hourInZone()` in `lib/time.ts`.

### React correctness (the `set-state-in-effect` lint errors were real patterns worth fixing)

- **`components/shell/theme-toggle.tsx` + `lib/theme.ts`** — theme is now a
  proper external store consumed via `useSyncExternalStore` (subscribe/notify
  in `lib/theme.ts`). No effect-driven state sync; multiple toggles stay in sync.
- **`lib/recent-classes.ts` + `DashboardHomeClient`** — recent-class visits are
  exposed as an external store (cached snapshot + `storage`-event subscription);
  the dashboard derives its sorted previews with `useMemo` instead of copying
  props into state inside effects. Cross-tab changes now propagate live.
- **`DashboardHomeClient`** — the header date label is now computed server-side
  in the app timezone (`loadDashboardData` → `dateLabel` prop) instead of in a
  client effect: no more empty-then-filled flash, and it can't disagree with
  the server's "today".
- **`app/login/page.tsx`** — verification/confirmation hints now come from
  `useSearchParams` derived during render (wrapped in `Suspense`) instead of a
  mount effect; form feedback takes over after submit.
- **`ScheduleLessonDialog`** — split into a thin `open` gate + body component
  that mounts fresh each time the dialog opens, so form state resets naturally
  (the reset-everything effect is gone).

### Performance / structure

- **Chat** — `app/classes/[id]/chat/page.tsx` is now a real server page: class
  title, member count, and current user id load server-side (class row comes
  from the request-cached `getClassRow`) and arrive as props. `ChatPage` no
  longer fires three client queries before showing the header; only messages
  (which live with the Realtime subscription) load client-side.
- **`app/classes/[id]/materials/page.tsx`** — rewritten on the cached
  `lib/auth.ts` helpers (was creating its own client + re-querying membership);
  membership + groups now load in one parallel batch, and **non-members are
  redirected** (previously they fell through with a default "student" role and
  relied on RLS alone).
- **`app/classes/[id]/schedule/page.tsx`** — dropped a redundant class fetch
  and two props (`userId`, `cycleHours`) that `ScheduleClient` never used.
- **Typed the membership joins** in `lib/dashboard-data.ts` and
  `lib/calendar-data.ts` (`MembershipRow`) — all `any` casts and their
  eslint-disables are gone.
- **Dead code removed:** deprecated `createClass` action (no callers),
  `sortClassesForPreview`, unused `userId` props on Materials/Schedule/Access
  clients, unused imports.

### Security

- **New `lib/rate-limit.ts`** — best-effort in-memory fixed-window limiter.
  Wired into every action that looks users up by email (account enumeration
  surface): `lookupInviteEmail`, `sendInvite`, `sendParentRequest`
  (15/min per user). Documented ceiling: per-serverless-instance; swap the Map
  for Upstash Redis if hard guarantees are ever needed. Closes ROADMAP 1.4.
- **CI lint gate flipped to blocking** (`continue-on-error` removed) now that
  the codebase is at 0 errors / 0 warnings. Closes ROADMAP 2.1 + 2.2.

### Documentation (AI-navigation pass)

- **New `docs/DECISIONS.md`** — plain-English record of the 13 decisions that
  shape the codebase (class-centric model, server-first, defense in depth,
  timezone convention, cycle rollover, soft-delete policy, no-waterfall
  loaders, honest-scale philosophy, …) with the *why* and the *consequence*
  of each. Linked from `AGENTS.md`, `ARCHITECTURE.md`, and `CLAUDE.md`.
- **`docs/ENGINEERING.md`** — new "Timezone rules" section (the recurring bug
  class is now documented in-repo, not just in session memory) + soft-delete
  and rate-limit conventions.
- **`docs/ARCHITECTURE.md`** — `lib/` table updated (added the previously
  undocumented `lib/time.ts`, new `lib/rate-limit.ts`, store-based
  `theme`/`recent-classes` entries); chat route and actions catalog corrected.
- **`docs/ROADMAP.md`** — statuses updated (1.4, 2.1, 2.2 done; code-quality
  gap resolved).
- **Parent-folder `CLAUDE.md`** (outside the repo) — rewritten from a stale
  Phase-5 snapshot (Next 15, per-student spaces, "RLS not enabled") into a
  pointer at the in-repo doc suite plus the user-context sections that don't
  rot. `AGENTS.md` note updated accordingly.

### Verified

`npm run lint` — 0 errors, 0 warnings · `npm test` — 17/17 · `npm run build` — ✓
(login page still prerenders statically under its new Suspense boundary).

---

## Navigation polish — settings gear + back links

### Summary

The class settings control used a sun-ray icon that read as "brightness" rather than
settings. Legacy back links (muted text + unicode arrow) were inconsistent with the
rest of the shell nav.

### Changes

- **`components/icons.tsx`** — `SettingsIcon` redrawn as a six-tooth cog outline
  (alternating inner/outer radius + center hole), matching the stroke icon set.
- **New** `components/shell/back-link.tsx` — shared back navigation link (chevron +
  hover surface tint, matching sidebar nav weight).
- **`shell/sidebar.tsx`** — "All classes" back link uses `BackLink`.
- **`InviteClient.tsx`**, **`SubmissionsClient.tsx`** — page-level back links use
  `BackLink` instead of `←` text links.
- **`NewClassForm.tsx`** — wizard Cancel/Back buttons use `ChevronLeftIcon` instead
  of unicode arrows.
- Docs updated (`ARCHITECTURE.md`, `ENGINEERING.md`).

---

## Organisation (employer) portal — gated + de-legacied

### Summary

The employer/organisation portal isn't finished, so its tabs are now gated
behind "coming in the next update" placeholders, and the legacy inline-style
employer code was removed as groundwork for a future rebuild on the design
system.

### Changes

- **New** `features/employer/components/EmployerComingSoon.tsx` — shared
  design-system placeholder (header + centered "Next update" card). All four
  employer tabs (`/employer`, `/analytics`, `/inbox`, `/settings`) now render it.
- **`EmployerShell.tsx`** — rewritten on the design system (semantic tokens +
  `components/ui/*` primitives: `Avatar`, `IconButton`, shared icons) instead of
  inline styles and `--color-ss-*` tokens. Keeps the mobile drawer.
- **Tab pages** are now static placeholders — the data loaders (and their
  `no-explicit-any` casts) are gone; access is still gated by `employer/layout.tsx`.
- **Removed (dead legacy code):** `EmployerClient.tsx`,
  `EmployerAnalyticsClient.tsx`, `PersonDetailClient.tsx`, and the person-detail
  routes `app/employer/students/[userId]` and `app/employer/tutors/[userId]`.
- Docs updated (`ARCHITECTURE.md`, `ENGINEERING.md`, `ROADMAP.md`).

---

## Mobile responsiveness

### Summary

Made the app usable on phones/tablets. The app was desktop-first: a permanently
mounted fixed-width sidebar (248px tutor/student, 220px employer) left almost no
room for content below ~1024px. Below the `lg` breakpoint the sidebar now
collapses into an off-canvas **drawer** opened by a hamburger in the topbar;
at `lg`+ the layout is unchanged.

### Changes

- **New** `components/shell/mobile-nav.tsx` — `MobileNavProvider` (shared
  open-state + close-on-navigation + body-scroll lock), `useMobileNav`, and the
  `SidebarTrigger` hamburger. `MenuIcon` added to `components/icons.tsx`.
- **`shell/app-shell.tsx`** — single column on mobile, `lg:grid-cols-[248px_1fr]`
  at `lg`+; wraps the shell in `MobileNavProvider`.
- **`shell/sidebar.tsx`** — `<aside>` is a fixed off-canvas drawer + backdrop +
  close button below `lg`; static sticky rail at `lg`+.
- **`shell/topbar.tsx`** — hamburger trigger + responsive padding.
- **`shell/page-container.tsx`** — `PageHeader` stacks vertically on mobile;
  smaller mobile title; tighter `PageContainer` padding on small screens.
- **`app/classes/[id]/layout.tsx`** — class header stacks on mobile.
- **`features/employer/components/EmployerShell.tsx`** — same drawer pattern for
  the employer portal. (The employer feature grids were later removed — see the
  organisation-portal entry above.)
- **`features/calendar/components/CalendarClient.tsx`** — week/month grids scroll
  horizontally (`min-w` + `overflow-x-auto`) so columns stay legible.
- **`shell/loading-skeleton.tsx`** — `ShellSkeleton` matches the responsive shell.

---

## Features module refactor

### Summary

Moved domain UI and server actions out of `app/` into `features/`, leaving routes as thin server pages (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`). Supabase clients consolidated under `lib/supabase/` (removed `utils/supabase/`).

### Server actions (current locations)

| File | Actions |
|------|---------|
| `features/classes/actions/create-class.ts` | `createClassPipeline`, `lookupInviteEmail` |
| `features/classes/actions/members.ts` | `removeMember` (tutor-only) |
| `features/classes/actions/invite.ts` | `sendInvite` (tutor-only; target + role re-derived server-side) |
| `features/schedule/actions.ts` | `completeLesson`, `missLesson`, `cancelLesson`, `deleteLesson`, `scheduleLesson`, `markCyclePaid`, recurring-slot helpers |
| `features/homework/actions.ts` | `createHomework`, `updateHomework`, `deleteHomework`, `submitHomework` |
| `features/homework/submissions-actions.ts` | `gradeSubmission` (tutor-only) |
| `features/materials/actions.ts` | `createMaterialGroup`, `insertMaterials`, `renameMaterialGroup`, `deleteMaterial`, `deleteMaterialGroup`, `toggleMaterialPin` |
| `features/chat/actions.ts` | `postMessage` (membership checked) |
| `features/inbox/actions.ts` | `respondInvite`, `respondParentRequest` |
| `features/dashboard/actions.ts` | `updateClass`, `deleteClass` (creator-only) |
| `features/settings/actions.ts` | `sendParentRequest`, `removeChild`, `removeParent` |

### Removed legacy duplicates

Pre-refactor copies under `app/**` (`*Client.tsx`, colocated `actions.ts`, `utils/supabase/`, unused `class-tabs.tsx` / `toast.tsx`, design decode artifacts).

---

## Server actions migration + error/loading UI (branch `feat/server-actions-mutations`)

### Summary

Moved **every** client-side database mutation into `"use server"` server actions
with authentication and role checks. Previously each `*Client.tsx` component wrote
to Supabase directly from the browser, so the UI was the only thing enforcing the
rules — anyone with the anon key could bypass them from the console. Now the rules
(tutor-only writes, invite/parent-request ownership, homework deadlines, class
membership) are enforced on the server where they can't be tampered with.

File **uploads to Supabase Storage stay client-side**; only the database row writes
moved to actions (matching the existing `submitHomework` pattern).

### Key behaviour improvements

- **Payment-cycle close moved server-side** (`completeLesson`). The multi-step
  close/open/overflow sequence previously ran as separate browser calls in
  `ScheduleClient.tsx` and was race-prone; it now runs inside one server action.
- **Invite and parent-request responses** now verify the row belongs to the
  current user and read the role / parent id from the database row instead of
  trusting client-supplied values (prevents role escalation).
- **`sendInvite`** re-looks-up the target by email server-side and forces the
  employer role for employer accounts.

### Components rewired (no more direct DB writes)

`ScheduleClient`, `HomeworkClient`, `SubmissionsClient`, `MaterialsClient`,
`InboxClient`, `DashboardHomeClient`, `AccessClient`, `InviteClient`, `MembersButton`,
`ChatPage`, `NewClassForm` — now under `features/*/components/`.

### Error & loading UI

- Added `error.tsx` for `app/dashboard`, `app/classes/[id]`, `app/employer`
  (report to Sentry + friendly retry).
- Added `loading.tsx` skeletons for `app/employer`, `app/inbox`,
  `app/settings/access` (existing `app/dashboard` and `app/classes/[id]` kept).
