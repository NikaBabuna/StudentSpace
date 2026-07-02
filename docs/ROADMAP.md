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

1. **Storage** — ✅ Resolved. Buckets flipped to private in production; signed URLs serve all files (`lib/storage.ts`); failures log `SS-STORE-01`.
2. **RLS** — ✅ Confirmed enabled in production and spot-checked per role (2026-07-02). The *automated* role × table matrix remains a Phase 3 item.
3. **Code quality** — ✅ Resolved. ESLint is at 0 errors / 0 warnings and lint is a **blocking** CI gate; coverage thresholds guard the pure domain modules.
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

- GitHub Actions CI: lint (blocking, 0/0), `npm run test:coverage` (coverage-gated), `npm run build`
- Vitest unit suite (88 tests) with enforced coverage thresholds on all pure domain modules (see [TESTING.md](TESTING.md))
- Error-code catalog + structured server logging (`lib/errors.ts`, `lib/log.ts`; see [ERRORS.md](ERRORS.md))
- Best-effort rate limiting on email lookups (`lib/rate-limit.ts`)
- Sentry wired (`@sentry/nextjs`; optional via `NEXT_PUBLIC_SENTRY_DSN`); error-severity codes forwarded with `code` tags
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
| 1.1 | **Flip storage buckets to private** | ✅ Done (2026-07-02) | Buckets private; signed URLs verified. Signing failures now log `SS-STORE-01` for visibility. |
| 1.2 | **Confirm RLS on production** | ✅ Done (2026-07-02) | RLS confirmed on all core tables in production. |
| 1.3 | **RLS role matrix (light)** | ✅ Done (2026-07-02) | Manual per-role spot-check performed. Full automated matrix is Phase 3. |
| 1.4 | **Rate-limit email lookup** | ✅ Done (best-effort) | `lib/rate-limit.ts` throttles `lookupInviteEmail`, `sendInvite`, `sendParentRequest` per user (in-memory, per serverless instance). Swap the Map for Upstash Redis if hard guarantees are ever needed. |

**Exit criteria:** Private buckets verified; one tutor + one student account tested against RLS; no anon-key bypass of write paths.

---

## Phase 2 — Quality gates

| # | Task | Status | Notes |
| --- | --- | --- | --- |
| 2.1 | **Fix `no-explicit-any`** | ✅ Done | Membership join rows are typed (`MembershipRow`) in `lib/dashboard-data.ts` and `lib/calendar-data.ts`. Zero `any` remains. |
| 2.2 | **Lint as CI gate** | ✅ Done | `continue-on-error` removed in `.github/workflows/ci.yml`; lint (0 errors, 0 warnings) hard-fails the build. |
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
| **Extract shared components** | ✅ Done — `FileDropZone` + `formatFileSize` now shared in `components/ui/file-drop-zone.tsx`. (`DeadlineBadge` turned out to have a single copy; left in `HomeworkClient`.) |
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
