# Quality standard

The bar every change to StudentSpace must meet, and the checklist to verify it.
This document defines *what good looks like*; [ENGINEERING.md](ENGINEERING.md)
defines the mechanics, [DECISIONS.md](DECISIONS.md) the reasoning,
[TESTING.md](TESTING.md) the test contract.

---

## The four gates (all enforced by CI)

Every change must pass all four locally before it's done:

```bash
npm run lint            # 0 errors, 0 warnings — the standard is zero, not "few"
npx tsc --noEmit        # strict TypeScript, no `any`
npm run test:coverage   # suite green + coverage thresholds on pure modules
npm run build           # production build succeeds
```

There is no "warning budget". A change that introduces a lint warning is not
finished. `eslint-disable` needs a comment explaining why, and is a last
resort, not a workaround.

---

## Code standards

### TypeScript

- **No `any`** — explicit or implicit. When Supabase's inferred join types are
  too loose, narrow once with a named row type (see `MembershipRow` in
  `lib/dashboard-data.ts`), not per-use casts.
- Types that cross the server/client boundary live in `lib/types.ts` or the
  loader that produces them — components import types, they don't redeclare
  row shapes.

### Structure (the altitude rule)

- `app/**` — routing files only. A `page.tsx` authenticates, fetches, and
  composes. If it grows logic, extract to the feature module.
- `features/<domain>/` — the domain's UI (`components/`), mutations
  (`actions.ts`), and pure helpers (`lib/`).
- `lib/` — only code shared across features (auth, time, validation, storage,
  errors, logging, domain math). Don't put single-feature helpers here.
- **Extract pure logic from components.** If a function has no I/O and
  contains a rule someone could get wrong, it belongs in a `lib/` file with a
  test — not inline in JSX.
- **Duplication rule of three:** the second copy is a smell, the third is a
  refactor. Shared UI goes to `components/ui/` (e.g. `FileDropZone`).

### Server code

- Reads in Server Components via the **request-cached helpers** in
  `lib/auth.ts`; batch independent queries with `Promise.all`; never re-query
  what the layout already loaded ([DECISIONS.md §9](DECISIONS.md)).
- Writes only in server actions that re-check auth/role and return
  `{ error: string | null }` — never `redirect()` from an action.
- Failures follow the **error-code convention** ([ERRORS.md](ERRORS.md)):
  unexpected failures return `actionFail(code, detail, context)`; users never
  see raw infrastructure messages; deliberate rule feedback stays inline.
- Every read of a soft-deletable table filters `.is("deleted_at", null)`.
- All server-side date logic goes through `lib/time.ts`
  (ENGINEERING.md → Timezone rules).
- Actions that look up users by identifier call `checkRateLimit`.

### Client code

- No direct database writes — server actions only. Storage uploads are the
  one sanctioned client-side write ([DECISIONS.md §2](DECISIONS.md)).
- Browser-only state (localStorage, DOM attributes) is read through
  `useSyncExternalStore` stores (see `lib/theme.ts`, `lib/recent-classes.ts`)
  — not synced into React state inside effects.
- Dialogs that reset on open mount their form state fresh (wrapper + body
  pattern, see `ScheduleLessonDialog`) instead of reset-effects.
- Styling uses design tokens and `components/ui/` primitives — no raw hex, no
  new one-off variants of existing primitives.

### Every file

- Starts with the standard header block: role, dependencies, used-by,
  inputs/outputs ([ARCHITECTURE.md §11](ARCHITECTURE.md#11-file-header-convention)).
- Comments state constraints the code can't show ("closed BEFORE members are
  removed because RLS depends on membership") — never narration of the next
  line.

---

## Definition of done (checklist)

A change is done when:

- [ ] The four gates pass (lint 0/0, tsc, test:coverage, build)
- [ ] New/changed pure logic has tests; new pure modules are in the coverage
      `include` list ([TESTING.md](TESTING.md))
- [ ] New failure paths have error codes wired via `actionFail`, documented in
      [ERRORS.md](ERRORS.md) (the sync test forces this)
- [ ] Affected docs updated — ARCHITECTURE.md for new files/routes,
      PRODUCT.md for behaviour changes, DECISIONS.md if a decision changed
- [ ] [CHANGELOG.md](../CHANGELOG.md) has an entry saying what changed and why
- [ ] No secrets, keys, or personal data (emails, names) in code, logs, or
      test fixtures
- [ ] Behaviour verified — run the app for UI changes; don't rely on "it
      compiles"

---

## Philosophy: "sufficient, proceed"

Quality here means **correct, readable, and consistent** — not maximal.
The project explicitly rejects over-engineering ([DECISIONS.md §11](DECISIONS.md)):

- Build the simplest mechanism that is correct at current scale (1–10 users),
  and leave a comment at its ceiling with the upgrade path.
- Don't add abstractions for one caller, caching without a measured need, or
  configuration for things that never vary.
- When something is good enough, move forward. Polishing beyond the standard
  in this document is scope creep, not quality.

The inverse also holds: the standards above are the floor, and they are not
negotiable for speed. "It works" is not done — the gates define done.
