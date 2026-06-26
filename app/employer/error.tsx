/* =============================================================================
 * app/employer/error.tsx — employer portal error boundary
 * ========================================================================== */
"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

import { ErrorView } from "@/components/shell/error-view";

export default function EmployerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <ErrorView
      title="Something went wrong"
      description="An error occurred loading the employer portal. You can try again or return to the overview."
      onRetry={reset}
      homeHref="/employer"
      homeLabel="Go to portal"
    />
  );
}
