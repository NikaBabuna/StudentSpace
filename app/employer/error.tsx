"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";

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
    <div
      className="flex h-screen items-center justify-center px-4"
      style={{ background: "var(--color-ss-bg)" }}
    >
      <div
        className="w-full max-w-[400px] rounded-xl p-8 text-center"
        style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}
      >
        <div className="text-[20px] font-medium mb-2" style={{ color: "var(--color-ss-text-primary)" }}>
          Something went wrong
        </div>
        <p className="text-[13px] leading-relaxed mb-6" style={{ color: "var(--color-ss-text-faint)" }}>
          An error occurred loading the employer portal.
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={reset}
            className="w-full text-[13px] font-medium py-2.5 rounded-lg"
            style={{ background: "var(--color-ss-amber-light)", color: "#1c1a17" }}
          >
            Try again
          </button>
          <Link
            href="/login"
            className="w-full text-center text-[13px] py-2.5 rounded-lg"
            style={{ color: "var(--color-ss-text-muted)", border: "0.5px solid var(--color-ss-border)", textDecoration: "none" }}
          >
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
