// Sentry initialisation for the browser.
// Next.js loads this automatically on the client (instrumentation-client).
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  debug: false,
});

// Lets Sentry tie errors to the client-side navigation that triggered them.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
