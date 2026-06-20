# Project context for AI assistants

**Authoritative spec:** [`ReduMe.md`](./ReduMe.md) — class-centric model, live schema, feature status.

**Production plan:** [`PRODUCTION-ROADMAP.md`](./PRODUCTION-ROADMAP.md) and [`PRODUCTION-TASKS-BY-DIFFICULTY.md`](./PRODUCTION-TASKS-BY-DIFFICULTY.md).

**Agent rules:** [`AGENTS.md`](./AGENTS.md).

## Quick facts (do not contradict ReduMe.md)

- **Model:** Classes with `class_members` (not per-student spaces from older docs).
- **Signup:** Open registration; no tutor-approval queue in V1.
- **Auth:** Supabase email/password; email verification supported via `/auth/callback`.
- **Security:** RLS not yet enabled; mutations are mostly client-side until Medium-tier hardening.
- **Stack:** Next.js App Router, TypeScript, Tailwind, Supabase, Vercel.

Older parent-folder `CLAUDE.md` files may describe a superseded design — trust this repo’s `ReduMe.md` instead.
