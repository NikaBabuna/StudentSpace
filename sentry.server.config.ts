/* =============================================================================
 * sentry.server.config.ts — Sentry for Node.js server runtime
 * -----------------------------------------------------------------------------
 * Role: Sentry.init for API routes, Server Components, server actions (nodejs).
 * Dependencies: @sentry/nextjs, NEXT_PUBLIC_SENTRY_DSN
 * Used by: instrumentation.ts when NEXT_RUNTIME === "nodejs"
 * ========================================================================== */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Capture 100% of transactions — fine at this scale (1–10 users).
  tracesSampleRate: 1,
  // No-op automatically if the DSN is unset (e.g. local dev without it).
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  debug: false,
});
