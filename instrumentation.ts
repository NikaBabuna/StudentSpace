// Server-side instrumentation entry point. Next.js calls register() once on
// startup; we load the runtime-appropriate Sentry config. onRequestError
// forwards uncaught Server Component / route errors to Sentry.
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
