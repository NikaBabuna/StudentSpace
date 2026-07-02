/* =============================================================================
 * lib/log.ts — server-side structured logging
 * -----------------------------------------------------------------------------
 * Role: One place server code reports failures. Every entry carries an error
 *       code from lib/errors.ts, the technical detail (e.g. the raw Supabase
 *       message — which users never see), and key/value context. Output goes
 *       to the server console (visible in `npm run dev` locally and in the
 *       Vercel function logs in production); "error"-severity entries are also
 *       forwarded to Sentry when a DSN is configured.
 * Dependencies: @sentry/nextjs, lib/errors
 * Used by: features/** server actions (via actionFail), lib/storage
 * Inputs: ErrorCode, optional detail string, optional flat context object
 * Outputs: log line `[SS-XX-NN] detail | {"context":...}`; actionFail also
 *          returns { error: <friendly message> } for the client.
 * Docs: docs/ERRORS.md — code catalog and how to read these logs.
 * ========================================================================== */
import * as Sentry from "@sentry/nextjs";

import { ERROR_CATALOG, type ErrorCode } from "@/lib/errors";

/** Flat, JSON-serialisable context: ids, emails are NOT logged (privacy). */
export type LogContext = Record<string, string | number | boolean | null | undefined>;

/**
 * Write one structured log entry. Prefer actionFail() in server actions;
 * call this directly only for failures that don't produce a user-facing error
 * (e.g. a fallback path that keeps working).
 */
export function logEvent(code: ErrorCode, detail?: string | null, context?: LogContext): void {
  const { severity } = ERROR_CATALOG[code];
  const line = `[${code}] ${detail ?? ERROR_CATALOG[code].message}`;
  const suffix = context ? ` | ${JSON.stringify(context)}` : "";

  if (severity === "error") {
    console.error(line + suffix);
    // Sentry no-ops when no DSN is configured, but never let telemetry break
    // the actual request.
    try {
      Sentry.captureMessage(line, { level: "error", tags: { code }, extra: context });
    } catch {
      /* telemetry must never throw */
    }
  } else {
    console.warn(line + suffix);
  }
}

/**
 * Standard failure return for server actions: logs the technical detail under
 * its code and hands the client only the catalogued friendly message.
 *
 *   const { error } = await supabase.from("messages").insert(...);
 *   if (error) return actionFail("SS-CHAT-01", error.message, { classId });
 *
 * Spread into richer result shapes: `return { groupId: null, ...actionFail(...) }`.
 */
export function actionFail(
  code: ErrorCode,
  detail?: string | null,
  context?: LogContext
): { error: string } {
  logEvent(code, detail, context);
  return { error: ERROR_CATALOG[code].message };
}
