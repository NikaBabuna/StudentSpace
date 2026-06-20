"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// global-error.tsx catches errors thrown in the root layout itself, where the
// normal error.tsx boundary can't reach. It must render its own <html>/<body>.
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          background: "#1c1a17",
          color: "#e8e0d0",
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <h2 style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>
            Something went wrong
          </h2>
          <p style={{ fontSize: 13, color: "#9a8f7a", marginBottom: 20 }}>
            An unexpected error occurred. Please reload the page.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              background: "#c8a050",
              color: "#1c1a17",
              border: "none",
              borderRadius: 8,
              padding: "10px 20px",
              fontSize: 13,
              fontWeight: 500,
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
