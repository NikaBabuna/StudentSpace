# StudentSpace Production Tasks by Difficulty

All gaps, fixes, and improvements from the production readiness analysis, sorted by effort. Use this alongside `PRODUCTION-ROADMAP.md` for sprint planning.

**Difficulty guide:**

- **Easy** — A few hours to a day. Low risk, usually isolated changes.
- **Medium** — Several days to a week. Touches multiple files or requires careful testing.
- **Hard** — A week or more. Architectural, cross-cutting, or requires deep domain knowledge.

---

## Easy

Quick wins. Do these early for hygiene and to build momentum.

| Task | Category | Notes |
|------|----------|-------|
| Fix app metadata (`title`, `description`) in `app/layout.tsx` | Polish | Still says "Create Next App" |
| Remove dead code (`app/logout-button.tsx`) | Cleanup | Sign-out lives in sidebars |
| Add `paid_at` UI for payment cycles | Feature | Column exists; just needs tutor action in schedule or sidebar |
| Add lesson `cancelled` status to schedule UI | Feature | Enum exists in schema; add action alongside complete/miss |
| Allow homework resubmit before deadline | Feature | DB already allows multiples; UI currently blocks after first submit |
| Fix invite page tutor guard | Security | Server-side role check before render |
| Document env vars in README | Docs | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Reconcile `CLAUDE.md` with `ReduMe.md` | Docs | Retire or rewrite outdated project context |
| Add root `error.tsx` | Reliability | User-friendly fallback on unhandled errors |
| Add `loading.tsx` to key route groups | UX | Dashboard, class layout |
| Replace fixed FX rates with live API | Feature | Small fetch in `AnalyticsClient.tsx` |
| Add security headers in `next.config.ts` | Ops | CSP, HSTS, X-Frame-Options |
| Enable email verification in Supabase Auth | Auth | Toggle in dashboard + add confirm/redirect page |
| Add deployment checklist to README | Ops | Env vars, redirect URLs, bucket names |

---

## Medium

Meaningful production improvements. Most of the security and architecture work lives here.

> **Progress (updated this round):**
> - ✅ Generate TypeScript types from schema — `lib/database.types.ts` generated + wired into all Supabase clients.
> - ✅ Add route-protection middleware — `proxy.ts` (Next 16's renamed middleware) + `utils/supabase/middleware.ts`.
> - ✅ Shared auth helpers — `lib/auth.ts` (`requireAuth`, `requireClassMember`, `requireTutor`).
> - ✅ GitHub Actions CI — `.github/workflows/ci.yml` (build gate + informational lint).
> - ✅ Integrate Sentry — instrumentation files + `global-error.tsx`; DSN in env, source-map upload pending `SENTRY_AUTH_TOKEN` in Vercel.
> - ✅ Enable RLS on tables — done directly in Supabase (login verified working). Policy SQL not yet mirrored into `supabase/migrations/`.
> - ✅ Add Zod validation to forms — `lib/validation.ts`; wired into signup, class create, homework post, lesson schedule.
> - ✅ Add Vitest + unit tests — `lib/payments.ts` + `lib/homework.ts` extracted and tested (13 tests); `npm test` runs in CI.
> - ✅ Build employer analytics page — `app/employer/analytics/` (per-class hours/lessons/earnings, fully typed).
> - 🟡 Move mutations to Server Actions — done for the security-critical one (`submitHomework` enforces the deadline server-side in `app/classes/[id]/homework/actions.ts`). Remaining mutations are role-gated and now covered by RLS; migrate incrementally.
> - 🟡 Export Supabase schema to migrations — baseline reconstructed in `supabase/migrations/0001_initial_schema.sql`; a true `pg_dump` of RLS policies + functions still pending.
> - 🟡 Eliminate `any` types — typed clients + shared types (`Attachment`, `ClassRole`, `ClassSummary`) in place; lint errors 99 → 81. Remaining are mostly in the analytics/dashboard data-aggregation files.
> - 🟡 Private storage + signed URLs — CODE DONE: signed URLs via `lib/storage.ts`, wired into materials + homework + submissions pages (public-URL fallback so nothing breaks pre-flip). RLS mirrored to `supabase/migrations/0002_rls_policies.sql`; storage policies in `0003_storage_policies.sql`. Remaining = deploy → run 0003 → flip both buckets to private → verify.

| Task | Category | Notes |
|------|----------|-------|
| Export Supabase schema to `supabase/migrations/` | Foundation | Schema version control; prerequisite for everything else |
| Generate TypeScript types from schema | Foundation | `supabase gen types` → `lib/database.types.ts` |
| Add `middleware.ts` for route protection | Security | Centralize auth; protect `/dashboard`, `/classes`, `/employer`, etc. |
| Create shared auth helpers (`lib/auth.ts`) | Architecture | `requireAuth()`, `requireClassMember()`, `requireTutor()` |
| Enable RLS on a pilot table (`homework` or `messages`) | Security | Proof-of-concept before rolling out to all tables |
| Enable RLS on all remaining tables | Security | One migration per table group; test each role |
| Make storage buckets private | Security | Switch `materials` and `homework-attachments` from public |
| Replace `getPublicUrl()` with signed URLs | Security | Server-side `createSignedUrl()` for file access |
| Move homework mutations to Server Actions | Architecture | `createHomework`, `submitHomework`, `gradeSubmission` |
| Move schedule mutations to Server Actions | Architecture | `scheduleLesson`, `completeLesson`, `missLesson` |
| Move invite flow to Server Actions | Architecture | `sendInvite`, `acceptInvite`, `declineInvite` |
| Move materials upload to Server Actions | Architecture | Tutor-only write guard server-side |
| Move chat `postMessage` to Server Action | Architecture | Membership check before insert |
| Add Zod validation to forms | Quality | Signup, class create, homework post, lesson schedule |
| Extract shared components | Quality | `FileDropZone`, `DeadlineBadge`, modals out of `*Client.tsx` |
| Eliminate `any` types (use generated types) | Quality | ~90 usages across 16 files |
| Add GitHub Actions CI (lint + build) | CI/CD | `.github/workflows/ci.yml` |
| Add Vitest + unit tests for business logic | Testing | Deadline checks, cycle math, role helpers |
| Add Playwright E2E for happy path | Testing | Login → create class → post HW → submit |
| Integrate Sentry error tracking | Observability | Next.js SDK, source maps on Vercel |
| Build employer analytics page | Feature | Reuse `AnalyticsClient` patterns with employer scoping |
| Build user preferences page | Feature | Timezone, display name (needs email verification first) |
| Add explicit membership guard to chat page | Security | Don't rely solely on parent layout |
| Rate-limit user email search in invite/access | Security | Reduce enumeration risk |
| Set up staging Supabase project | Ops | Test migrations before prod |
| Write operational runbook | Ops | Restore DB, rotate keys, handle auth issues |

---

## Hard

Large, cross-cutting, or high-risk work. Don't start these until Easy and Medium security items are underway.

| Task | Category | Notes |
|------|----------|-------|
| Full RLS policy suite with integration tests | Security | All 12+ tables, all 4 roles, edge cases (soft-delete, parent scoping, employer scoping) |
| Payment cycle close as Postgres function | Data integrity | Atomic transaction: complete lesson → sum hours → close cycle → overflow lesson. Eliminates race conditions in `ScheduleClient.tsx` |
| Migrate all client mutations to Server Actions | Architecture | Every `*Client.tsx` that calls `.insert()`/`.update()`/`.delete()` directly |
| Private storage with per-class RLS on `storage.objects` | Security | Upload/read policies tied to `class_members` role |
| Georgian i18n (`next-intl` or similar) | Feature | String catalog for entire app; language toggle already exists in UI |
| Employer org hierarchy | Feature | Child org linking, scoped class access, delegated identity (V2) |
| Push notifications | Feature | New homework, upcoming lessons, feedback received (V2) |
| Lesson reminders | Feature | Scheduled notifications before lessons (V2) |
| Design system migration (inline styles → shadcn/Tailwind) | UI | Hundreds of `style={{}}` blocks across all pages |
| RLS + Server Action test matrix | Testing | Automated tests for every role × every mutation |
| Full E2E test suite | Testing | All major flows, all roles, error paths |
| Tutor-approved registration flow | Feature | `registration_requests` table, approval queue, magic-link onboarding (abandoned from original spec) |
| CI with Playwright against preview deploys | CI/CD | PR checks against Vercel preview + Supabase branch |
| Supabase local dev environment | DevEx | `supabase start` for offline development and migration testing |
| Comprehensive backup and disaster recovery | Ops | PITR verification, restore drill, key rotation procedure |

---

## Suggested Order Within Each Tier

### Easy — do first (1–2 days total)

1. Fix metadata, remove dead code
2. Invite page tutor guard
3. `paid_at` UI, `cancelled` lesson status, homework resubmit
4. Root `error.tsx`, document env vars
5. Reconcile docs

### Medium — core production work (weeks 2–8)

1. Schema export + generated types
2. Middleware + shared auth helpers
3. RLS pilot → RLS full rollout
4. Storage hardening (private buckets + signed URLs)
5. Server Actions for critical mutations (homework, schedule, invites)
6. CI pipeline (lint + build)
7. Sentry integration
8. Unit tests for business logic
9. E2E happy path

### Hard — after security foundation is solid (weeks 8–14)

1. Payment cycle Postgres function
2. Full client → Server Action migration
3. RLS integration test matrix
4. Employer analytics + preferences
5. Georgian i18n (if needed for launch)
6. Design system migration (ongoing, can be gradual)

---

## Summary Counts

| Difficulty | Count | Typical Time |
|------------|-------|--------------|
| Easy | 14 | 1–2 days |
| Medium | 25 | 6–8 weeks |
| Hard | 15 | 4–6 weeks |

**Minimum viable production** = all Easy + critical Medium (RLS, middleware, Server Actions for mutations, CI, Sentry).

**Full production grade** = all three tiers.

---

*See `PRODUCTION-ROADMAP.md` for the layered roadmap and architectural context.*
