/* =============================================================================
 * app/(shell)/dashboard/error.tsx — dashboard error boundary
 * ========================================================================== */
"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

import { ErrorView } from "@/components/shell/error-view";

export default function DashboardError({
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
      title="Couldn't load your dashboard"
      description="Something went wrong while loading your classes. Try again in a moment."
      onRetry={reset}
    />
  );
}
