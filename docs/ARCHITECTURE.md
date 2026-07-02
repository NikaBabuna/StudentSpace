# StudentSpace — Architecture Reference

A single document that explains how the codebase is organized, how data flows, and what every source file does. For product rules see [PRODUCT.md](PRODUCT.md); for day-to-day development see [ENGINEERING.md](ENGINEERING.md).

---

## 1. What this app is

StudentSpace is a **class-centric** tutoring workspace. Each class has its own schedule, homework, materials, chat, and payment cycles. Users have roles per class (`tutor`, `student`, `parent`, `employer`). Employer accounts use a separate portal at `/employer`.

The codebase is a **Next.js 16 App Router** app with **Supabase** (PostgreSQL, Auth, Storage, Realtime) and **Vercel** hosting.

---

## 2. High-level architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Browser                                                                 │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                    proxy.ts (session refresh + route gate)
                                    │
┌───────────────────────────────────▼─────────────────────────────────────┐
│ app/ — Routes (Server Components)                                         │
│   • Auth guards via lib/auth.ts                                           │
│   • Data loading (Supabase server client)                                 │
│   • Renders AppShell + feature *Client components                         │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │ serializable props
┌───────────────────────────────────▼─────────────────────────────────────┐
│ features/ — Domain modules                                                │
│   • *Client.tsx — interactivity, forms, Realtime subscriptions            │
│   • actions.ts — mutations ("use server")                                 │
│   • lib/ — pure domain helpers (optional)                                 │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼─────────────────────────────────────┐
│ lib/ — Cross-cutting infrastructure                                       │
│   • Supabase clients, auth guards, validation, domain math, storage     │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼─────────────────────────────────────┐
│ Supabase — PostgreSQL · Auth · Storage · Realtime                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Design principles

| Principle | Meaning |
| --- | --- |
| **Thin routes** | `app/**/page.tsx` loads data and composes UI; no business mutations in routes |
| **Feature modules** | Each domain (`homework`, `schedule`, …) owns its UI + server actions |
| **Server-first reads** | Server Components query via `lib/supabase/server.ts` |
| **Server-only writes** | All DB mutations go through `features/**/actions.ts` |
| **Client uploads** | Files upload from the browser to Supabase Storage; server signs URLs |
| **Request-scoped cache** | `lib/auth.ts` uses `React.cache()` to dedupe auth/membership per request |

---

## 3. Request lifecycle

1. **Incoming request** hits `proxy.ts` (Next.js 16 “proxy”, formerly middleware).
2. **`lib/supabase/middleware.ts`** refreshes the Supabase session cookie and redirects unauthenticated users away from protected prefixes (`/dashboard`, `/calendar`, `/classes`, `/inbox`, `/settings`, `/employer`).
3. **Route handler** (`app/**/page.tsx` or `route.ts`) runs as a Server Component.
4. **Auth** — `requireAuth()`, `requireClassMember()`, or layout-specific checks (`employer` gate).
5. **Data** — batched Supabase reads via `getServerClient()`; attachments signed via `lib/storage.ts`.
6. **Render** — `AppShell` (tutor/student) or `EmployerShell` wraps feature client components.
7. **User action** — client calls a server action in `features/**/actions.ts`.
8. **Mutation** — action re-validates auth/role, writes to Supabase, calls `revalidatePath()`.
9. **Refresh** — client may call `router.refresh()` for immediate UI update.

### Public vs protected routes

| Public | Protected (session required) |
| --- | --- |
| `/`, `/login`, `/signup` | `/dashboard/**`, `/calendar` |
| `/auth/callback`, `/auth/confirm` | `/classes/**`, `/inbox`, `/settings/**`, `/employer/**` |

---

## 4. Repository layout

```
studentspace/
├── app/                    # Next.js routes only
├── features/               # Domain modules (UI + actions)
├── components/             # Design system (ui/) + app chrome (shell/)
├── lib/                    # Shared infrastructure
├── supabase/migrations/    # Versioned SQL schema + RLS + storage
├── docs/                   # Product, engineering, roadmap, this file
├── proxy.ts                # Session + route gate entry
└── [config files]          # next.config, vitest, sentry, etc.
```

---

## 5. Layer reference

### 5.1 `proxy.ts` — Edge gate

| | |
| --- | --- |
| **Role** | Next.js 16 proxy entry; delegates to `lib/supabase/middleware.ts` on every matched request |
| **Dependencies** | `lib/supabase/middleware.ts` |
| **Output** | `NextResponse` with refreshed cookies or redirect to `/login` |

### 5.2 `lib/` — Infrastructure

| File | Role | Dependencies | Used by | Key exports |
| --- | --- | --- | --- | --- |
| `lib/supabase/client.ts` | Browser Supabase client | `@supabase/ssr`, env vars | Login/signup pages, client components, Realtime, storage uploads | `createClient()` |
| `lib/supabase/server.ts` | Server Supabase client (cookie-based SSR) | `next/headers`, `@supabase/ssr` | Server Components, server actions | `createClient()` |
| `lib/supabase/middleware.ts` | Session refresh + protected-route redirect | `@supabase/ssr` | `proxy.ts` | `updateSession()` |
| `lib/auth.ts` | Cached auth guards and membership loaders | `lib/supabase/server`, `lib/types` | Protected pages and layouts (not server actions) | `requireAuth`, `requireClassMember`, `requireTutor`, `getServerClient`, `getCurrentUser`, `getClassRow`, `getClassMembership` |
| `lib/types.ts` | Client-safe domain types | — | Features, components | `ClassRole`, `Attachment`, `ClassSummary`, `toAttachments()` |
| `lib/database.types.ts` | **Generated** Supabase TypeScript types | — | All Supabase clients | `Database` |
| `lib/validation.ts` | Zod schemas shared by client + server | `zod` | Forms, server actions | `signupSchema`, `classCreateSchema`, `homeworkSchema`, `lessonSchema`, `firstError()` |
| `lib/utils.ts` | Tailwind class merge helper | `clsx`, `tailwind-merge` | All UI | `cn()` |
| `lib/theme.ts` | Theme constants + subscribable theme store | — | `theme-toggle` (via `useSyncExternalStore`), `globals.css` | `getActiveTheme`, `applyTheme`, `toggleTheme`, `subscribeTheme` |
| `lib/time.ts` | **App-timezone helpers** — all server-side date formatting/bucketing must go through here (see [DECISIONS.md §4](DECISIONS.md)) | `Intl` only | Server loaders, overview page, homework actions | `APP_TIME_ZONE`, `zonedWallClockToUtcIso`, `dayKeyInZone`, `isSameDayInZone`, `hourInZone`, `formatDateInZone`, `formatTimeInZone` |
| `lib/payments.ts` | Pure payment-cycle math (overflow rollover) | — | `schedule/actions`, tests | `sumCompletedHours`, `computeCycleClose` |
| `lib/homework.ts` | Pure deadline/submission rules | — | Homework UI, actions, tests | `deadlineStatus`, `canSubmit` |
| `lib/storage.ts` | Signed URL helpers for private buckets; logs `SS-STORE-01` on signing failure | Supabase storage API, `lib/log` | Pages loading attachments | `signStoredUrl`, `signAttachments`, bucket constants |
| `lib/errors.ts` | **Error catalog** — every internal code with its user-facing message + severity (see [ERRORS.md](ERRORS.md)) | — | `lib/log`, server actions, tests | `ERROR_CATALOG`, `ErrorCode`, `userMessage` |
| `lib/log.ts` | Structured server logging; `actionFail` = log the technical detail, return the friendly message | `@sentry/nextjs`, `lib/errors` | All `features/**` actions, `lib/storage` | `logEvent`, `actionFail` |
| `lib/rate-limit.ts` | Best-effort in-memory throttle for abuse-prone actions (email lookups) | — | invite / create-class / settings actions | `checkRateLimit` |
| `lib/dashboard-data.ts` | Batched queries for dashboard home | `lib/auth`, `lib/dashboard-stats`, `lib/time` | `app/(shell)/dashboard/page.tsx` | `loadDashboardData()` |
| `lib/dashboard-stats.ts` | Stat card builders and greeting (app-timezone aware) | `lib/time` | `dashboard-data`, analytics | `buildDashboardStats`, `greetingForHour` |
| `lib/calendar-data.ts` | Batched queries for cross-class calendar | `lib/auth` | `app/(shell)/calendar/page.tsx` | `loadCalendarData()` |
| `lib/recent-classes.ts` | Recent-class visits in `localStorage`, exposed as an external store for `useSyncExternalStore` | `localStorage` | `DashboardHomeClient`, `RecordClassVisit` | `recordClassVisit`, `subscribeRecentClassVisits`, `getRecentClassVisitsSnapshot`, sort helpers |
| `lib/*.test.ts` | Unit tests colocated with each pure module (payments, homework, time, rate-limit, errors, validation, dashboard-stats, recent-classes) — coverage-gated, see [TESTING.md](TESTING.md) | `vitest` | CI | — |

### 5.3 `components/` — UI kit and chrome

#### `components/ui/` — Design-system primitives (shadcn-style)

Reusable, token-styled building blocks. No business logic. Compose these in features and routes.

| File | Delivers |
| --- | --- |
| `avatar.tsx` | Initials-based avatar |
| `badge.tsx` | Status/label chips with tone variants |
| `button.tsx` | Primary/secondary/ghost buttons |
| `card.tsx` | Surface container |
| `empty-state.tsx` | Placeholder when lists are empty |
| `field.tsx` | Label + input wrapper with error display |
| `file-drop-zone.tsx` | Click/drag file picker with pending list (`FileDropZone`, `formatFileSize`) |
| `icon-button.tsx` | Icon-only button |
| `input.tsx`, `textarea.tsx`, `label.tsx` | Form controls |
| `progress.tsx` | Progress bar |
| `skeleton.tsx`, `spinner.tsx` | Loading indicators |
| `stat-card.tsx` | Dashboard metric card |
| `tabs.tsx` | Tab navigation |
| `use-escape-close.ts` | Shared hook: dialogs close on Escape (used by every portal dialog) |

#### `components/shell/` — Application frame

| File | Role |
| --- | --- |
| `app-shell.tsx` | Main layout: fixed sidebar + sticky topbar + scrollable main |
| `auth-shell.tsx` | Centered card layout for login/signup |
| `sidebar.tsx` | Navigation (dashboard vs in-class modes) |
| `mobile-nav.tsx` | Mobile drawer nav (used by `AppShell` / `EmployerShell`) |
| `topbar.tsx` | Breadcrumb, theme toggle slot, actions |
| `page-container.tsx` | Consistent horizontal padding/max-width |
| `theme-toggle.tsx` | Dark/light switch (`data-theme` on `<html>`) |
| `class-settings-modal.tsx` | Tutor class edit/delete modal |
| `back-link.tsx` | Shared back navigation link (chevron + hover tint) |
| `error-view.tsx` | Shared error boundary UI |
| `loading-skeleton.tsx` | Route-level loading placeholders |

#### `components/icons.tsx`

SVG icon components used across the shell and features. `SettingsIcon` is a
six-tooth cog outline with a center hole; `SunIcon` / `MoonIcon` are reserved for
the theme toggle.

### 5.4 `features/` — Domain modules

Each folder follows: `actions.ts` (mutations), `components/*Client.tsx` (interactive UI), optional `lib/` (pure helpers).

#### `features/chat/`

| File | Role | Actions / I/O |
| --- | --- | --- |
| `actions.ts` | Post a class message | In: `classId`, `body` → Out: `{ error }` |
| `components/ChatPage.tsx` | Realtime chat UI; subscribes to `messages` | Header data (title, member count, user id) arrives as server props; messages load client-side where the Realtime subscription lives |

#### `features/classes/`

| File | Role |
| --- | --- |
| `actions/create-class.ts` | `lookupInviteEmail`, `createClassPipeline`, `createClass` — full class creation with optional invites |
| `actions/invite.ts` | `sendInvite` — invite user by email to a class |
| `actions/members.ts` | `removeMember` — tutor removes a roster member |
| `components/NewClassForm.tsx` | Multi-step class creation wizard |
| `components/NewClassStepper.tsx` | Step indicator for wizard |
| `components/InviteClient.tsx` | Invite form on class invite page |
| `components/MembersButton.tsx` | Roster popover in class header |
| `lib/new-class-utils.ts` | Level chip styling, effective level string |

#### `features/calendar/`

Cross-class calendar at `/calendar`. Distinct from per-class schedule (`features/schedule/` + `/classes/[id]/schedule`).

| File | Role |
| --- | --- |
| `components/CalendarClient.tsx` | Multi-class calendar grid; lesson drill-down |
| `components/CalendarLessonDialog.tsx` | View/edit a lesson from the calendar |
| `components/AddLessonDialog.tsx` | Quick-add lesson from calendar |
| `lib/calendar-utils.ts` | Date grid helpers, lesson positioning |

Data loader: `lib/calendar-data.ts` (not in this folder — shared infra pattern like `lib/dashboard-data.ts`).

#### `features/dashboard/`

| File | Role |
| --- | --- |
| `actions.ts` | `updateClass`, `deleteClass` |
| `components/DashboardHomeClient.tsx` | Home: stats, today’s sessions, homework attention |
| `components/ClassesClient.tsx` | Class list with grouping |
| `components/AnalyticsClient.tsx` | Range-filtered analytics shell |
| `components/analytics-charts.tsx` | Chart implementations (attendance, homework, earnings) |
| `components/EarningsAnalytics.tsx`, `LessonActivityAnalytics.tsx` | Analytics section panels |
| `components/AnalyticsRangePicker.tsx` | Date-range control |
| `components/class-shared.tsx` | `ClassCard`, `ClassGroup` shared list items |
| `lib/load-analytics-data.ts` | Batched analytics queries |
| `lib/analytics-aggregation.ts`, `earnings-aggregation.ts`, `lesson-activity-aggregation.ts`, `homework-stats.ts` | Pure aggregation helpers (+ `.test.ts` where present) |
| `hooks/use-chart-focus.ts` | Chart interaction state |

#### `features/schedule/`

Per-class weekly schedule and payment cycles at `/classes/[id]/schedule`.

| File | Role |
| --- | --- |
| `actions.ts` | Lesson CRUD, complete/miss/cancel, recurring schedules, `markCyclePaid` |
| `components/ScheduleClient.tsx` | Weekly view, cycle sidebar, lesson actions |
| `components/ScheduleLessonDialog.tsx` | Add single or recurring lessons |
| `components/LessonOccurrenceDialog.tsx` | Edit one occurrence of a recurring lesson |
| `components/LessonScheduleFields.tsx` | Shared form fields + validation helpers |
| `lib/schedule-utils.ts` | Date/time formatting, lesson status badges, recurrence labels |

#### `features/homework/`

| File | Role |
| --- | --- |
| `actions.ts` | `createHomework`, `updateHomework`, `deleteHomework`, `submitHomework` |
| `submissions-actions.ts` | `gradeSubmission` |
| `components/HomeworkClient.tsx` | Assignment list, tutor create/edit, student submit |
| `components/SubmissionsClient.tsx` | Per-homework submission grading view |

#### `features/materials/`

| File | Role |
| --- | --- |
| `actions.ts` | Group CRUD, file insert, rename, pin, soft-delete |
| `components/MaterialsClient.tsx` | Accordion file groups, upload UI |

#### `features/inbox/`

| File | Role |
| --- | --- |
| `actions.ts` | `respondInvite`, `respondParentRequest` |
| `components/InboxClient.tsx` | Pending invites and parent-link requests |

#### `features/settings/`

| File | Role |
| --- | --- |
| `actions.ts` | `sendParentRequest`, `removeChild`, `removeParent` |
| `components/AccessClient.tsx` | Parent-child linking UI |

#### `features/employer/`

Organisation (employer) portal. Its tabs are gated behind "coming in the next
update" placeholders while the portal is rebuilt; the chrome now uses the shared
design system (the legacy inline-style version was removed).

| File | Role |
| --- | --- |
| `EmployerShell.tsx` | Employer layout chrome — design-system styled, mobile drawer |
| `EmployerComingSoon.tsx` | Shared "next update" placeholder for every employer tab |

### 5.5 `app/` — Routes

Routes are **Server Components** unless noted. They authenticate, fetch, sign URLs, and pass props to client components.

**Route group `app/(shell)/`** — Dashboard-mode pages share `AppShell` (sidebar + topbar). The `(shell)` segment is omitted from URLs.

#### Root and auth

| File | Role |
| --- | --- |
| `layout.tsx` | Root HTML: fonts, theme init script, `globals.css` |
| `page.tsx` | `/` — redirect logged-in users to `/dashboard`, else `/login` |
| `globals.css` | Design tokens, Tailwind v4 theme, `data-theme` variants |
| `error.tsx`, `global-error.tsx` | App-wide error boundaries |
| `login/page.tsx` | Email/password login (client form) |
| `signup/page.tsx` | Registration (personal vs business/employer) |
| `auth/callback/route.ts` | PKCE OAuth code exchange |
| `auth/confirm/route.ts` | Email OTP verification |

#### Dashboard shell (`app/(shell)/`)

| File | Role |
| --- | --- |
| `(shell)/layout.tsx` | Persistent `AppShell` for dashboard-mode routes |
| `(shell)/dashboard/page.tsx` | Tutor home via `loadDashboardData()` |
| `(shell)/dashboard/classes/page.tsx` | Class list |
| `(shell)/dashboard/analytics/page.tsx` | Analytics |
| `(shell)/calendar/page.tsx` | Cross-class calendar via `loadCalendarData()` |
| `(shell)/inbox/page.tsx` | Pending invites and parent requests |
| `(shell)/settings/access/page.tsx` | Parent-child linking |
| `(shell)/settings/preferences/page.tsx` | Preferences placeholder |
| `(shell)/classes/new/page.tsx` | New class wizard |
| `(shell)/**/loading.tsx`, `(shell)/dashboard/error.tsx` | Boundaries |

#### Classes

| File | Role |
| --- | --- |
| `classes/new/page.tsx` | New class wizard |
| `classes/[id]/layout.tsx` | Class `AppShell`, header, members button |
| `classes/[id]/overview/page.tsx` | Role-aware stats dashboard for one class |
| `classes/[id]/schedule/page.tsx` | Schedule tab data loader |
| `classes/[id]/homework/page.tsx` | Homework list |
| `classes/[id]/homework/[hwId]/page.tsx` | Single homework + submissions |
| `classes/[id]/materials/page.tsx` | Materials |
| `classes/[id]/chat/page.tsx` | Loads chat header data (cached class row + member count), renders `ChatPage` |
| `classes/[id]/invite/page.tsx` | Invite members |
| `classes/[id]/loading.tsx`, `error.tsx` | Boundaries |

#### Employer portal

| File | Role |
| --- | --- |
| `employer/layout.tsx` | Gates `users.is_employer`; wraps `EmployerShell` |
| `employer/page.tsx` | Overview — placeholder ("coming in the next update") |
| `employer/analytics/page.tsx` | Analytics — placeholder |
| `employer/inbox/page.tsx` | Inbox — placeholder |
| `employer/settings/page.tsx` | Settings — placeholder |

### 5.6 `supabase/migrations/`

| Migration | Contents |
| --- | --- |
| `0001_initial_schema.sql` | Core tables: users, classes, members, lessons, homework, etc. |
| `0002_rls_policies.sql` | Row-level security policies |
| `0003_storage_policies.sql` | Storage bucket policies |
| `0004_recurring_lessons.sql` | Recurring schedule support |

### 5.7 Root config (not application logic)

| File | Role |
| --- | --- |
| `next.config.ts` | Next.js configuration |
| `vitest.config.ts` | Test runner config |
| `instrumentation.ts`, `instrumentation-client.ts` | Sentry bootstrap |
| `sentry.server.config.ts`, `sentry.edge.config.ts` | Sentry environment configs |
| `postcss.config.mjs`, `eslint.config.mjs` | Build/lint tooling |
| `components.json` | shadcn/ui config |

---

## 6. Data flow patterns

### Server page → client component

```typescript
// app/classes/[id]/homework/page.tsx (simplified)
const user = await requireAuth();
const membership = await getClassMembership(classId, user.id);
const { data: homework } = await supabase.from("homework").select(...);
const signed = await signAttachments(supabase, HOMEWORK_BUCKET, attachments);
return <HomeworkClient role={membership.role} items={signed} />;
```

### Client mutation

```typescript
// features/homework/components/HomeworkClient.tsx (simplified)
const result = await createHomework({ classId, title, deadline, ... });
if (!result.error) router.refresh();
```

### File upload

1. Client uploads to Supabase Storage (`lib/supabase/client.ts`).
2. Client passes public/authenticated URL to server action.
3. Server stores URL in `attachments` jsonb.
4. On read, server signs URLs via `lib/storage.ts`.

### Payment cycle close (on lesson complete)

1. `completeLesson` in `features/schedule/actions.ts`.
2. Loads cycle + completed hours.
3. `computeCycleClose` from `lib/payments.ts` decides overflow.
4. May split lesson hours across two cycles (A2 rollover rule).

---

## 7. Auth and roles

| Mechanism | Location | Purpose |
| --- | --- | --- |
| Session cookie refresh | `proxy.ts` → `middleware.ts` | Keep users logged in |
| Route gate | `middleware.ts` | Block unauthenticated access to app areas |
| Page guards | `lib/auth.ts` | `requireAuth`, membership checks — **redirect** on failure |
| Action guards | Each `features/**/actions.ts` | Local helpers return `{ error }` — **never** `redirect()` |
| Employer redirect | `app/employer/layout.tsx` | `is_employer` users only |

**Class roles** (`class_members.role`): `tutor` | `student` | `parent` | `employer`.

RLS policies exist in migrations but app-layer guards are the primary protection until production verification (see [ROADMAP.md](ROADMAP.md)).

---

## 8. Server actions catalog

All live under `features/` with `"use server"`. Convention: return `{ error: string | null }` (or `{ groupId, error }`). Unexpected failures go through `actionFail(code, detail, context)` from `lib/log.ts` — the raw detail is logged under its [ERRORS.md](ERRORS.md) code and the client receives only the catalogued friendly message.

| Module | Actions |
| --- | --- |
| Chat | `postMessage` |
| Classes | `lookupInviteEmail`, `createClassPipeline`, `sendInvite`, `removeMember` |
| Dashboard | `updateClass`, `deleteClass` |
| Schedule | `completeLesson`, `missLesson`, `cancelLesson`, `deleteLesson`, `scheduleLesson`, `createRecurringSchedule`, `setRecurringScheduleActive`, `deleteRecurringSchedule`, `markCyclePaid` |
| Homework | `createHomework`, `updateHomework`, `deleteHomework`, `submitHomework`, `gradeSubmission` |
| Materials | `createMaterialGroup`, `insertMaterials`, `renameMaterialGroup`, `deleteMaterial`, `deleteMaterialGroup`, `toggleMaterialPin` |
| Inbox | `respondInvite`, `respondParentRequest` |
| Settings | `sendParentRequest`, `removeChild`, `removeParent` |

After mutations, actions call `revalidatePath()` for affected routes.

---

## 9. Storage

| Bucket | Used for |
| --- | --- |
| `materials` | Class reference files |
| `homework-attachments` | Homework attachments and student submissions |

Attachment shape (jsonb):

```json
[{ "url": "...", "name": "file.pdf", "size_bytes": 12345, "mime_type": "application/pdf" }]
```

---

## 10. Naming conventions

| Pattern | Example | Meaning |
| --- | --- | --- |
| `*Client.tsx` | `HomeworkClient.tsx` | `"use client"` interactive component |
| `ScheduleClient` vs `CalendarClient` | `features/schedule/` vs `features/calendar/` | Per-class schedule tab vs cross-class `/calendar` |
| `actions.ts` | `features/inbox/actions.ts` | Server actions for one domain |
| `actions/*.ts` | `features/classes/actions/invite.ts` | Split when a domain has several action surfaces |
| `*-actions.ts` | `features/homework/submissions-actions.ts` | Secondary action file for a related surface |
| `page.tsx` | `app/(shell)/dashboard/page.tsx` | Route entry (Server Component) |
| `route.ts` | `app/auth/callback/route.ts` | API route handler |
| `loading.tsx` / `error.tsx` | Per-route | Next.js Suspense / error boundaries |

Import alias: `@/` → project root.

---

## 11. File header convention

Every application source file starts with a block comment:

```
/* =============================================================================
 * path/file — Short title
 * -----------------------------------------------------------------------------
 * Role: What this file does in the codebase
 * Dependencies: What it imports or relies on
 * Used by: Callers / routes
 * Inputs / outputs: For actions and loaders
 * ========================================================================== */
```

Generated files (`lib/database.types.ts`, `next-env.d.ts`) and test/config files are documented here instead of inline headers.

---

## 12. Related documents

| Document | Contents |
| --- | --- |
| [PRODUCT.md](PRODUCT.md) | Schema, roles, business rules |
| [ENGINEERING.md](ENGINEERING.md) | Dev setup, deployment, design tokens, timezone rules |
| [DECISIONS.md](DECISIONS.md) | Design decisions and philosophy — the *why* behind this structure |
| [QUALITY.md](QUALITY.md) | Quality standard and definition of done |
| [TESTING.md](TESTING.md) | Testing contract and coverage thresholds |
| [ERRORS.md](ERRORS.md) | Error-code catalog and logging |
| [ROADMAP.md](ROADMAP.md) | Production hardening backlog |

---

*This document describes the codebase architecture. Update it when adding new domains, routes, or cross-cutting modules.*
