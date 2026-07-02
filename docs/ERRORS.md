# Error codes & logging

How failures are reported in StudentSpace, and what every error code means.
The machine-readable catalog lives in [`lib/errors.ts`](../lib/errors.ts);
**`lib/errors.test.ts` fails CI if this document and the catalog drift apart**,
so update both together.

---

## How it works

```
Server action hits a failure
  → actionFail("SS-HW-01", rawDetail, { classId })      lib/log.ts
      → logs  [SS-HW-01] <raw Supabase/technical detail> | {"classId":"…"}
      → error-severity entries also go to Sentry (tagged code=SS-HW-01)
      → returns { error: "Could not post the homework. Please try again." }
Client shows only the friendly message. The code and detail never reach the UI.
```

- **Users see** the catalogued friendly message — never raw database,
  infrastructure, or stack details.
- **Developers and agents see** the code, the raw detail, and the context in:
  - local dev: the `npm run dev` terminal,
  - production: **Vercel → project → Logs** (function logs), and
  - **Sentry** (error severity only), searchable by the `code` tag.

### Severities

| Severity | Meaning | Goes to |
| --- | --- | --- |
| `warn` | Expected denial: auth guard, rate limit, stale/missing row | Console only |
| `error` | Something failed that should have worked: DB write, RPC, storage | Console + Sentry |

### What is *not* catalogued

Deliberate rule feedback is the product working, not an error — it is returned
inline from actions without logging and has no code. Examples: Zod validation
messages, "The deadline has passed", "This person is already a member",
"No account found with that email address".

---

## Adding a new code (for agents)

1. Add the entry in `lib/errors.ts` under its domain (`SS-<DOMAIN>-<NN>`, next
   free number; pick `warn` or `error` per the table above).
2. Call `actionFail("SS-…", rawDetail, context)` at the failure site.
   Context is flat key/values — ids only, **never emails or names** (privacy).
3. Document the code in the table below (same row format).
4. `npm test` — `lib/errors.test.ts` verifies format, message quality, and
   doc sync.

---

## Catalog

### Auth & access — `SS-AUTH-*` (warn)

| Code | User sees | Raised when |
| --- | --- | --- |
| `SS-AUTH-01` | You need to be signed in to do that. | Any server action called without a session (expired cookie, logged out in another tab) |
| `SS-AUTH-02` | You're not a member of this class. | Membership check failed (`postMessage`) |
| `SS-AUTH-03` | Only the tutor of this class can do that. | Tutor-role guard failed (homework, materials, schedule, invites, grading, roster, cycles) |
| `SS-AUTH-04` | Only the class creator can do that. | Creator guard failed (`updateClass`, `deleteClass`) |
| `SS-AUTH-05` | This item doesn't belong to your account. | Responding to an invite/parent-request addressed to someone else |

### Rate limiting — `SS-RATE-*` (warn)

| Code | User sees | Raised when |
| --- | --- | --- |
| `SS-RATE-01` | Too many attempts. Please wait a minute and try again. | `checkRateLimit` rejected an email lookup (`lookupInviteEmail`, `sendInvite`, `sendParentRequest`) |

### Missing rows — `SS-NF-*` (warn)

Usually stale UI: the row was deleted after the page loaded.

| Code | User sees | Raised when |
| --- | --- | --- |
| `SS-NF-01` | This class no longer exists. | `requireClassCreator` found no class row |
| `SS-NF-02` | This lesson no longer exists. | `getTutorContext` found no lesson row |
| `SS-NF-03` | This homework no longer exists. | `submitHomework` on a deleted/missing homework |
| `SS-NF-04` | This invite no longer exists. | `respondInvite` on a missing invite |
| `SS-NF-05` | This request no longer exists. | `respondParentRequest` on a missing request |

### Chat — `SS-CHAT-*` (error)

| Code | User sees | Raised when |
| --- | --- | --- |
| `SS-CHAT-01` | Could not send your message. Please try again. | `messages` insert failed in `postMessage` |

### Classes — `SS-CLASS-*` (error)

| Code | User sees | Raised when |
| --- | --- | --- |
| `SS-CLASS-01` | Could not create the class. Please try again. | `classes` insert failed in `createClassPipeline` |
| `SS-CLASS-02` | The class was created but setting you as tutor failed. Please contact support. | `class_members` insert failed after class insert (partial state — check the DB) |
| `SS-CLASS-03` | The class was created but its payment cycle could not be opened. | First `payment_cycles` insert failed (partial state) |
| `SS-CLASS-04` | Could not save the class settings. Please try again. | `classes` update failed in `updateClass` |
| `SS-CLASS-05` | Could not save the payment settings. Please try again. | Payment update/insert on the open cycle failed in `updateClass` |
| `SS-CLASS-06` | Could not delete the class. Please try again. | Final `classes` soft-delete failed in `deleteClass` |

### Roster & invites — `SS-MEMBER-*`, `SS-INVITE-*` (error)

| Code | User sees | Raised when |
| --- | --- | --- |
| `SS-MEMBER-01` | Could not remove this member. Please try again. | `class_members` delete failed in `removeMember` |
| `SS-INVITE-01` | Could not send the invite. Please try again. | `invites` insert failed in `sendInvite` |

### Lessons — `SS-LESSON-*` (error)

| Code | User sees | Raised when |
| --- | --- | --- |
| `SS-LESSON-01` | Could not schedule the lesson. Please try again. | `lessons` insert failed in `scheduleLesson` |
| `SS-LESSON-02` | Could not update the lesson. Please try again. | Status update failed (`completeLesson`, `missLesson`, `cancelLesson`; `step` context says which) |
| `SS-LESSON-03` | Could not delete the lesson. Please try again. | Soft-delete failed in `deleteLesson` |
| `SS-LESSON-04` | Could not move the lesson. Please try again. | Move/resize update failed in `updateLesson` |

### Payment cycles — `SS-CYCLE-*` (error)

| Code | User sees | Raised when |
| --- | --- | --- |
| `SS-CYCLE-01` | The lesson was saved but the payment cycle could not be updated. Please check the schedule page. | Any step of the close/open/overflow sequence in `completeLesson` failed (`step` context: close-cycle, open-cycle, overflow-lesson). **Investigate promptly — cycle state may be inconsistent.** |
| `SS-CYCLE-02` | Could not mark the cycle as paid. Please try again. | `paid_at` update failed in `markCyclePaid` |

### Recurring schedules — `SS-RECUR-*` (error)

| Code | User sees | Raised when |
| --- | --- | --- |
| `SS-RECUR-01` | Could not save the weekly schedule. Please try again. | `recurring_schedules` insert failed |
| `SS-RECUR-02` | The schedule was saved but its lessons could not be generated. Open the schedule page to retry. | `generate_recurring_lessons` RPC failed (the schedule page re-tops-up on visit) |
| `SS-RECUR-03` | Could not update the weekly schedule. Please try again. | Pause/resume/retire update failed (`step` context: toggle-active, retire) |

### Homework & submissions — `SS-HW-*`, `SS-SUB-*` (error)

| Code | User sees | Raised when |
| --- | --- | --- |
| `SS-HW-01` | Could not post the homework. Please try again. | `homework` insert failed |
| `SS-HW-02` | Could not save the homework changes. Please try again. | `homework` update failed |
| `SS-HW-03` | Could not delete the homework. Please try again. | Soft-delete failed |
| `SS-SUB-01` | Could not submit your work. Please try again. | `submissions` insert failed (after deadline/role checks passed) |
| `SS-SUB-02` | Could not save the feedback. Please try again. | Grade update failed in `gradeSubmission` |

### Materials — `SS-MAT-*` (error)

| Code | User sees | Raised when |
| --- | --- | --- |
| `SS-MAT-01` | Could not create the folder. Please try again. | `material_groups` insert failed |
| `SS-MAT-02` | The files were uploaded but could not be recorded. Please try again. | `materials` insert failed after client upload (orphan files in storage — safe, but retry writes the rows) |
| `SS-MAT-03` | Could not rename the folder. Please try again. | Group rename failed |
| `SS-MAT-04` | Could not delete the file. Please try again. | Material soft-delete failed |
| `SS-MAT-05` | Could not delete the folder. Please try again. | Group/materials soft-delete failed (`step` context: materials, group) |
| `SS-MAT-06` | Could not pin the file. Please try again. | Pin toggle failed |

### Inbox — `SS-INBOX-*` (error)

| Code | User sees | Raised when |
| --- | --- | --- |
| `SS-INBOX-01` | Could not join the class. Please try again. | `class_members` insert failed while accepting an invite |
| `SS-INBOX-02` | Could not update the invite. Please try again. | Invite status update failed |
| `SS-INBOX-03` | Could not update the request. Please try again. | Parent-request status update failed |
| `SS-INBOX-04` | The request was accepted but the link could not be created. Please try again. | `parent_students` insert failed after accept (request already marked accepted — check the DB) |

### Parent-child links — `SS-LINK-*` (error)

| Code | User sees | Raised when |
| --- | --- | --- |
| `SS-LINK-01` | Could not send the request. Please try again. | `parent_requests` insert failed in `sendParentRequest` |
| `SS-LINK-02` | Could not remove the link. Please try again. | `parent_students` delete failed (`action` context: removeChild, removeParent) |

### Storage — `SS-STORE-*` (warn)

| Code | User sees | Raised when |
| --- | --- | --- |
| `SS-STORE-01` | *(none — page keeps rendering with the unsigned URL)* | `createSignedUrl` failed in `lib/storage.ts`. With private buckets the fallback link will not open — if users report broken files, search the logs for this code. |

---

## Reading a log line

```
[SS-CYCLE-01] duplicate key value violates unique constraint "…" | {"lessonId":"…","step":"open-cycle"}
```

1. **Code** → this table tells you the operation and file.
2. **Detail** → the raw technical message (Supabase/Postgres/RPC).
3. **Context** → ids and step markers to locate the exact rows involved.

In Sentry, filter by tag `code` to group recurring failures.
