# Changelog

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

### Server actions added

| File | Actions |
|------|---------|
| `app/classes/new/actions.ts` | `createClass` (class + first payment cycle, in one place) |
| `app/classes/[id]/actions.ts` | `removeMember` (tutor-only) |
| `app/classes/[id]/schedule/actions.ts` | `completeLesson`, `missLesson`, `cancelLesson`, `deleteLesson`, `scheduleLesson`, `markCyclePaid` |
| `app/classes/[id]/homework/actions.ts` | `createHomework`, `updateHomework`, `deleteHomework` (plus existing `submitHomework`) |
| `app/classes/[id]/homework/[hwId]/actions.ts` | `gradeSubmission` (tutor-only) |
| `app/classes/[id]/materials/actions.ts` | `createMaterialGroup`, `insertMaterials`, `renameMaterialGroup`, `deleteMaterial`, `deleteMaterialGroup`, `toggleMaterialPin` |
| `app/classes/[id]/chat/actions.ts` | `postMessage` (membership checked) |
| `app/classes/[id]/invite/actions.ts` | `sendInvite` (tutor-only; target + role re-derived server-side) |
| `app/inbox/actions.ts` | `respondInvite`, `respondParentRequest` (ownership verified; role/parent taken from the row, not the client) |
| `app/dashboard/actions.ts` | `updateClass`, `deleteClass` (creator-only) |
| `app/settings/access/actions.ts` | `sendParentRequest`, `removeChild`, `removeParent` |

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
`InboxClient`, `DashboardClient`, `AccessClient`, `InviteClient`, `MembersButton`,
`chat/page.tsx`, `classes/new/page.tsx`.

### Error & loading UI

- Added `error.tsx` for `app/dashboard`, `app/classes/[id]`, `app/employer`
  (report to Sentry + friendly retry).
- Added `loading.tsx` skeletons for `app/employer`, `app/inbox`,
  `app/settings/access` (existing `app/dashboard` and `app/classes/[id]` kept).
