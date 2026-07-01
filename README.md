# StudentSpace

**The operations layer for private tutoring.**

StudentSpace gives every class a shared workspace — schedule, homework, materials, chat, and payment cycles in one place. Built for tutors, students, parents, and employers.

---

## Features

| | |
| --- | --- |
| **Classes** | Shared workspace per subject or group |
| **Schedule** | Per-class weekly view, makeups, recurring lessons, payment cycles |
| **Calendar** | Cross-class calendar of all your lessons |
| **Homework** | Assignments, file submissions, tutor feedback |
| **Materials** | Organised file library with drag-and-drop upload |
| **Chat** | Live class messaging |
| **Analytics** | Attendance, homework completion, earnings by role |
| **Employer portal** | Read-only oversight for organisation accounts |

---

## Quick start

**Requirements:** Node.js 20+, npm, a [Supabase](https://supabase.com) project

```bash
npm install
cp .env.example .env.local   # add your Supabase URL and anon key
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build    # production build
npm test         # unit tests
npm run lint     # ESLint
```

---

## Documentation

| Guide | Contents |
| --- | --- |
| [**Product**](docs/PRODUCT.md) | Schema, roles, business rules, feature roadmap |
| [**Engineering**](docs/ENGINEERING.md) | Conventions, local dev, deployment, design system |
| [**Architecture**](docs/ARCHITECTURE.md) | File-by-file map, routes, data flow |
| [**Roadmap**](docs/ROADMAP.md) | Production hardening backlog and status |

[Changelog](CHANGELOG.md)

---

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · Supabase · Vercel

---

## Repository

```
app/                  Routes (thin server pages; dashboard routes in app/(shell)/)
features/             Domain modules (components, actions, lib)
components/ui/        Design-system primitives
components/shell/     App chrome
lib/                  Auth, Supabase clients, shared logic
supabase/migrations/  Versioned SQL
docs/                 Product, engineering, architecture, roadmap
```

---

*Private project · Built in Tbilisi, Georgia*
