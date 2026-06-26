/* =============================================================================
 * sentry.edge.config.ts — Sentry for Edge runtime (proxy/middleware)
 * -----------------------------------------------------------------------------
 * Role: Sentry.init when code runs on the Edge (e.g. proxy.ts session refresh).
 * Dependencies: @sentry/nextjs, NEXT_PUBLIC_SENTRY_DSN
 * Used by: instrumentation.ts when NEXT_RUNTIME === "edge"
 * ========================================================================== */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  debug: false,
});
