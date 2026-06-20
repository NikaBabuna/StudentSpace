// Shared domain types that aren't auto-generated from the database schema.

/**
 * A member's role within a class. Matches the `class_member_role` /
 * `invite_role` Postgres enums. Defined here (rather than only in the
 * generated types) so client components can import it without pulling in
 * server-only modules.
 */
export type ClassRole = "tutor" | "student" | "parent" | "employer";

/** A trimmed class shape used in list/summary views (e.g. employer pages). */
export type ClassSummary = {
  id: string;
  title: string;
  subject: string | null;
  level: string | null;
  cycle_hours: number;
};

/**
 * A file attached to homework or a submission. Stored in the `attachments`
 * jsonb column as an array of these objects.
 */
export type Attachment = {
  url: string;
  name: string;
  size_bytes: number;
  mime_type: string;
};

/**
 * Narrows the generated `Json` type of an `attachments` column into a typed
 * `Attachment[]`. The DB column is jsonb (so its type is `Json`), but the app
 * always writes an array of attachment objects — this coerces safely and
 * returns an empty array for null/non-array values.
 */
export function toAttachments(value: unknown): Attachment[] {
  return Array.isArray(value) ? (value as Attachment[]) : [];
}
