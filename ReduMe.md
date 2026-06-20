# StudentSpace

A structured platform for tutors, students, parents, and employers to manage classes, track progress, and handle payments.

> **This file is the authoritative project spec.** Older context files (e.g. parent-folder `CLAUDE.md`) may describe a superseded per-student model — ignore them in favour of this document.

---

## Tech Stack

- **Framework:** Next.js (App Router, TypeScript)
- **Styling:** Tailwind CSS + inline CSS variables
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Deployment:** Vercel
- **Repo:** github.com/NikaBabuna/StudentSpace

---

## Design System

Warm dark theme. All tokens defined in `app/globals.css`.

| Token | Value | Usage |
|---|---|---|
| `--color-ss-bg` | `#1c1a17` | Page background |
| `--color-ss-bg-secondary` | — | Card backgrounds |
| `--color-ss-amber` | `#c8a050` | Primary accent |
| `--color-ss-amber-light` | — | Buttons, active states |
| `--color-ss-amber-dim` | — | Button backgrounds |
| `--color-ss-amber-border` | — | Button borders |
| `--color-ss-border` | — | General borders |
| `--color-ss-sidebar` | — | Sidebar background |
| `--color-ss-text-primary` | — | Headings |
| `--color-ss-text-secondary` | — | Body text |
| `--color-ss-text-faint` | — | Labels |
| `--color-ss-text-muted` | — | Placeholder text |
| `--color-ss-text-ghost` | — | Dimmed text |
| `--color-ss-red` | — | Errors, destructive actions |
| `--color-ss-green` | — | Success states |
| `--color-ss-purple` | — | Invite badges |
| `--color-ss-orange` | — | Class avatars |

---

## Database Schema

### `users`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Matches `auth.users` |
| `email` | text | |
| `full_name` | text | |
| `is_employer` | boolean | Employer account flag |
| `timezone` | text | Set on signup |

### `classes`
| Column | Type | Notes |
|---|---|---|
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
|---|---|---|
| `class_id` | uuid | |
| `user_id` | uuid | |
| `role` | enum | `tutor`, `student`, `parent`, `employer` |

### `invites`
| Column | Type | Notes |
|---|---|---|
| `class_id` | uuid | |
| `invited_by` | uuid | |
| `invited_user_id` | uuid | |
| `role` | enum | Role being invited as |
| `status` | enum | `pending`, `accepted`, `declined` |

### `payment_cycles`
| Column | Type | Notes |
|---|---|---|
| `class_id` | uuid | |
| `cycle_number` | int | Starts at 1 |
| `started_at` | timestamptz | |
| `closed_at` | timestamptz | Null if open |
| `paid_at` | timestamptz | Null if unpaid |
| `payment_amount` | numeric | Optional, amount per cycle |
| `payment_currency` | text | `GEL`, `USD`, `EUR`, `RUB` |

**Cycle logic:** When a lesson is marked complete, hours accumulate in the active cycle. When the cycle target is hit, it automatically closes and a new one opens. Overflow hours carry into the new cycle as a completed lesson entry.

### `lessons`
| Column | Type | Notes |
|---|---|---|
| `class_id` | uuid | |
| `payment_cycle_id` | uuid | |
| `replaces_lesson_id` | uuid | Self-ref, used for makeups |
| `scheduled_at` | timestamptz | |
| `duration_hours` | numeric | |
| `status` | enum | `scheduled`, `completed`, `missed`, `cancelled` |
| `deleted_at` | timestamptz | Soft delete |

### `homework`
| Column | Type | Notes |
|---|---|---|
| `class_id` | uuid | |
| `created_by` | uuid | |
| `title` | text | |
| `description` | text | Optional |
| `deadline` | timestamptz | |
| `attachments` | jsonb | Array of `{url, name, size_bytes, mime_type}` |
| `deleted_at` | timestamptz | Soft delete |

### `submissions`
| Column | Type | Notes |
|---|---|---|
| `homework_id` | uuid | |
| `student_id` | uuid | |
| `attachments` | jsonb | Array of `{url, name, size_bytes, mime_type}` |
| `grade` | text | Tutor feedback text |
| `created_at` | timestamptz | |

### `material_groups`
| Column | Type | Notes |
|---|---|---|
| `class_id` | uuid | |
| `created_by` | uuid | |
| `name` | text | |
| `deleted_at` | timestamptz | Soft delete |

### `materials`
| Column | Type | Notes |
|---|---|---|
| `group_id` | uuid | |
| `class_id` | uuid | |
| `uploaded_by` | uuid | |
| `title` | text | Cleaned filename |
| `file_url` | text | Public Supabase Storage URL |
| `file_name` | text | Original filename |
| `file_size_bytes` | int8 | |
| `mime_type` | text | |
| `is_pinned` | boolean | |
| `deleted_at` | timestamptz | Soft delete |

### `messages`
| Column | Type | Notes |
|---|---|---|
| `class_id` | uuid | |
| `author_id` | uuid | |
| `body` | text | |
| `created_at` | timestamptz | |

Realtime enabled on this table for live chat.

### `parent_students`
| Column | Type | Notes |
|---|---|---|
| `parent_id` | uuid | References `users` |
| `student_id` | uuid | References `users` |
| `created_at` | timestamptz | |

Unique constraint on `(parent_id, student_id)`.

### `parent_requests`
| Column | Type | Notes |
|---|---|---|
| `parent_id` | uuid | |
| `student_id` | uuid | |
| `status` | enum | `pending`, `accepted`, `declined` |
| `created_at` | timestamptz | |

Unique constraint on `(parent_id, student_id)`.

---

## Storage Buckets

| Bucket | Access | Usage |
|---|---|---|
| `materials` | Public | Class material files |
| `homework-attachments` | Public | Homework attachments + student submissions |

Both buckets have permissive policies (RLS not yet enabled).

---

## Auth

Supabase Auth with email/password. A trigger `handle_new_auth_user()` automatically creates a `public.users` row on signup from `raw_user_meta_data`.

**Note:** Email verification is not yet implemented. Users cannot change their email or name without it. This is a V2 item.

---

## File Structure
app/
page.tsx                          Landing page
login/page.tsx                    Login
signup/page.tsx                   Signup
dashboard/
page.tsx                        Dashboard server component
DashboardClient.tsx             Class cards, edit modal, language toggle
analytics/
page.tsx                      Analytics server component
AnalyticsClient.tsx           Tutor/student/parent tabs, charts, earnings
inbox/
page.tsx                        Server: fetches invites + parent requests
InboxClient.tsx                 Accept/decline invites and parent requests
classes/
new/page.tsx                    Create class form
[id]/
layout.tsx                    Session shell: class data, cycle hours, members
MembersButton.tsx             Members modal with remove functionality
overview/page.tsx             Overview (tutor: stats + analytics; student: progress)
homework/
page.tsx                    Server: fetches homework + submissions
HomeworkClient.tsx          Cards, edit modal, file drop zones, submit flow
[hwId]/
page.tsx                  Submissions page (tutor only)
SubmissionsClient.tsx     Per-submission feedback/grading
schedule/
page.tsx                    Server: fetches lessons + cycles
ScheduleClient.tsx          Weekly calendar, side panel, makeup tracking
materials/
page.tsx                    Server: fetches groups + materials
MaterialsClient.tsx         Accordion groups, file cards, edit modal
chat/page.tsx                 Realtime chat via Supabase Realtime
employer/
page.tsx                        Employer dashboard server component
EmployerLayout.tsx              Sidebar layout for employer accounts
EmployerClient.tsx              Tutor/student grid with search
PersonDetailClient.tsx          Shared class list for a person
tutors/[userId]/page.tsx        Tutor detail page
students/[userId]/page.tsx      Student detail page
inbox/page.tsx                  Employer inbox
analytics/page.tsx              Placeholder
settings/page.tsx               Placeholder
settings/
access/
page.tsx                      Parent-child linking server component
AccessClient.tsx              Link child, view parents, remove links
preferences/page.tsx            Placeholder
components/layout/
AppLayout.tsx                     Sidebar + main content wrapper
Sidebar.tsx                       Dashboard/session nav, class settings modal
SessionTabs.tsx                   Tab bar: Overview, Homework, Schedule, Materials, Chat

---

## User Roles

| Role | Description |
|---|---|
| `tutor` | Creates and manages classes. Posts homework, schedules lessons, uploads materials, gives feedback. |
| `student` | Attends classes. Submits homework, views materials, participates in chat. |
| `parent` | Observes classes their child is in. Can view progress via analytics Parent tab. |
| `employer` | Organisation account. Read-only oversight of classes they're added to. Has separate dashboard. |

**Employer accounts** are flagged via `is_employer = true` on the `users` table. They are redirected to `/employer` on login instead of `/dashboard`. They cannot be invited to classes as student/parent/tutor — the invite flow detects `is_employer` and forces the employer role.

---

## Key Behaviours

### Payment Cycles
- Cycle 1 is auto-created when a class is created.
- Each completed lesson adds its hours to the active cycle.
- When accumulated hours hit `cycle_hours`, the cycle closes and cycle 2 opens.
- Overflow hours carry into the new cycle as a separate completed lesson.
- Each cycle can have a `payment_amount` and `payment_currency` set by the tutor.

### Schedule
- Weekly calendar view with colour-coded lesson pills.
- `amber` = upcoming, `green` = completed, `red` = missed, `purple` = makeup.
- Dashed border = makeup lesson. Purple dot = missed, needs makeup.
- Click a pill → side panel with details and actions.
- All datetimes use `new Date(val).toISOString()` to handle Tbilisi timezone (UTC+4).

### Homework
- Cards collapse/expand on click.
- Tutor can post, edit, and delete assignments.
- File attachments use a drag-and-drop zone with removable pill list.
- Student submits files; tutor gives text feedback via the submissions page.
- Deadline passed = submissions locked for students.
- Sorting: unsubmitted urgent first.

### Materials
- `+ Upload` always creates a new group.
- Groups are full-width accordions with `Edit` button (tutor only).
- Files inside render as a 3-column card grid.
- Edit modal: add files, rename group, delete group, remove individual files.

### Class Settings
- ⚙ gear icon next to class name in sidebar.
- Creator sees: editable title, subject, level, description, tutor notes, cycle hours + leave/delete.
- Non-creator sees: leave only.
- Uses `createPortal` to escape sidebar stacking context.

### Analytics
- **Tutor tab:** total hours, missed rate, pending feedback, homework completion bars, attendance bars, missed % bars, cycle hours bars, earnings table with currency conversion.
- **Student tab:** attendance, hours, homework done, feedback received, breakdown bars per class.
- **Parent tab:** same as student but calculated for each linked child, only in shared classes.
- Range filter (week/month/year/all time) applies to lessons and homework by date.
- Earnings table converts all native currencies to the selected display currency using approximate fixed rates (live rates planned for V2).

### Parent-Child Linking
- Parent searches for child by email in Settings → Access & accounts.
- Request sent → child sees it in Inbox → accepts or declines.
- Accepted link creates a `parent_students` row.
- Either party can remove the link (parent from Access & accounts, child from their parents list).
- Parent analytics tab shows child stats only for classes both are members of.

### Employer Dashboard
- Separate layout with its own sidebar (`EmployerLayout`).
- Overview shows grid of tutor/student profile cards with name + email.
- Click a card → sub-page listing all shared classes with that person.
- Separate inbox at `/employer/inbox`.
- Analytics and settings are placeholders for V2.

---

## V2 Roadmap

- **Email verification** — currently not implemented. Users cannot change email/name without it.
- **RLS policies** — Supabase Row Level Security not yet enabled. All tables are currently unrestricted.
- **Georgian language translations** — language toggle exists in dashboard UI but translation strings not implemented.
- **Live currency exchange rates** — earnings calculator uses fixed approximate rates.
- **Employer analytics** — placeholder page, no data yet.
- **Employer settings + org hierarchy** — child org linking, scoped class access, delegated identity.
- **Employer overview page** — `app/employer/page.tsx` is functional but analytics are not.
- **Password/email/name change** — requires email verification system first.
- **Push notifications** — for new homework, upcoming lessons, feedback received.
- **Lesson reminders** — scheduled notifications before lessons.
- **Mobile app** — current implementation is web-only.