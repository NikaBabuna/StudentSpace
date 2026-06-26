# Changelog

## Features module refactor

### Summary

Moved domain UI and server actions out of `app/` into `features/`, leaving routes as thin server pages (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`). Supabase clients consolidated under `lib/supabase/` (removed `utils/supabase/`).

### Server actions (current locations)

| File | Actions |
|------|---------|
| `features/classes/actions/create-class.ts` | `createClassPipeline`, `lookupInviteEmail` |
| `features/classes/actions/members.ts` | `removeMember` (tutor-only) |
| `features/classes/actions/invite.ts` | `sendInvite` (tutor-only; target + role re-derived server-side) |
| `features/schedule/actions.ts` | `completeLesson`, `missLesson`, `cancelLesson`, `deleteLesson`, `scheduleLesson`, `markCyclePaid`, recurring-slot helpers |
| `features/homework/actions.ts` | `createHomework`, `updateHomework`, `deleteHomework`, `submitHomework` |
| `features/homework/submissions-actions.ts` | `gradeSubmission` (tutor-only) |
| `features/materials/actions.ts` | `createMaterialGroup`, `insertMaterials`, `renameMaterialGroup`, `deleteMaterial`, `deleteMaterialGroup`, `toggleMaterialPin` |
| `features/chat/actions.ts` | `postMessage` (membership checked) |
| `features/inbox/actions.ts` | `respondInvite`, `respondParentRequest` |
| `features/dashboard/actions.ts` | `updateClass`, `deleteClass` (creator-only) |
| `features/settings/actions.ts` | `sendParentRequest`, `removeChild`, `removeParent` |

### Removed legacy duplicates

Pre-refactor copies under `app/**` (`*Client.tsx`, colocated `actions.ts`, `utils/supabase/`, unused `class-tabs.tsx` / `toast.tsx`, design decode artifacts).

---

## Server actions migration + error/loading UI (branch `feat/server-actions-mutations`)

### Summary

Moved **every** client-side database mutation into `"use server"` server actions
with authentication and role checks. Previously each `*Client.tsx` component wrote
to Supabase directly from the browser, so the UI was the only thing enforcing the
rules — anyone with the anon key could bypass them from the console. Now the rules
(tutor-only writes, invite/parent-request ownership, homework deadlines, class
membership) are enforced on the server where they can't be tampered with.

File **uploads to Supabase Storage stay client-side**; only the database row writes
moved to actions (matching the existing `submitHomework` pattern).

### Key behaviour improvements

- **Payment-cycle close moved server-side** (`completeLesson`). The multi-step
  close/open/overflow sequence previously ran as separate browser calls in
  `ScheduleClient.tsx` and was race-prone; it now runs inside one server action.
- **Invite and parent-request responses** now verify the row belongs to the
  current user and read the role / parent id from the database row instead of
  trusting client-supplied values (prevents role escalation).
- **`sendInvite`** re-looks-up the target by email server-side and forces the
  employer role for employer accounts.

### Components rewired (no more direct DB writes)

`ScheduleClient`, `HomeworkClient`, `SubmissionsClient`, `MaterialsClient`,
`InboxClient`, `DashboardHomeClient`, `AccessClient`, `InviteClient`, `MembersButton`,
`ChatPage`, `NewClassForm` — now under `features/*/components/`.

### Error & loading UI

- Added `error.tsx` for `app/dashboard`, `app/classes/[id]`, `app/employer`
  (report to Sentry + friendly retry).
- Added `loading.tsx` skeletons for `app/employer`, `app/inbox`,
  `app/settings/access` (existing `app/dashboard` and `app/classes/[id]` kept).
