/* =============================================================================
 * app/global-error.tsx — last-resort error boundary
 * -----------------------------------------------------------------------------
 * Catches errors thrown in the root layout itself, where the normal error.tsx
 * boundary can't reach. It must render its own <html>/<body> and cannot rely on
 * the theme script or the design tokens (they live in the layout it's replacing)
 * — so the colors here are intentionally hard-coded to the dark palette.
 * ========================================================================== */
"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en" data-theme="dark">
      <body
        style={{
          background: "oklch(0.175 0.012 265)",
          color: "oklch(0.96 0.006 90)",
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem", maxWidth: 420 }}>
          <h2 style={{ fontSize: 22, fontWeight: 500, marginBottom: 8 }}>Something went wrong</h2>
          <p style={{ fontSize: 14, color: "oklch(0.76 0.008 90)", marginBottom: 22 }}>
            An unexpected error occurred. Please reload the page.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              background: "oklch(0.72 0.14 266)",
              color: "oklch(0.17 0.02 265)",
              border: "none",
              borderRadius: 12,
              padding: "11px 22px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
