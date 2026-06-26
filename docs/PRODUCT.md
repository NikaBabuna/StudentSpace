# Product

StudentSpace is a structured workspace for private tutoring. Every class gets its own space: schedule, homework, materials, chat, and payment cycles. Students submit work; parents observe progress; employers get oversight — without replacing video calls or handling payments in-app.

**Model:** class-centric (`classes` + `class_members`). Not per-student silos.

**Status:** V1 — core features complete; production hardening in progress.

---

## Roles

| Role | Access |
| --- | --- |
| **Tutor** | Creates and manages classes. Posts homework, schedules lessons, uploads materials, gives feedback. |
| **Student** | Views class content, submits homework, participates in chat. |
| **Parent** | Observes classes their child is in; analytics for linked children in shared classes. |
| **Employer** | Read-only oversight of classes they belong to. Separate portal at `/employer`. |

Employer accounts (`users.is_employer = true`) are redirected to `/employer` on login. The invite flow forces the employer role for employer accounts.

---

## Database schema

### `users`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | Matches `auth.users` |
| `email` | text | |
| `full_name` | text | |
| `is_employer` | boolean | Employer account flag |
| `timezone` | text | Default `Asia/Tbilisi` |
| `bio` | text | Optional |

### `classes`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | |
| `created_by` | uuid | References `users` |
| `title` | text | |
| `subject` | text | Optional |
| `level` | text | Optional |
| `description` | text | Optional, visible to all members |
| `tutor_notes` | text | Optional, private to tutor |
| `cycle_hours` | int4 | Hours per payment cycle |

### `class_members`

| Column | Type | Notes |
| --- | --- | --- |
| `class_id` | uuid | |
| `user_id` | uuid | |
| `role` | enum | `tutor`, `student`, `parent`, `employer` |

### `invites`

| Column | Type | Notes |
| --- | --- | --- |
| `class_id` | uuid | |
| `invited_by` | uuid | |
| `invited_user_id` | uuid | |
| `role` | enum | Role being invited as |
| `status` | enum | `pending`, `accepted`, `declined` |

### `payment_cycles`

| Column | Type | Notes |
| --- | --- | --- |
| `class_id` | uuid | |
| `cycle_number` | int | Starts at 1 |
| `started_at` | timestamptz | |
| `closed_at` | timestamptz | Null if open |
| `paid_at` | timestamptz | Null if unpaid |
| `payment_amount` | numeric | Optional |
| `payment_currency` | text | `GEL`, `USD`, `EUR`, `RUB` |

**Cycle logic:** Completed lessons add hours to the active cycle. When hours reach `cycle_hours`, the cycle closes and a new one opens. Overflow hours carry into the new cycle as a separate completed lesson.

### `lessons`

| Column | Type | Notes |
| --- | --- | --- |
| `class_id` | uuid | |
| `payment_cycle_id` | uuid | |
| `recurring_schedule_id` | uuid | Optional; links to a recurring slot |
| `replaces_lesson_id` | uuid | Self-ref for makeups |
| `scheduled_at` | timestamptz | |
| `duration_hours` | numeric | |
| `status` | enum | `scheduled`, `completed`, `missed`, `cancelled` |
| `deleted_at` | timestamptz | Soft delete |

### `homework`

| Column | Type | Notes |
| --- | --- | --- |
| `class_id` | uuid | |
| `created_by` | uuid | |
| `title` | text | |
| `description` | text | Optional |
| `deadline` | timestamptz | |
| `attachments` | jsonb | `[{url, name, size_bytes, mime_type}]` |
| `deleted_at` | timestamptz | Soft delete |

### `submissions`

| Column | Type | Notes |
| --- | --- | --- |
| `homework_id` | uuid | |
| `student_id` | uuid | |
| `attachments` | jsonb | Same shape as homework |
| `grade` | text | Tutor feedback |
| `created_at` | timestamptz | |

### `material_groups` / `materials`

Groups contain files. Materials store `file_url`, `file_name`, `mime_type`, `is_pinned`, soft-delete via `deleted_at`.

### `recurring_schedules`

Weekly slot rules for a class (`weekday`, `time`, `duration_hours`, `timezone`, `active`). Real lessons are generated from these rules; see migration `0004_recurring_lessons.sql`.

### `messages`

Class chat. Realtime-enabled. Immutable in V1 (no edit/delete).

### `parent_students` / `parent_requests`

Parent–child linking: request → inbox accept/decline → `parent_students` row. Unique on `(parent_id, student_id)`.

---

## Storage

| Bucket | Usage |
| --- | --- |
| `materials` | Class material files |
| `homework-attachments` | Homework attachments and student submissions |

Policies: `supabase/migrations/0003_storage_policies.sql`. Signed URLs via `lib/storage.ts`. Confirm bucket privacy matches deployment — see [Engineering → Deployment](ENGINEERING.md#deployment).

---

## Auth

Supabase email/password. Trigger `handle_new_auth_user()` creates `public.users` on signup.

Open registration in V1 (no tutor-approval queue). Signup offers **personal** or **business** account types; business sets `is_employer` and lands on `/employer` after login. Email verification supported via `/auth/callback` and `/auth/confirm`.

---

## Business rules

### Payment cycles

- Cycle 1 is created with the class.
- Payment amount and currency are set at class creation and editable in class settings; updates apply to the **open** cycle only.
- Tutors mark a closed cycle as paid from the schedule page (`paid_at`).
- Cycle close runs server-side in `completeLesson` (no client race).

### Schedule

- Weekly calendar; colour-coded lesson status.
- Makeups link via `replaces_lesson_id`.
- Recurring weekly slots (`recurring_schedules` + migration `0004_recurring_lessons.sql`).
- Lesson times stored in the tutor's timezone.

### Homework

- Tutor posts, edits, deletes. Students submit before deadline.
- Multiple submissions allowed before deadline; latest wins.
- Deadline enforced server-side.

### Materials

- Upload creates a group. Accordion UI; tutor can rename, add, remove files.

### Parent linking

- Parent searches child by email → request → child accepts in inbox.
- Either party can remove the link.

### Analytics

- Tutor, student, and parent tabs with range filter (week / month / year / all).
- Earnings use fixed FX rates (live rates planned).

### Employer portal

- Separate layout. Tutor/student grid, person detail pages, inbox, analytics.

---

## Roadmap

| Item | Status |
| --- | --- |
| Email verification + profile changes | Planned |
| RLS fully verified on production DB | In progress — SQL in `0002_rls_policies.sql` |
| Private storage buckets | In progress — code ready; flip buckets after migration |
| Georgian translations | Planned — no i18n layer yet |
| Live currency rates | Planned |
| Employer org hierarchy | Planned |
| Push notifications / lesson reminders | Planned |
| Mobile app | Out of scope (responsive web only) |

Engineering backlog: [ROADMAP.md](ROADMAP.md).
