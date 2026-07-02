/* =============================================================================
 * lib/errors.ts — application error catalog
 * -----------------------------------------------------------------------------
 * Role: Single registry of every internal error code: the friendly message the
 *       user sees and the severity it logs at. Users NEVER see raw database or
 *       infrastructure messages — those go to the logs, keyed by these codes.
 * Dependencies: None (client-safe, unit-testable in plain Node)
 * Used by: lib/log.ts (actionFail), features/** server actions, tests
 * Docs: docs/ERRORS.md documents every code (where it's raised, likely causes).
 *       lib/errors.test.ts enforces that the catalog and the doc stay in sync.
 *
 * Conventions:
 *   • Code format: SS-<DOMAIN>-<NN>. Add new codes at the end of a domain.
 *   • "warn"  = expected denial (auth, rate limit, stale data) — logged for
 *               visibility, not an incident.
 *   • "error" = something failed that should have worked (DB write, RPC,
 *               storage) — logged with detail + context and sent to Sentry.
 *   • Deliberate rule feedback (validation messages, "deadline passed",
 *     "already a member") is NOT catalogued — it is the product behaving
 *     correctly, returned inline from actions without logging.
 * ========================================================================== */

export type ErrorSeverity = "warn" | "error";

export type CatalogEntry = {
  /** What the user sees. Friendly, actionable, no internals. */
  message: string;
  severity: ErrorSeverity;
};

export const ERROR_CATALOG = {
  /* --- Auth & access (expected denials) ----------------------------------- */
  "SS-AUTH-01": { message: "You need to be signed in to do that.", severity: "warn" },
  "SS-AUTH-02": { message: "You're not a member of this class.", severity: "warn" },
  "SS-AUTH-03": { message: "Only the tutor of this class can do that.", severity: "warn" },
  "SS-AUTH-04": { message: "Only the class creator can do that.", severity: "warn" },
  "SS-AUTH-05": { message: "This item doesn't belong to your account.", severity: "warn" },

  /* --- Rate limiting ------------------------------------------------------- */
  "SS-RATE-01": { message: "Too many attempts. Please wait a minute and try again.", severity: "warn" },

  /* --- Lookups that came back empty (stale UI, deleted rows) --------------- */
  "SS-NF-01": { message: "This class no longer exists.", severity: "warn" },
  "SS-NF-02": { message: "This lesson no longer exists.", severity: "warn" },
  "SS-NF-03": { message: "This homework no longer exists.", severity: "warn" },
  "SS-NF-04": { message: "This invite no longer exists.", severity: "warn" },
  "SS-NF-05": { message: "This request no longer exists.", severity: "warn" },

  /* --- Chat ---------------------------------------------------------------- */
  "SS-CHAT-01": { message: "Could not send your message. Please try again.", severity: "error" },

  /* --- Classes (create pipeline, settings, delete) ------------------------- */
  "SS-CLASS-01": { message: "Could not create the class. Please try again.", severity: "error" },
  "SS-CLASS-02": { message: "The class was created but setting you as tutor failed. Please contact support.", severity: "error" },
  "SS-CLASS-03": { message: "The class was created but its payment cycle could not be opened.", severity: "error" },
  "SS-CLASS-04": { message: "Could not save the class settings. Please try again.", severity: "error" },
  "SS-CLASS-05": { message: "Could not save the payment settings. Please try again.", severity: "error" },
  "SS-CLASS-06": { message: "Could not delete the class. Please try again.", severity: "error" },

  /* --- Roster & invites ----------------------------------------------------- */
  "SS-MEMBER-01": { message: "Could not remove this member. Please try again.", severity: "error" },
  "SS-INVITE-01": { message: "Could not send the invite. Please try again.", severity: "error" },

  /* --- Lessons -------------------------------------------------------------- */
  "SS-LESSON-01": { message: "Could not schedule the lesson. Please try again.", severity: "error" },
  "SS-LESSON-02": { message: "Could not update the lesson. Please try again.", severity: "error" },
  "SS-LESSON-03": { message: "Could not delete the lesson. Please try again.", severity: "error" },
  "SS-LESSON-04": { message: "Could not move the lesson. Please try again.", severity: "error" },

  /* --- Payment cycles ------------------------------------------------------- */
  "SS-CYCLE-01": { message: "The lesson was saved but the payment cycle could not be updated. Please check the schedule page.", severity: "error" },
  "SS-CYCLE-02": { message: "Could not mark the cycle as paid. Please try again.", severity: "error" },

  /* --- Recurring schedules --------------------------------------------------- */
  "SS-RECUR-01": { message: "Could not save the weekly schedule. Please try again.", severity: "error" },
  "SS-RECUR-02": { message: "The schedule was saved but its lessons could not be generated. Open the schedule page to retry.", severity: "error" },
  "SS-RECUR-03": { message: "Could not update the weekly schedule. Please try again.", severity: "error" },

  /* --- Homework & submissions ------------------------------------------------ */
  "SS-HW-01": { message: "Could not post the homework. Please try again.", severity: "error" },
  "SS-HW-02": { message: "Could not save the homework changes. Please try again.", severity: "error" },
  "SS-HW-03": { message: "Could not delete the homework. Please try again.", severity: "error" },
  "SS-SUB-01": { message: "Could not submit your work. Please try again.", severity: "error" },
  "SS-SUB-02": { message: "Could not save the feedback. Please try again.", severity: "error" },

  /* --- Materials -------------------------------------------------------------- */
  "SS-MAT-01": { message: "Could not create the folder. Please try again.", severity: "error" },
  "SS-MAT-02": { message: "The files were uploaded but could not be recorded. Please try again.", severity: "error" },
  "SS-MAT-03": { message: "Could not rename the folder. Please try again.", severity: "error" },
  "SS-MAT-04": { message: "Could not delete the file. Please try again.", severity: "error" },
  "SS-MAT-05": { message: "Could not delete the folder. Please try again.", severity: "error" },
  "SS-MAT-06": { message: "Could not pin the file. Please try again.", severity: "error" },

  /* --- Inbox (invite / parent-request responses) ------------------------------ */
  "SS-INBOX-01": { message: "Could not join the class. Please try again.", severity: "error" },
  "SS-INBOX-02": { message: "Could not update the invite. Please try again.", severity: "error" },
  "SS-INBOX-03": { message: "Could not update the request. Please try again.", severity: "error" },
  "SS-INBOX-04": { message: "The request was accepted but the link could not be created. Please try again.", severity: "error" },

  /* --- Parent-child links (settings) ------------------------------------------ */
  "SS-LINK-01": { message: "Could not send the request. Please try again.", severity: "error" },
  "SS-LINK-02": { message: "Could not remove the link. Please try again.", severity: "error" },

  /* --- Storage ------------------------------------------------------------------ */
  "SS-STORE-01": { message: "A file link could not be generated.", severity: "warn" },
} as const satisfies Record<string, CatalogEntry>;

export type ErrorCode = keyof typeof ERROR_CATALOG;

/** The user-facing message for a code. */
export function userMessage(code: ErrorCode): string {
  return ERROR_CATALOG[code].message;
}
