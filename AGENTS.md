<!-- BEGIN:nextjs-agent-rules -->
# Agent rules

This is **not** the Next.js you know. APIs and conventions may differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Documentation

| Doc | Use for |
| --- | --- |
| [docs/PRODUCT.md](docs/PRODUCT.md) | **Authoritative product spec** — schema, roles, business rules |
| [docs/ENGINEERING.md](docs/ENGINEERING.md) | Architecture, dev setup, deployment, design system |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Production hardening backlog |

## Facts (do not contradict PRODUCT.md)

- **Model:** Classes with `class_members` — not per-student spaces.
- **Signup:** Open registration; no tutor-approval queue in V1.
- **Auth:** Supabase email/password; verification via `/auth/callback` and `/auth/confirm`.
- **Mutations:** Server actions with auth/role checks; storage uploads stay client-side.
- **Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Supabase, Vercel.

Ignore outdated docs outside this repo (e.g. parent-folder `CLAUDE.md`).
