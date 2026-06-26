/* =============================================================================
 * shell/auth-shell.tsx — split-panel auth layout
 * -----------------------------------------------------------------------------
 * Shared frame for /login and /signup: a branded marketing panel on the left
 * (hidden on small screens) and the form on the right. The brand panel uses the
 * theme-stable `brand` tokens so it stays a deep indigo in both light and dark.
 *
 * Presentational only — each page passes its own form as children.
 * ========================================================================== */
import * as React from "react";

import { Logo } from "@/components/icons";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen bg-bg lg:grid-cols-[1.05fr_1fr]">
      {/* Brand / marketing panel */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-brand p-14 text-brand-ink lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="flex size-[30px] items-center justify-center rounded-[9px] bg-accent text-accent-ink">
            <Logo size={18} />
          </span>
          <span className="text-[18px] font-semibold tracking-[-0.01em]">StudentSpace</span>
        </div>

        <div className="max-w-md">
          <div className="mb-5 font-mono text-[12px] uppercase tracking-[0.14em] text-accent">
            The operating system for tutoring
          </div>
          <h1 className="font-serif text-[clamp(2rem,3vw,3.25rem)] font-light leading-[1.06] tracking-[-0.015em]">
            Run your whole academy from one calm, focused workspace.
          </h1>
          <p className="mt-5 text-[17px] leading-relaxed text-brand-ink/70">
            Classes, scheduling, homework and conversations — for tutors,
            students and parents alike.
          </p>
        </div>

        <div className="text-[13px] text-brand-ink/45">
          Built for tutors, students &amp; parents.
        </div>
      </aside>

      {/* Form panel */}
      <div className="flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-[380px]">{children}</div>
      </div>
    </div>
  );
}
