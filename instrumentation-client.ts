/* =============================================================================
 * instrumentation-client.ts — browser Sentry bootstrap
 * -----------------------------------------------------------------------------
 * Role: Initialises Sentry in the browser when NEXT_PUBLIC_SENTRY_DSN is set.
 *       Exports onRouterTransitionStart for navigation-linked error context.
 * Dependencies: @sentry/nextjs
 * Used by: Next.js client instrumentation
 * ========================================================================== */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  debug: false,
});

// Lets Sentry tie errors to the client-side navigation that triggered them.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
