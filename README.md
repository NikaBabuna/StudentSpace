# StudentSpace

A structured platform for tutors, students, parents, and employers to manage classes, track progress, and handle payments.

**Live spec:** see [`ReduMe.md`](./ReduMe.md)  
**Production roadmap:** see [`PRODUCTION-ROADMAP.md`](./PRODUCTION-ROADMAP.md)

## Prerequisites

- Node.js 18+
- npm
- A [Supabase](https://supabase.com) project (Auth, PostgreSQL, Storage)

## Environment variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-anon-key
```

These are the **publishable** keys from Supabase → Project Settings → API. Never commit `.env.local`.

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment checklist

Use this before and after each production deploy.

### Vercel

- [ ] `NEXT_PUBLIC_SUPABASE_URL` set in Vercel → Settings → Environment Variables
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set for Production (and Preview if needed)
- [ ] Latest `main` branch deployed successfully (`npm run build` passes locally)

### Supabase Auth

- [ ] **Site URL** matches production domain (e.g. `https://your-app.vercel.app`)
- [ ] **Redirect URLs** include:
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/auth/confirm`
  - `https://your-production-domain/auth/callback`
  - `https://your-production-domain/auth/confirm`
- [ ] **Confirm email** enabled (Authentication → Providers → Email) if you require verified signups

### Supabase Storage

- [ ] Buckets exist: `materials`, `homework-attachments` (see `ReduMe.md`)

### Smoke test (production)

- [ ] Sign up → receive confirmation email → verify → log in
- [ ] Open dashboard → open a class → schedule, homework, chat load
- [ ] Tutor: post homework; student: submit before deadline
- [ ] Log out works from sidebar

## Tech stack

| Layer | Tool |
|-------|------|
| Framework | Next.js (App Router, TypeScript) |
| Styling | Tailwind CSS |
| Backend | Supabase (PostgreSQL, Auth, Storage, Realtime) |
| Hosting | Vercel |

## Learn more

- [Next.js documentation](https://nextjs.org/docs)
- [Supabase documentation](https://supabase.com/docs)
