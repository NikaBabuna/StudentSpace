/* =============================================================================
 * app/error.tsx — root error boundary
 * -----------------------------------------------------------------------------
 * Catches render/runtime errors in route segments under the root layout.
 * Reports to Sentry, then shows the shared ErrorView with a retry + home link.
 * ========================================================================== */
"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

import { ErrorView } from "@/components/shell/error-view";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <ErrorView
      description="An unexpected error occurred. You can try again or return to your dashboard."
      onRetry={reset}
    />
  );
}
