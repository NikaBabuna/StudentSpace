/* =============================================================================
 * app/signup/page.tsx — create account
 * -----------------------------------------------------------------------------
 * Registration via Supabase. Behaviour unchanged:
 *   • personal vs business account type (business → is_employer),
 *   • client-side validation through lib/validation (signupSchema/firstError),
 *   • captures full name, timezone, and optional bio into user metadata,
 *   • shows a "check your email" confirmation screen on success.
 * Only the presentation changed — split-panel AuthShell + primitives.
 * ========================================================================== */
"use client";

import { useState } from "react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/client";
import { signupSchema, firstError } from "@/lib/validation";
import { cn } from "@/lib/utils";
import { AuthShell } from "@/components/shell/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";

type AccountType = "personal" | "business";

export default function SignupPage() {
  const supabase = createClient();

  const [accountType, setAccountType] = useState<AccountType>("personal");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [bio, setBio] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = signupSchema.safeParse({ fullName, email, password, bio });
    if (!parsed.success) {
      setError(firstError(parsed.error));
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: fullName,
          is_employer: accountType === "business",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          bio: bio || null,
        },
      },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSuccess(true);
  }

  // Post-signup confirmation screen.
  if (success) {
    return (
      <AuthShell>
        <h2 className="font-serif text-[30px] leading-[1.1] tracking-[-0.01em] text-ink">
          Check your email
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
          We sent a confirmation link to <span className="font-medium text-ink">{email}</span>.
          Click it to verify your account, then log in.
        </p>
        <Button asChild className="mt-7 w-full">
          <Link href="/login">Go to login</Link>
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h2 className="font-serif text-[30px] leading-[1.1] tracking-[-0.01em] text-ink">
        Create your account
      </h2>
      <p className="mt-1.5 mb-6 text-[15px] text-ink-2">Start running your classes in minutes.</p>

      {/* Account type — segmented control */}
      <div className="mb-2 flex gap-1 rounded-xl border border-line bg-surface-2 p-1">
        {(["personal", "business"] as AccountType[]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setAccountType(type)}
            className={cn(
              "flex-1 rounded-lg py-2 text-[13px] font-medium capitalize transition-colors",
              accountType === type ? "bg-accent text-accent-ink" : "text-muted hover:text-ink"
            )}
          >
            {type}
          </button>
        ))}
      </div>
      <p className="mb-5 px-1 text-[12px] text-muted">
        {accountType === "personal"
          ? "For tutors, students, and parents. Join or create classes."
          : "For organizations and employers. Get oversight across your tutors' classes."}
      </p>

      <form onSubmit={handleSignup} className="flex flex-col gap-4">
        <Field label="Full name" htmlFor="fullName">
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            placeholder="Your full name"
            autoComplete="name"
          />
        </Field>

        <Field
          label="Email"
          htmlFor="email"
          hint="You will need to verify this address before logging in."
        >
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
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            placeholder="••••••••"
            autoComplete="new-password"
          />
        </Field>

        <Field label="Bio" htmlFor="bio" optional>
          <Textarea
            id="bio"
            rows={2}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={
              accountType === "personal"
                ? "e.g. Math and physics tutor based in Tbilisi"
                : "e.g. Tutoring agency based in Georgia"
            }
          />
        </Field>

        {error ? (
          <div className="rounded-lg bg-danger-tint px-3 py-2 text-[12.5px] text-danger">{error}</div>
        ) : null}

        <Button type="submit" busy={loading} className="mt-1 w-full">
          {loading ? "Creating account…" : "Create account"}
        </Button>

        <div className="my-1 flex items-center gap-3.5">
          <div className="h-px flex-1 bg-line" />
          <span className="text-[13px] text-muted">or</span>
          <div className="h-px flex-1 bg-line" />
        </div>

        <p className="text-center text-sm text-ink-2">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-accent hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
