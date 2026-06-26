/* =============================================================================
 * app/classes/[id]/error.tsx — class error boundary
 * ========================================================================== */
"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

import { ErrorView } from "@/components/shell/error-view";

export default function ClassError({
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
      title="Couldn't load this class"
      description="Something went wrong loading this page. Try again or go back to your dashboard."
      onRetry={reset}
    />
  );
}
