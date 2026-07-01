<!-- BEGIN:nextjs-agent-rules -->
# Agent rules

This is **not** the Next.js you know. APIs and conventions may differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Documentation

| Doc | Use for |
| --- | --- |
| [docs/PRODUCT.md](docs/PRODUCT.md) | **Authoritative product spec** — schema, roles, business rules |
| [docs/ENGINEERING.md](docs/ENGINEERING.md) | Conventions, dev setup, deployment, design system |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | **File-by-file map** — routes, features, data flow |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Production hardening backlog |

## Conventions (do not contradict ENGINEERING.md)

- **Route group:** Dashboard-mode pages live under `app/(shell)/` (`/dashboard`, `/calendar`, `/inbox`, `/settings`, `/classes/new`). The `(shell)` segment is not part of the URL.
- **Schedule vs calendar:** `/classes/[id]/schedule` = one class (`ScheduleClient`). `/calendar` = all classes (`CalendarClient` + `lib/calendar-data.ts`).
- **Page auth:** Server pages and layouts use `lib/auth.ts` (`requireAuth`, `requireClassMember`, `requireTutor`) — they **redirect** on failure.
- **Action auth:** Server actions use local helpers that return `{ error: string | null }` — **never** call `redirect()` from an action. Copy the pattern in existing `features/**/actions.ts` files.
- **Action files:** One domain → `actions.ts`. Multiple surfaces → `actions/*.ts` (classes) or a second file (e.g. `submissions-actions.ts`).

## Facts (do not contradict PRODUCT.md)

- **Model:** Classes with `class_members` — not per-student spaces.
- **Signup:** Open registration; no tutor-approval queue in V1.
- **Auth:** Supabase email/password; verification via `/auth/callback` and `/auth/confirm`.
- **Mutations:** Server actions with auth/role checks; storage uploads stay client-side.
- **Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Supabase, Vercel.

Ignore outdated docs outside this repo (e.g. parent-folder `CLAUDE.md`).
