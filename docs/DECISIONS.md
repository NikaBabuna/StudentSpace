# Design decisions & philosophy

Plain-English record of the decisions that shape this codebase — **what** we chose,
**why**, and **what that means when you write code**. Structure lives in
[ARCHITECTURE.md](ARCHITECTURE.md); day-to-day conventions in
[ENGINEERING.md](ENGINEERING.md); product rules in [PRODUCT.md](PRODUCT.md).

If you are an AI agent: read this before proposing structural changes. Most
"improvements" that contradict this file have already been considered and
rejected for a reason listed here.

---

## 1. The app is class-centric, not student-centric

**Decision:** The core unit is a `class` with `class_members` (each member has a
role: tutor / student / parent / employer). There are no per-student "spaces".

**Why:** The original spec imagined one space per student. Real usage showed the
tutor thinks in *classes* (a subject + one or more students + a schedule + a
payment agreement). Group classes, parent observers, and employer oversight all
fall out naturally from a membership table with roles.

**Consequence:** Never model access as "the student who owns this space". Always
ask: *what is this user's role in this class?* (`getClassMembership`).

## 2. Server-first: reads in Server Components, writes in server actions

**Decision:** Pages (`app/**/page.tsx`) fetch data on the server and pass
serializable props to client components. Every database write goes through a
`"use server"` action under `features/**` that re-checks auth and role.
Client components never write to the database directly.

**Why:** The browser holds only the anon key; anything the client can do,
anyone with the anon key can do from a console. Rules like "only tutors post
homework" or "no submissions after the deadline" are only real if the server
enforces them. Server-side reads also cut round-trips to Supabase (Frankfurt),
which was the user's top performance complaint.

**One deliberate exception:** file uploads go browser → Supabase Storage
directly (the file never transits our server), then the *row* insert goes
through a server action. Reads sign short-lived URLs server-side (`lib/storage.ts`).

**Second deliberate exception:** chat messages are *read* client-side, because
the Realtime subscription lives in the browser; posting still goes through a
server action.

## 3. Defense in depth: app-layer guards *and* RLS

**Decision:** Row-Level Security policies exist in `supabase/migrations/0002+`
and are enabled in production, but every page and action still checks auth and
membership itself.

**Why:** RLS is the safety net, not the interface. App-layer checks give users
readable errors ("Only tutors can send invites") instead of empty result sets,
and some rules can't be expressed in RLS at all (e.g. time-based deadline
logic lives in `lib/homework.ts` + the `submitHomework` action).

**Consequence:** Never remove an app-layer check because "RLS already covers
it", and never skip RLS because "the action already checks".

## 4. One timezone for all reasoning: Asia/Tbilisi

**Decision:** Timestamps are stored in UTC. All *server-side* formatting and
day-bucketing goes through `lib/time.ts` (`APP_TIME_ZONE = "Asia/Tbilisi"`).
Client components may use plain `toLocale*` because the browser's zone equals
the app zone for real users.

**Why:** Server Components and actions run in the host's zone — UTC on Vercel.
Bare `toLocaleDateString()` or `setHours(0,0,0,0)` on the server silently
renders times a few hours off and buckets "today" on the wrong calendar day.
This caused real bugs (homework due on the 3rd displayed as the 4th; dashboard
lessons hours off). Georgia is fixed UTC+4 with no DST, which keeps the
conversion exact.

**Consequence:** In any file that runs on the server, `new Date().getHours()`,
`toDateString()`, `setHours()`, and bare `toLocale*` are bugs. Use
`hourInZone`, `dayKeyInZone`, `isSameDayInZone`, `formatDateInZone`,
`formatTimeInZone`, and convert `datetime-local` input with
`zonedWallClockToUtcIso`.

## 5. Payment cycles use the overflow-rollover rule

**Decision:** A cycle is `cycle_hours` long (e.g. 8h). When a completed lesson
would push past the target, the cycle closes exactly at the target and the
overflow hours open the next cycle. The split is computed server-side in
`completeLesson` using pure math in `lib/payments.ts` (unit-tested).

**Why:** This matches how the tutor is actually paid. It runs inside one server
action because the earlier client-side, multi-request version was race-prone.

**Consequence:** `hours_completed` is never stored — always `SUM(duration_hours)`
over completed lessons linked to the cycle. Don't add a counter column.

## 6. Makeups are new lessons; nothing is rewritten

**Decision:** A missed lesson stays in history. A makeup is a *new* lesson with
`replaces_lesson_id` pointing at the missed one; chains are allowed.
Recurring lessons are materialised rows generated ahead by an idempotent RPC
(`generate_recurring_lessons`) — not virtual events computed at read time.

**Why:** History must stay truthful for payment disputes, and materialised rows
mean every consumer (calendar, schedule, analytics, cycles) reads plain
`lessons` rows with no special cases.

## 7. Soft delete for user-visible content; hard immutability for records

**Decision:** `deleted_at` on users, classes, lessons, homework, materials,
recurring schedules. Messages and submissions are never deleted or edited.

**Why:** Tutors delete and undo; records that back payments and grading must be
tamper-proof by construction.

**Consequence:** Every read of a soft-deletable table filters
`.is("deleted_at", null)`. Forgetting this filter is a recurring bug source.

## 8. Feature modules own their domain; `app/` stays thin

**Decision:** `app/` contains only routing files (`page/layout/loading/error`)
that authenticate, fetch, and compose. UI and mutations live in
`features/<domain>/` (components + actions + pure `lib/` helpers).
Cross-cutting infrastructure lives in `lib/`.

**Why:** Next.js routing files have framework-specific semantics; keeping them
thin means the domain logic is portable, testable, and findable by name.
Pure helpers extracted to `lib/` (`payments`, `homework`, `time`) are the only
place business math lives, so it can be unit-tested without a database.

**Consequence:** If a `page.tsx` is growing logic, extract it into the feature
module. If two features need the same helper, it moves to `lib/`.

## 9. No waterfalls: request-cached guards + `Promise.all`

**Decision:** Server loaders use the `React.cache()`-wrapped helpers in
`lib/auth.ts` (`getServerClient`, `getCurrentUser`, `getClassRow`,
`getClassMembership`) and batch independent queries with `Promise.all`.

**Why:** Supabase is in Frankfurt; each round-trip is real latency. The old
code fired 8–15 sequential queries per navigation; parallelising and deduping
cut server latency ~3–4×. Layouts and pages share one cached fetch per request.

**Consequence:** Never re-query the user or the class in a page when the layout
already loaded it — call the same cached helper. Only serialise queries when
one genuinely needs the other's result.

## 10. Design system: tokens only, dark by default

**Decision:** All colour/typography goes through CSS variables defined in
`app/globals.css`, consumed as Tailwind utilities (`bg-surface`, `text-ink`,
`border-line`, `bg-accent`…). Primitives live in `components/ui/`; app chrome
in `components/shell/`. Raw hex values in components are forbidden.

**Why:** One person maintains this app. A constrained palette and shared
primitives keep every new screen consistent without design review, and theming
(dark/light) stays a one-attribute flip (`data-theme` on `<html>`).

## 11. Scale honestly: built for ~10 users, structured for more

**Decision:** Prefer the simplest mechanism that is *correct at current scale*
and document its ceiling, instead of building for imaginary load. Examples:
in-memory rate limiting (per serverless instance, documented in
`lib/rate-limit.ts`), no pagination on class lists, analytics computed per
request, FX rates fetched live with a static fallback.

**Why:** The user explicitly pushes back on over-engineering ("sufficient,
proceed"). The escape hatches are noted next to each mechanism (e.g. swap the
rate-limit Map for Upstash Redis, same signature) so scaling up is a targeted
change, not a rewrite.

**Consequence:** Don't add caching layers, queues, or pagination without a
demonstrated need — but *do* leave a comment at every such ceiling.

## 12. Every file explains itself

**Decision:** Every application source file starts with a header block:
role, dependencies, used-by, inputs/outputs (format in
[ARCHITECTURE.md §11](ARCHITECTURE.md#11-file-header-convention)). Comments in
code state constraints the code can't show — not narration.

**Why:** This codebase is co-developed with AI agents and debugged manually by
a developer still learning the web stack. A file you can understand without
opening five neighbours makes both work.

## 13. Errors are catalogued; users never see internals

**Decision:** Every unexpected failure in a server action goes through
`actionFail(code, detail, context)` (`lib/log.ts`). The code comes from the
central catalog in `lib/errors.ts`; the user receives only the catalogued
friendly message, while the raw technical detail and context land in the
server logs (and Sentry for error-severity codes). The full code list lives in
[ERRORS.md](ERRORS.md), and a unit test fails CI if the catalog and the doc
drift apart. Deliberate rule feedback ("deadline has passed") is not an error
and stays inline, unlogged.

**Why:** Raw Supabase/Postgres messages leak schema details and are useless to
a student. Meanwhile a silent `{ error: message }` return leaves no trace for
whoever debugs it. One catalogued code gives both audiences what they need:
the user gets a calm sentence, the developer/agent greps one code and lands on
the exact failure site.

**Consequence:** Never return `error.message` from Supabase to the client.
New failure paths need a code in the catalog + a row in ERRORS.md (the sync
test enforces the second half).

## 14. Tests are part of the feature, and coverage is a contract

**Decision:** Business logic lives in pure functions with colocated unit
tests; `vitest.config.ts` lists the pure domain modules whose coverage is
CI-enforced. A feature change without its test is incomplete. The full
contract is [TESTING.md](TESTING.md); the quality bar is [QUALITY.md](QUALITY.md).

**Why:** This codebase is co-developed with AI agents at speed. Human review
alone doesn't catch regressions in money math, deadlines, or timezone
handling — the test suite is the institutional memory of what "correct" means.
The coverage include-list (rather than a global percentage) keeps the gate
meaningful: it can't be gamed by adding trivial UI files.

**Consequence:** When you extract or add a pure module, add it to the coverage
list with its tests. When you find a bug, the failing test comes first and
stays as the regression guard.

## 15. Things deliberately *not* built (V1)

| Not built | Reason |
| --- | --- |
| Message edit/delete | Records are immutable (see §7) |
| Payment processing | Employer pays outside the app |
| Video/lesson hosting | Zoom/Meet stay external |
| Multi-tenancy | Personal tool for one tutor |
| Georgian i18n layer | Planned; English-first until features stabilise |
| Mobile app | Responsive web only |
| Notifications/read-receipts | Messenger remains the urgent channel |

---

*Update this file when a decision changes — record the new decision **and** why
the old one was retired.*
