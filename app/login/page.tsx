/* =============================================================================
 * app/login/page.tsx — sign in
 * -----------------------------------------------------------------------------
 * Email/password login via Supabase.
 *   • surfaces "verify your email" / confirmation-failed messages from query
 *     params (via useSearchParams, derived during render — no state syncing)
 *     and from the sign-in error,
 *   • routes employers to /employer and everyone else to /dashboard.
 * useSearchParams requires a Suspense boundary during prerender, so the page
 * exports a thin wrapper around the actual form.
 * ========================================================================== */
"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/shell/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Post-verification / failed-confirmation hints come straight from the URL;
  // they yield to form feedback once the user submits.
  const notice =
    !submitted && searchParams.get("verified") === "1"
      ? "Email verified. You can log in now."
      : null;
  const paramError =
    !submitted && searchParams.get("error") === "confirmation_failed"
      ? "Email confirmation failed or the link expired. Try signing up again or contact support."
      : null;
  const error = formError ?? paramError;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitted(true);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      const msg = error.message.toLowerCase();
      if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
        setFormError(
          "Please verify your email before logging in. Check your inbox for the confirmation link."
        );
      } else {
        setFormError(error.message);
      }
      return;
    }

    // Route employers to their portal, everyone else to the dashboard.
    const { data: profile } = await supabase
      .from("users")
      .select("is_employer")
      .eq("id", (await supabase.auth.getUser()).data.user!.id)
      .single();

    router.push(profile?.is_employer ? "/employer" : "/dashboard");
    router.refresh();
  }

  return (
    <AuthShell>
      <h2 className="font-serif text-[30px] leading-[1.1] tracking-[-0.01em] text-ink">
        Welcome back
      </h2>
      <p className="mt-1.5 mb-7 text-[15px] text-ink-2">Log in to your StudentSpace account.</p>

      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            autoComplete="email"
          />
        </Field>

        <Field label="Password" htmlFor="password">
          <div className="relative">
            <Input
              id="password"
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              autoComplete="current-password"
              className="pr-16"
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="absolute right-1.5 top-1.5 h-8 rounded-lg px-2.5 text-[13px] font-medium text-muted hover:text-ink"
            >
              {showPass ? "Hide" : "Show"}
            </button>
          </div>
        </Field>

        {notice ? (
          <div className="rounded-lg bg-ok-tint px-3 py-2 text-[12.5px] text-ok">{notice}</div>
        ) : null}
        {error ? (
          <div className="rounded-lg bg-danger-tint px-3 py-2 text-[12.5px] text-danger">{error}</div>
        ) : null}

        <Button type="submit" busy={loading} className="mt-1 w-full">
          {loading ? "Logging in…" : "Log in"}
        </Button>

        <div className="my-1 flex items-center gap-3.5">
          <div className="h-px flex-1 bg-line" />
          <span className="text-[13px] text-muted">or</span>
          <div className="h-px flex-1 bg-line" />
        </div>

        <p className="text-center text-sm text-ink-2">
          New here?{" "}
          <Link href="/signup" className="font-semibold text-accent hover:underline">
            Create an account
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
