"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

type InviteRole = "student" | "parent" | "tutor" | "employer";

export default function InvitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const effectiveRole = foundUser.is_employer ? "employer" : role;

    const { data: existing } = await supabase
      .from("class_members")
      .select("id")
      .eq("class_id", id)
      .eq("user_id", foundUser.id)
      .single();

    if (existing) {
      setError("This person is already a member of this class.");
      setLoading(false);
      return;
    }

    const { data: existingInvite } = await supabase
      .from("invites")
      .select("id, status")
      .eq("class_id", id)
      .eq("invited_user_id", foundUser.id)
      .single();

    if (existingInvite?.status === "pending") {
      setError("This person already has a pending invite to this class.");
      setLoading(false);
      return;
    }

    const { error: inviteError } = await supabase
      .from("invites")
      .insert({
        class_id: id,
        invited_by: user.id,
        invited_user_id: foundUser.id,
        role: effectiveRole,
      });

    setLoading(false);

    if (inviteError) {
      setError(inviteError.message);
      return;
    }

    setSuccess(true);
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center"
        style={{ background: "var(--color-ss-bg)" }}>
        <div className="w-[380px] rounded-xl p-8 text-center"
          style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}>
          <div className="text-[20px] font-medium mb-2" style={{ color: "var(--color-ss-text-primary)" }}>
            Invite sent
          </div>
          <div className="text-[13px] mb-6" style={{ color: "var(--color-ss-text-faint)" }}>
            {foundUser?.full_name} will see the invite in their inbox.
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { setSuccess(false); setFoundUser(null); setEmail(""); }}
              className="flex-1 text-[13px] py-2 rounded-lg"
              style={{ color: "var(--color-ss-text-muted)", background: "#2a2820", border: "0.5px solid var(--color-ss-border)", cursor: "pointer" }}
            >
              Invite another
            </button>
            <Link href={`/classes/${id}/overview`}
              className="flex-1 text-center text-[13px] font-medium py-2 rounded-lg"
              style={{ background: "var(--color-ss-amber-light)", color: "#1c1a17", textDecoration: "none" }}>
              Back to class
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center"
      style={{ background: "var(--color-ss-bg)" }}>
      <div className="mb-8 text-center">
        <div className="text-[24px] font-medium mb-1" style={{ color: "var(--color-ss-text-primary)" }}>
          Invite someone
        </div>
        <div className="text-[13px]" style={{ color: "var(--color-ss-text-faint)" }}>
          They must already have a StudentSpace account.
        </div>
      </div>

      <div className="w-[420px] rounded-xl p-8"
        style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}>

        <form onSubmit={handleSearch} className="flex flex-col gap-4">
          <div>
            <label className="text-[11px] mb-1.5 block" style={{ color: "var(--color-ss-text-faint)" }}>
              Email address
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setFoundUser(null); setError(null); }}
                required
                placeholder="their@email.com"
                className="flex-1 px-3 py-2 rounded-md text-[13px] outline-none"
                style={{ background: "#17150f", border: "0.5px solid var(--color-ss-border)", color: "var(--color-ss-text-secondary)" }}
              />
              <button type="submit" disabled={searching}
                className="text-[13px] font-medium px-4 py-2 rounded-md shrink-0"
                style={{ background: "var(--color-ss-amber-dim)", color: "var(--color-ss-amber-light)", border: "0.5px solid var(--color-ss-amber-border)", opacity: searching ? 0.6 : 1, cursor: "pointer" }}>
                {searching ? "Searching…" : "Find"}
              </button>
            </div>
          </div>

          {foundUser && (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-md"
              style={{ background: "#17150f", border: "0.5px solid var(--color-ss-green-border)" }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-medium shrink-0"
                style={{ background: "#10201a", color: "var(--color-ss-green)" }}>
                {foundUser.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
              </div>
              <div>
                <div className="text-[13px] font-medium" style={{ color: "#d8c8a0" }}>{foundUser.full_name}</div>
                <div className="text-[11px]" style={{ color: "var(--color-ss-text-faint)" }}>{email}</div>
                {foundUser.is_employer && (
                  <div className="text-[10px] mt-0.5" style={{ color: "#7a6a40" }}>Organisation account</div>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="text-[12px] px-3 py-2 rounded-md"
              style={{ background: "var(--color-ss-red-bg)", color: "var(--color-ss-red)", border: "0.5px solid var(--color-ss-red-border)" }}>
              {error}
            </div>
          )}
        </form>

        {foundUser && (
          <div className="mt-4 flex flex-col gap-4">
            <div>
              <label className="text-[11px] mb-1.5 block" style={{ color: "var(--color-ss-text-faint)" }}>
                Role in this class
              </label>
              {foundUser.is_employer ? (
                <div className="px-3 py-2 rounded-md text-[13px]"
                  style={{ background: "#17150f", border: "0.5px solid var(--color-ss-border)", color: "#6a6050" }}>
                  Employer
                </div>
              ) : (
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as InviteRole)}
                  className="w-full px-3 py-2 rounded-md text-[13px] outline-none"
                  style={{ background: "#17150f", border: "0.5px solid var(--color-ss-border)", color: "var(--color-ss-text-secondary)", fontFamily: "inherit", cursor: "pointer" }}>
                  <option value="student">Student</option>
                  <option value="parent">Parent</option>
                  <option value="tutor">Co-tutor</option>
                </select>
              )}
            </div>

            <button onClick={handleInvite} disabled={loading}
              className="w-full text-[13px] font-medium py-2.5 rounded-lg"
              style={{ background: "var(--color-ss-amber-light)", color: "#1c1a17", opacity: loading ? 0.6 : 1, cursor: "pointer" }}>
              {loading ? "Sending…" : `Invite as ${foundUser.is_employer ? "employer" : role}`}
            </button>
          </div>
        )}

        <div className="mt-4">
          <Link href={`/classes/${id}/overview`} className="text-[12px]"
            style={{ color: "var(--color-ss-text-ghost)", textDecoration: "none" }}>
            ← Back to class
          </Link>
        </div>
      </div>
    </div>
  );
}