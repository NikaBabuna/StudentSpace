<!-- BEGIN:nextjs-agent-rules -->
# Agent rules

This is **not** the Next.js you know. APIs and conventions may differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

**This file is the entry point for every AI agent working on StudentSpace.**
Read it first; it routes you to the right doc and states the rules of
engagement. If any doc outside this repo contradicts `docs/*.md`, trust the repo.

## Where to look

| Question | Doc |
| --- | --- |
| What does the product do? Schema, roles, business rules | [docs/PRODUCT.md](docs/PRODUCT.md) |
| Where is the code for X? Routes, features, data flow, file map | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| How do I set up / deploy / style / handle timezones? | [docs/ENGINEERING.md](docs/ENGINEERING.md) |
| **Why** is it built this way? (read before proposing structural changes) | [docs/DECISIONS.md](docs/DECISIONS.md) |
| What quality bar must my change meet? Definition of done | [docs/QUALITY.md](docs/QUALITY.md) |
| What must I test, and how? Coverage contract | [docs/TESTING.md](docs/TESTING.md) |
| What does error code SS-XX-NN mean? How do I log failures? | [docs/ERRORS.md](docs/ERRORS.md) |
| What's left before/after production? | [docs/ROADMAP.md](docs/ROADMAP.md) |
| What changed recently, and why? | [CHANGELOG.md](CHANGELOG.md) |

## Rules of engagement

1. **Read before you write.** Check ARCHITECTURE.md for where code belongs and
   DECISIONS.md for why — most "improvements" that contradict it were already
   rejected for a reason.
2. **Every feature ships with its test.** Pure logic → pure function → unit
   test beside it → coverage `include` list. No test, not done. ([TESTING.md](docs/TESTING.md))
3. **Every failure path gets an error code.** Unexpected failures in server
   actions go through `actionFail(code, detail, context)` from `lib/log.ts`;
   users see only the catalogued friendly message. New codes go in
   `lib/errors.ts` **and** docs/ERRORS.md — a test enforces the sync.
4. **Verify before you claim done.** `npm run lint` (0/0) · `npx tsc --noEmit`
   · `npm run test:coverage` · `npm run build`. All four. ([QUALITY.md](docs/QUALITY.md))
5. **Update the docs you invalidate** (ARCHITECTURE for files/routes, PRODUCT
   for behaviour, ERRORS for codes) and **add a CHANGELOG entry** for any
   non-trivial change.
6. **Ask before:** schema migrations, deleting user data, changing business
   rules (payment/deadline/roles), or anything irreversible. Don't ask before
   routine code changes that follow the conventions.

## Conventions (do not contradict ENGINEERING.md)

- **Route group:** Dashboard-mode pages live under `app/(shell)/` (`/dashboard`, `/calendar`, `/inbox`, `/settings`, `/classes/new`). The `(shell)` segment is not part of the URL.
- **Schedule vs calendar:** `/classes/[id]/schedule` = one class (`ScheduleClient`). `/calendar` = all classes (`CalendarClient` + `lib/calendar-data.ts`).
- **Page auth:** Server pages and layouts use `lib/auth.ts` (`requireAuth`, `requireClassMember`, `requireTutor`) — they **redirect** on failure. Use the request-cached loaders; never re-query what the layout loaded.
- **Action auth:** Server actions use local helpers that return `{ error: string | null }` — **never** call `redirect()` from an action. Copy the pattern in existing `features/**/actions.ts` files.
- **Action files:** One domain → `actions.ts`. Multiple surfaces → `actions/*.ts` (classes) or a second file (e.g. `submissions-actions.ts`).
- **Errors:** `actionFail("SS-…", rawDetail, { ids })` for unexpected failures; inline friendly strings for deliberate rule feedback; **never** return `error.message` from Supabase to the client.
- **Timezones:** server-side date formatting/bucketing goes through `lib/time.ts` — bare `toLocale*`/`getHours()`/`setHours()` in server code is a bug (ENGINEERING.md → Timezone rules).
- **Soft deletes:** reads of soft-deletable tables must filter `.is("deleted_at", null)`.
- **File headers:** every source file starts with the standard header block (ARCHITECTURE.md §11).

## Facts (do not contradict PRODUCT.md)

- **Model:** Classes with `class_members` — not per-student spaces.
- **Signup:** Open registration; no tutor-approval queue in V1.
- **Auth:** Supabase email/password; verification via `/auth/callback` and `/auth/confirm`.
- **Mutations:** Server actions with auth/role checks; storage uploads stay client-side.
- **Security:** RLS is enabled in production and storage buckets are private (signed URLs via `lib/storage.ts`); app-layer guards remain the first line ([DECISIONS.md §3](docs/DECISIONS.md)).
- **Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Supabase, Vercel, Sentry.

The parent-folder `CLAUDE.md` (user context + working style) defers to this repo's docs for all technical facts.
