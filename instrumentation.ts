/* =============================================================================
 * instrumentation.ts — server-side observability bootstrap
 * -----------------------------------------------------------------------------
 * Role: Next.js calls register() on startup to load Sentry for nodejs/edge
 *       runtimes. onRequestError forwards server errors to Sentry.
 * Dependencies: @sentry/nextjs, sentry.server.config, sentry.edge.config
 * Used by: Next.js instrumentation hook (production / when DSN set)
 * ========================================================================== */
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
