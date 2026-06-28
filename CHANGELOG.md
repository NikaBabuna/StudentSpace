# Changelog

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
