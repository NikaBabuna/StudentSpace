/* =============================================================================
 * features/classes/components/InviteClient.tsx — invite members form
 * -----------------------------------------------------------------------------
 * Role: Tutor enters email + role to send a class invite via sendInvite action.
 * Dependencies: features/classes/actions/invite, components/ui
 * Used by: app/classes/[id]/invite/page.tsx
 * Inputs: classId from server page
 * Outputs: Success/error feedback; inbox notification for invitee
 * ========================================================================== */
"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { BackLink } from "@/components/shell/back-link";
import { sendInvite } from "@/features/classes/actions/invite";

type InviteRole = "student" | "parent" | "tutor" | "employer";

// Shared select styling — matches the <Input> primitive (no Select primitive yet).
const selectClass =
  "h-11 w-full cursor-pointer rounded-xl border border-line-2 bg-surface px-3.5 text-sm text-ink outline-none transition-colors hover:bg-surface-2 focus-visible:border-accent focus-visible:bg-surface focus-visible:ring-2 focus-visible:ring-accent/30";

export default function InviteClient({ classId }: { classId: string }) {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>("student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [foundUser, setFoundUser] = useState<{ id: string; full_name: string; is_employer: boolean } | null>(null);
  const [searching, setSearching] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFoundUser(null);
    setSearching(true);

    const { data, error } = await supabase
      .from("users")
      .select("id, full_name, is_employer")
      .eq("email", email.trim().toLowerCase())
      .is("deleted_at", null)
      .single();

    setSearching(false);

    if (error || !data) {
      setError("No account found with that email address.");
      return;
    }

    setFoundUser(data);
    setRole(data.is_employer ? "employer" : "student");
  }

  async function handleInvite() {
    if (!foundUser) return;
    setLoading(true);
    setError(null);

    const effectiveRole = foundUser.is_employer ? "employer" : role;
    const { error: inviteError } = await sendInvite(classId, email, effectiveRole);

    setLoading(false);

    if (inviteError) {
      setError(inviteError);
      return;
    }

    setSuccess(true);
  }

  if (success) {
    return (
      <div className="mx-auto max-w-md">
        <Card>
          <CardContent className="pt-5 text-center">
            <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-full bg-ok-tint text-ok">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <h2 className="text-[18px] font-semibold text-ink">Invite sent</h2>
            <p className="mx-auto mt-1 max-w-xs text-[13.5px] text-muted">
              {foundUser?.full_name} will see the invite in their inbox.
            </p>
            <div className="mt-6 flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setSuccess(false);
                  setFoundUser(null);
                  setEmail("");
                }}
              >
                Invite another
              </Button>
              <Button asChild className="flex-1">
                <Link href={`/classes/${classId}/overview`}>Back to class</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-4">
        <h2 className="font-serif text-[22px] tracking-[-0.01em] text-ink">Invite someone</h2>
        <p className="mt-1 text-[13.5px] text-muted">
          They must already have a StudentSpace account.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-5">
          <form onSubmit={handleSearch}>
            <Field label="Email address" htmlFor="invite-email">
              <div className="flex gap-2">
                <Input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setFoundUser(null);
                    setError(null);
                  }}
                  required
                  placeholder="their@email.com"
                  aria-invalid={error ? true : undefined}
                  className="flex-1"
                />
                <Button type="submit" variant="secondary" busy={searching}>
                  {searching ? "Searching" : "Find"}
                </Button>
              </div>
            </Field>
          </form>

          {foundUser ? (
            <div className="flex items-center gap-3 rounded-xl border border-ok/40 bg-ok-tint/40 px-3.5 py-3">
              <Avatar name={foundUser.full_name} size="md" />
              <div className="min-w-0">
                <div className="truncate text-[13.5px] font-medium text-ink">{foundUser.full_name}</div>
                <div className="truncate text-[12px] text-muted">{email}</div>
              </div>
              {foundUser.is_employer ? (
                <Badge tone="accent" className="ml-auto">Organisation</Badge>
              ) : null}
            </div>
          ) : null}

          {error ? (
            <p className="rounded-xl border border-danger/30 bg-danger-tint/50 px-3.5 py-2.5 text-[12.5px] text-danger">
              {error}
            </p>
          ) : null}

          {foundUser ? (
            <div className="flex flex-col gap-4 border-t border-line pt-4">
              <Field label="Role in this class" htmlFor="invite-role">
                {foundUser.is_employer ? (
                  <div className="flex h-11 items-center rounded-xl border border-line bg-surface-2 px-3.5 text-sm text-muted">
                    Employer (organisation account)
                  </div>
                ) : (
                  <select
                    id="invite-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as InviteRole)}
                    className={selectClass}
                  >
                    <option value="student">Student</option>
                    <option value="parent">Parent</option>
                    <option value="tutor">Co-tutor</option>
                  </select>
                )}
              </Field>

              <Button onClick={handleInvite} busy={loading} className="w-full">
                {loading ? "Sending" : `Invite as ${foundUser.is_employer ? "employer" : role}`}
              </Button>
            </div>
          ) : !error ? (
            <p className="text-[12.5px] text-muted">
              Search by email to find the person you want to add.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="mt-4">
        <BackLink href={`/classes/${classId}/overview`}>Back to class</BackLink>
      </div>
    </div>
  );
}
