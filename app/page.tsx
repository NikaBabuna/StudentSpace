/* =============================================================================
 * app/page.tsx — public landing page
 * -----------------------------------------------------------------------------
 * The unauthenticated entry point: brand mark, an editorial serif headline, and
 * the two primary actions (create account / log in). Purely presentational —
 * no data or auth here (the auth pages handle that).
 * ========================================================================== */
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/icons";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 py-16 text-center">
      {/* Brand mark */}
      <span className="mb-7 flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-ink shadow-[var(--shadow)]">
        <Logo size={26} />
      </span>

      {/* Wordmark + tagline */}
      <div className="mb-3 font-mono text-[12px] uppercase tracking-[0.14em] text-accent">
        The operating system for tutoring
      </div>
      <h1 className="max-w-2xl font-serif text-[clamp(2.4rem,6vw,3.5rem)] leading-[1.05] tracking-[-0.015em] text-ink">
        Run your whole academy from one calm, focused workspace.
      </h1>
      <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-ink-2">
        Classes, scheduling, homework and conversations — for tutors, students
        and parents alike.
      </p>

      {/* Primary actions */}
      <div className="mt-9 flex w-full max-w-[300px] flex-col gap-3">
        <Button asChild size="lg">
          <Link href="/signup">Create an account</Link>
        </Button>
        <Button asChild variant="secondary" size="lg">
          <Link href="/login">Log in</Link>
        </Button>
      </div>

      {/* Active-development note */}
      <div className="mt-10 rounded-xl border border-line bg-surface px-4 py-2.5 text-center">
        <div className="text-[11px] font-medium text-accent">🚧 Active development</div>
        <div className="mt-0.5 text-[11px] text-muted">
          StudentSpace is being built in the open. Expect changes and rough edges.
        </div>
      </div>

      <div className="mt-8 text-[11px] text-muted">
        By signing up you agree to our terms of service.
      </div>
    </div>
  );
}
