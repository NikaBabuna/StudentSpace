# Engineering

Technical reference for developing and operating StudentSpace.

**Architecture (full file-by-file map):** [ARCHITECTURE.md](ARCHITECTURE.md)

---

## Architecture

StudentSpace is a **class-centric** Next.js app backed by Supabase. Product rules live in [PRODUCT.md](PRODUCT.md).

### Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4 + tokens in `app/globals.css` |
| Backend | Supabase — PostgreSQL, Auth, Storage, Realtime |
| Hosting | Vercel |
| Observability | Sentry (optional, `NEXT_PUBLIC_SENTRY_DSN`) |

### Request flow

```
Browser
  → proxy.ts (session refresh + route protection)
  → app/ routes (Server Components — data loaders)
  → features/*/actions.ts (mutations)
  → lib/supabase → PostgreSQL / Storage
Client Components → server actions + storage uploads
```

1. **`proxy.ts`** — Next.js 16 middleware. Refreshes the Supabase cookie and gates protected routes (`lib/supabase/middleware.ts`).
2. **`app/`** — routes only: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`. Fetches data, renders feature components.
3. **`features/`** — domain modules: UI (`components/`), server actions (`actions.ts`), domain helpers (`lib/`).
4. **`lib/`** — cross-cutting infra: Supabase clients, auth guards, validation, shared domain math.
5. **`components/`** — design system (`ui/`) and app chrome (`shell/`).

### Routes

| Area | Paths |
| --- | --- |
| Public | `/`, `/login`, `/signup` |
| Auth | `/auth/callback`, `/auth/confirm` |
| Dashboard | `/dashboard`, `/dashboard/analytics`, `/dashboard/classes` |
| Inbox | `/inbox` |
| Settings | `/settings/access`, `/settings/preferences` |
| Classes | `/classes/new`, `/classes/[id]/overview`, `/classes/[id]/schedule`, `/classes/[id]/homework`, `/classes/[id]/homework/[hwId]`, `/classes/[id]/materials`, `/classes/[id]/chat`, `/classes/[id]/invite` |
| Employer | `/employer`, `/employer/analytics`, `/employer/inbox`, `/employer/settings` (all gated as "coming soon" placeholders) |

### Repository layout

```
app/                          Routes only — thin server pages
features/
  classes/                    Create class, members, invites
  schedule/                   Lessons, recurring slots, payment cycles
  homework/                   Assignments and submissions
  materials/                  File groups
  chat/                       Realtime messaging
  dashboard/                  Home, class list, analytics
  inbox/                      Invites and parent-link requests
  settings/                   Parent-child linking
  employer/                   Employer portal UI
components/
  ui/                         Design-system primitives (shadcn)
  shell/                      Sidebar, topbar, app shell
lib/
  supabase/                   Browser, server, middleware clients
  auth.ts                     Cached auth + membership guards
  payments.ts, homework.ts    Shared domain logic
  validation.ts               Zod schemas
  database.types.ts           Generated Supabase types
proxy.ts                      Session + route gate
supabase/migrations/          Versioned SQL
```

### Feature module convention

Each folder under `features/` follows the same shape:

```
features/<domain>/
  actions.ts              Server actions ("use server")
  components/             Client UI (*Client.tsx, dialogs, etc.)
  lib/                    Domain-only helpers (optional)
```

Classes with multiple action surfaces use an `actions/` subfolder (e.g. `features/classes/actions/create-class.ts`). Homework grading lives in `features/homework/submissions-actions.ts`.

### Auth & roles

- Users mirror from Supabase Auth into `public.users` via trigger.
- Class membership: `class_members.role` = `tutor` | `student` | `parent` | `employer`.
- Guards in `lib/auth.ts`: `requireAuth()`, `requireClassMember()`, `requireTutor()`, plus cached loaders (`getServerClient`, `getCurrentUser`, `getClassRow`, `getClassMembership`).
- Employer accounts redirect to `/employer` (layout enforces `is_employer`).

### Conventions

- **Routes stay thin.** Data fetching in `app/**/page.tsx`; UI in `features/`.
- **Mutations** live in `features/**/actions.ts` — never write to Supabase from client components.
- **Server loaders:** use cached `lib/auth.ts` helpers; batch reads with `Promise.all`.
- **Styling:** design tokens + `components/ui/*` — no raw hex.
- **Validation:** Zod in `lib/validation.ts`.

---

## Local development

### Setup

```bash
git clone https://github.com/NikaBabuna/StudentSpace.git
cd studentspace
npm install
cp .env.example .env.local
npm run dev
```

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Publishable anon key |
| `NEXT_PUBLIC_SENTRY_DSN` | No | Error tracking |

### Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server at localhost:3000 |
| `npm run build` | Production build |
| `npm test` | Vitest (`lib/payments`, `lib/homework`) |
| `npm run lint` | ESLint |

### Migrations

Apply `supabase/migrations/*.sql` in order. Regenerate types after schema changes:

```bash
npx supabase gen types typescript --project-id YOUR_REF > lib/database.types.ts
```

### Auth redirects (local)

Add to Supabase → Authentication → URL configuration:

- `http://localhost:3000/auth/callback`
- `http://localhost:3000/auth/confirm`

### CI

GitHub Actions: lint (informational), test, build on `main` and PRs.

---

## Deployment

Hosted on **Vercel** + **Supabase** (EU Central).

### Pre-deploy checklist

1. `npm run build` passes locally
2. Env vars set on Vercel
3. Pending SQL migrations applied
4. Supabase auth redirect URLs include production domain
5. Smoke test (below)

### Supabase auth URLs

**Site URL:** production domain · **Redirect URLs:** `/auth/callback` and `/auth/confirm` for each environment.

### Storage hardening

1. Apply `0002_rls_policies.sql` and `0003_storage_policies.sql`
2. Set `materials` and `homework-attachments` buckets to private
3. Verify signed URLs (`lib/storage.ts`)

### Smoke test

- [ ] Sign up → verify → log in
- [ ] Dashboard → class → schedule, homework, materials, chat
- [ ] Tutor posts homework; student submits
- [ ] Employer lands on `/employer`
- [ ] Log out works

---

## Design system

Warm editorial UI — serif headings, mono labels, indigo accent. Dark default; light toggle.

**Source:** `app/globals.css` · `components/ui/` · `components/shell/`

### Tokens

Use Tailwind utilities — never raw hex.

| Token | Utility | Use |
| --- | --- | --- |
| `--bg` | `bg-bg` | Page background |
| `--surface` | `bg-surface` | Cards, panels |
| `--ink` | `text-ink` | Primary text |
| `--muted` | `text-muted` | Labels, metadata |
| `--line` | `border-line` | Borders |
| `--accent` | `bg-accent` | Brand accent |
| `--ok` / `--warn` / `--danger` | status colours | |

### Typography

Geist (`font-sans`) for UI · Newsreader (`font-serif`) for headings · Geist Mono (`font-mono`) for labels.

### Rules

- ✅ Compose `Card` + `Button` + `Field` with token utilities
- ❌ Inline hex styles or new `--color-ss-*` references

Employer portal (`features/employer/`) still uses legacy inline styles — see [ROADMAP.md](ROADMAP.md).
