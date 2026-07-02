# Testing

What must be tested in StudentSpace, how, and how the rules are enforced.
This is a **contract**, not a suggestion: CI fails when the suite fails *or*
when coverage of the pure domain modules drops below the thresholds.

---

## The rule for every change

> **If you implement or change behaviour, you add or update a test in the same
> change.** A feature PR without tests for its logic is incomplete.

What that means in practice:

| You changed… | You must… |
| --- | --- |
| Business math / domain rules (payments, deadlines, buckets, stats) | Extract the logic into a pure function (no I/O) and unit-test it |
| A pure module in `lib/` or `features/**/lib/` | Update its `*.test.ts` beside it; add the module to the coverage `include` list in `vitest.config.ts` if new |
| An error code in `lib/errors.ts` | Update `docs/ERRORS.md` — `lib/errors.test.ts` enforces the sync |
| A server action's auth/permission checks | No unit test required (needs a DB), but the guard pattern must match existing actions; verify via the smoke test |
| Pure UI (markup, styling, layout) | No test required — verify visually |

The dividing line is I/O. **Pure logic gets unit tests. I/O gets the build,
the smoke test, and (future) E2E.** If logic worth testing is buried inside a
component or action, that's the signal to extract it into a pure function —
this is how `lib/payments.ts` and `lib/homework.ts` came to exist.

---

## Running

| Command | What it does |
| --- | --- |
| `npm test` | Run the whole suite once |
| `npm run test:watch` | Watch mode while developing |
| `npm run test:coverage` | Suite + coverage report + **threshold enforcement** (what CI runs) |

Config: [`vitest.config.ts`](../vitest.config.ts) — Node environment, no DOM.
Tests live **next to the module they test**: `lib/time.ts` → `lib/time.test.ts`.

---

## Coverage contract

`vitest.config.ts` lists the pure domain modules under `coverage.include`.
These must stay covered at: **85% statements / 80% branches / 90% functions /
85% lines**. The list is the contract — when you add a pure module, add it to
the list along with its tests. Do not remove a module from the list to make
coverage pass.

Covered today:

| Module | Tests | Guards |
| --- | --- | --- |
| `lib/payments.ts` | `payments.test.ts` | Cycle overflow rollover (money math) |
| `lib/homework.ts` | `homework.test.ts` | Deadline rules |
| `lib/time.ts` | `time.test.ts` | App-timezone conversions (recurring bug source) |
| `lib/rate-limit.ts` | `rate-limit.test.ts` | Throttle windows and sweeping |
| `lib/errors.ts` | `errors.test.ts` | Catalog invariants + docs/ERRORS.md sync |
| `lib/validation.ts` | `validation.test.ts` | Form/action Zod schemas |
| `lib/dashboard-stats.ts` | `dashboard-stats.test.ts` | Stats + timezone-correct greeting/today |
| `lib/recent-classes.ts` (sorts) | `recent-classes.test.ts` | Dashboard preview ordering |
| `features/dashboard/lib/*` | 3 test files | Analytics bucketing and homework-slot counts |

Not unit-covered (by design): Supabase loaders (`lib/dashboard-data.ts`,
`lib/calendar-data.ts`), auth guards (`lib/auth.ts`), storage signing, server
actions, and client components — they are I/O or UI. They are exercised by
`npm run build` (type/render check) and the manual smoke test in
[ENGINEERING.md](ENGINEERING.md#smoke-test).

---

## Writing good tests here

- **Test behaviour, not implementation.** Assert what the function returns for
  meaningful inputs, not how it computes it.
- **Timezone tests use fixed UTC instants** and assert the Tbilisi-side result
  (see `lib/time.test.ts`). Never assert against the machine's local zone.
- **Time-dependent logic** uses `vi.useFakeTimers()` + `vi.setSystemTime(...)`
  — never `Date.now()` racing the clock.
- **Every test file gets the standard header block** (role, dependencies,
  used-by) like any other source file.
- **A test that catches a real bug is the goal.** When you find a bug, write
  the failing test first, then fix the code — the test stays as the regression
  guard. (Example: `zonedWallClockToUtcIso` silently shifted already-zoned ISO
  strings by 4 hours; `time.test.ts` now pins the pass-through behaviour.)
- **Doc-sync tests are encouraged** where a doc mirrors code —
  `lib/errors.test.ts` reads `docs/ERRORS.md` and fails on drift. Prefer this
  over hoping people remember.

---

## Backlog (not yet built)

| Item | Status |
| --- | --- |
| Playwright happy path (login → class → post homework → student submits) | Planned — ROADMAP 2.3. Needs browser install + test accounts; keep it out of the unit suite. |
| RLS role × table matrix (automated) | Planned — ROADMAP Phase 3. Until then: manual per-role spot checks. |
