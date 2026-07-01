# Production roadmap

Path from **feature-complete V1** to **hardened production** for a small tutoring deployment (1–10 concurrent users). Product features and business rules live in [PRODUCT.md](PRODUCT.md). Engineering setup in [ENGINEERING.md](ENGINEERING.md).

**Strategy:** Layered hardening — not a rewrite. Ship value first, then close security and ops gaps in order.

---

## Production-ready means

| Gate | Criteria |
| --- | --- |
| **Security** | Storage buckets private with signed URLs; RLS policies applied and spot-checked per role; all writes go through server actions with auth checks |
| **Reliability** | CI passes build + tests; critical routes have error/loading UI; Sentry configured in production |
| **Operations** | Migrations versioned in git and applied to prod; smoke test documented; basic recovery plan exists |

---

## Current snapshot

**App:** Core flows work end-to-end (classes, schedule, homework, materials, chat, inbox, analytics). The employer/organisation portal is gated behind "coming in the next update" placeholders pending a rebuild on the design system.

**Gaps before calling production hardened:**

1. **Storage** — Signed-URL code and policy SQL exist; buckets may still be public until manually flipped in Supabase.
2. **RLS** — Policy SQL is in repo (`0002`, `0003`, `0004`); migration notes say policies are applied in production, but there is no automated role × table test matrix.
3. **Code quality** — ESLint reports `no-explicit-any` errors (concentrated in `app/(shell)/dashboard/analytics/page.tsx`, `lib/dashboard-data.ts`; the employer loaders that held the rest were removed when the portal was gated). CI lint is informational (`continue-on-error: true`).
4. **Employer UI** — ✅ Resolved. The legacy inline-style portal was removed; `EmployerShell` now uses the design system and the tabs are gated as "coming soon" pending a rebuild.

---

## Shipped (verified in repo)

### Foundation

- Next.js 16 App Router, TypeScript, Tailwind v4, Supabase, Vercel
- Versioned SQL migrations `0001`–`0004` (schema, RLS, storage policies, recurring lessons)
- Generated types: `lib/database.types.ts`
- `features/` module layout — thin `app/` routes; UI and actions under `features/`
- Supabase clients: `lib/supabase/` (browser, server, middleware)
- Route protection: `proxy.ts` → `lib/supabase/middleware.ts`
- Auth helpers: `lib/auth.ts` (`requireAuth`, `requireClassMember`, `requireTutor`, cached loaders)
- All database **mutations** in server actions under `features/` (storage uploads stay client-side)

### Application

- Dashboard, class spaces (overview, schedule, homework, materials, chat, invite)
- Payment cycles with server-side close logic (`completeLesson`); mark-paid UI on schedule
- Homework with deadline enforcement, resubmit before deadline, tutor grading
- Materials library with file groups
- Realtime class chat
- Inbox (invites + parent-link requests)
- Parent linking (`/settings/access`)
- Tutor analytics with live FX fetch (`open.er-api.com`) and static fallback rates
- Employer portal shell (`/employer`, analytics, inbox, settings) — tabs gated as "coming soon" placeholders pending a design-system rebuild
- Invite page tutor guard (`requireTutor`)
- Zod validation on signup, class create, homework, and lesson forms (`lib/validation.ts`)
- Signed URL helper (`lib/storage.ts`)

### Production plumbing

- GitHub Actions CI: lint (soft), `npm test`, `npm run build`
- Vitest unit tests: `lib/payments.ts`, `lib/homework.ts`
- Sentry wired (`@sentry/nextjs`; optional via `NEXT_PUBLIC_SENTRY_DSN`)
- Security headers in `next.config.ts` (CSP, HSTS, X-Frame-Options, etc.)
- Error boundaries: root, dashboard, classes, employer
- Loading skeletons: dashboard, classes, employer, inbox, settings/access
- App metadata in root `layout.tsx`
- Auth routes: `/auth/callback`, `/auth/confirm`
- Deployment and local-dev docs in [ENGINEERING.md](ENGINEERING.md)

---

## Phase 1 — Security (do first)

| # | Task | Status | Notes |
| --- | --- | --- | --- |
| 1.1 | **Flip storage buckets to private** | Open | Apply `0003_storage_policies.sql` if not already. Dashboard → Storage → set `materials` and `homework-attachments` to private. Smoke-test uploads and downloads via signed URLs. |
| 1.2 | **Confirm RLS on production** | Open | `0002_rls_policies.sql` enables RLS on all core tables. Verify `0004_recurring_lessons.sql` is applied (includes `recurring_schedules` policies). Run manual checks: tutor / student / parent / employer cannot read or write outside their scope. |
| 1.3 | **RLS role matrix (light)** | Open | Documented spot-check per role on: classes, homework, submissions, messages, storage. Full automated matrix is Phase 3. |
| 1.4 | **Rate-limit email lookup** | Open | Invite and parent-link flows search users by email — add throttling before wider exposure. |

**Exit criteria:** Private buckets verified; one tutor + one student account tested against RLS; no anon-key bypass of write paths.

---

## Phase 2 — Quality gates

| # | Task | Status | Notes |
| --- | --- | --- | --- |
| 2.1 | **Fix `no-explicit-any`** | Open | Concentrated in analytics data loaders. Target files: `app/(shell)/dashboard/analytics/page.tsx`, `lib/dashboard-data.ts`. (The employer loaders that held the rest were removed when the portal was gated.) |
| 2.2 | **Lint as CI gate** | Open | Set `continue-on-error: false` in `.github/workflows/ci.yml` after 2.1. |
| 2.3 | **Playwright happy path** | Open | Login → dashboard → class → post homework → student submit. Not in `package.json` yet. |
| 2.4 | **Sentry source maps** | Open | Config supports upload; set `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` on Vercel for readable stack traces. |

**Exit criteria:** CI lint + test + build all hard-fail on error; one E2E script runs locally.

---

## Phase 3 — Operations

| # | Task | Status | Notes |
| --- | --- | --- | --- |
| 3.1 | **Staging Supabase project** | Open | Apply migrations to staging before prod. |
| 3.2 | **Operational runbook** | Open | Restore DB, rotate keys, auth redirect troubleshooting, migration apply order. |
| 3.3 | **Backup / DR check** | Open | Confirm Supabase PITR on paid tier or export schedule; one restore drill. |
| 3.4 | **Schema drift check** | Open | Compare live DB (functions, triggers, policies) against `supabase/migrations/*.sql`. |
| 3.5 | **CI on preview deploys** | Open | Optional: Playwright against Vercel preview URLs on PRs. |

**Exit criteria:** Can recover from a bad migration; staging exists; runbook is one page.

---

## Phase 4 — Polish (post-hardening)

These improve UX and maintainability but do not block a cautious private launch.

| Task | Notes |
| --- | --- |
| **Employer portal rebuild** | ✅ Shell migrated to the design system; legacy inline-style components removed. Remaining: rebuild the actual Overview / Analytics / Inbox / Settings features (currently "coming soon" placeholders) on the design system. |
| **Per-cycle payment amount** | Amount/currency set at class creation and editable on the **open** cycle via class settings; no UI when a **new** cycle opens after close. |
| **Extract shared components** | `FileDropZone`, `DeadlineBadge` duplicated in `HomeworkClient` and `MaterialsClient`. |
| **User preferences** | `/settings/preferences` is a placeholder; needs timezone / display-name editing (likely after email-verification policy is decided). |
| **Require email verification** | Signup + confirm routes exist; toggle “confirm email” in Supabase and polish the unverified-user experience. |
| **Supabase local dev** | `supabase start` for offline schema work. |

---

## Product backlog (not production blockers)

Tracked for later product decisions — see also [PRODUCT.md → Roadmap](PRODUCT.md#roadmap).

| Item | Notes |
| --- | --- |
| Georgian i18n | No language layer or toggle in UI yet |
| Employer org hierarchy | Child orgs, scoped access |
| Push notifications | Homework, lessons, feedback |
| Mobile app | Out of scope — responsive web only |

---

## Recommended sequence

```
Phase 1 (security)  →  Phase 2 (CI / lint / E2E)  →  Phase 3 (ops)  →  Phase 4 (polish)
```

Within Phase 1: **1.1 storage** and **1.2 RLS confirm** in the same session (both are Supabase dashboard + smoke-test work).

---

## Corrections from prior roadmap

| Old claim | Actual state |
| --- | --- |
| “99 → 81 lint errors” | **18** `no-explicit-any` errors today (25 total ESLint errors including other rules) |
| “Security headers — open” | **Done** in `next.config.ts` |
| “Live FX rates — open” | **Mostly done** — `AnalyticsClient` fetches live rates with static fallback |
| “paid_at / cancel / resubmit / invite guard — open” | **Done** |
| “Design system migration (employer)” listed twice | Merged into Phase 4 |

---

Engineering history: [CHANGELOG.md](../CHANGELOG.md).
