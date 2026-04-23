"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

const roleColors: Record<string, { bg: string; color: string; border: string }> = {
  student:  { bg: "#2a1e10", color: "#e8a060", border: "#5a3a1a" },
  parent:   { bg: "#10203a", color: "#60a8e8", border: "#1a3a6a" },
  tutor:    { bg: "#2a2318", color: "#c8a050", border: "#4a3a18" },
  employer: { bg: "#1a2a10", color: "#80c060", border: "#2a4a1a" },
};

export default function InboxClient({ invites }: { invites: any[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const pending  = invites.filter((i) => i.status === "pending");
  const past     = invites.filter((i) => i.status !== "pending");

  async function respond(inviteId: string, classId: string, accept: boolean) {
    setLoading(inviteId);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    // Update invite status
    await supabase
      .from("invites")
      .update({
        status: accept ? "accepted" : "declined",
        responded_at: new Date().toISOString(),
      })
      .eq("id", inviteId);

    // If accepted, add to class_members
    if (accept) {
      const invite = invites.find((i) => i.id === inviteId);
      await supabase
        .from("class_members")
        .insert({
          class_id: classId,
          user_id: user.id,
          role: invite.role,
        });
    }

    setLoading(null);
    router.refresh();
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--color-ss-bg)" }}
    >
      {/* Header */}
      <div
        className="px-8 py-5 flex items-center justify-between"
        style={{ borderBottom: "0.5px solid var(--color-ss-border)" }}
      >
        <div>
          <div className="text-[18px] font-medium" style={{ color: "var(--color-ss-text-primary)" }}>
            Inbox
          </div>
          <div className="text-[12px] mt-0.5" style={{ color: "var(--color-ss-text-faint)" }}>
            {pending.length} pending {pending.length === 1 ? "invite" : "invites"}
          </div>
        </div>
        <Link
          href="/dashboard"
          className="text-[13px] px-3 py-1.5 rounded-md"
          style={{ color: "var(--color-ss-text-muted)", background: "#2a2820", border: "0.5px solid var(--color-ss-border)" }}
        >
          ← Dashboard
        </Link>
      </div>

      <div className="px-8 py-6 max-w-2xl">

        {/* Empty state */}
        {invites.length === 0 && (
          <div
            className="rounded-xl p-10 text-center"
            style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}
          >
            <div className="text-[14px] font-medium mb-1" style={{ color: "var(--color-ss-text-muted)" }}>
              No invites yet
            </div>
            <div className="text-[12px]" style={{ color: "var(--color-ss-text-faint)" }}>
              When someone invites you to a class, it will appear here.
            </div>
          </div>
        )}

        {/* Pending invites */}
        {pending.length > 0 && (
          <div className="mb-8">
            <div className="text-[11px] uppercase tracking-wider mb-3" style={{ color: "var(--color-ss-text-ghost)" }}>
              Pending
            </div>
            <div className="flex flex-col gap-3">
              {pending.map((invite) => {
                const colors = roleColors[invite.role] ?? roleColors.student;
                const cls = invite.classes;
                const invitedBy = invite.invited_by_user?.full_name ?? "Someone";
                return (
                  <div
                    key={invite.id}
                    className="rounded-xl p-4"
                    style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[14px] font-medium" style={{ color: "#d8c8a0" }}>
                            {cls?.title ?? "Unknown class"}
                          </span>
                          <span
                            className="text-[10px] font-medium px-2 py-0.5 rounded"
                            style={{ background: colors.bg, color: colors.color, border: `0.5px solid ${colors.border}` }}
                          >
                            {invite.role}
                          </span>
                        </div>
                        {(cls?.subject || cls?.level) && (
                          <div className="text-[12px] mb-1" style={{ color: "var(--color-ss-text-faint)" }}>
                            {[cls.subject, cls.level].filter(Boolean).join(" · ")}
                          </div>
                        )}
                        <div className="text-[11px]" style={{ color: "var(--color-ss-text-ghost)" }}>
                          Invited by {invitedBy}
                        </div>
                      </div>

                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => respond(invite.id, cls?.id, false)}
                          disabled={loading === invite.id}
                          className="text-[12px] px-3 py-1.5 rounded-md"
                          style={{ color: "var(--color-ss-red)", background: "var(--color-ss-red-bg)", border: "0.5px solid var(--color-ss-red-border)", opacity: loading === invite.id ? 0.6 : 1 }}
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => respond(invite.id, cls?.id, true)}
                          disabled={loading === invite.id}
                          className="text-[12px] font-medium px-3 py-1.5 rounded-md"
                          style={{ background: "var(--color-ss-amber-light)", color: "#1c1a17", opacity: loading === invite.id ? 0.6 : 1 }}
                        >
                          {loading === invite.id ? "…" : "Accept"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Past invites */}
        {past.length > 0 && (
          <div>
            <div className="text-[11px] uppercase tracking-wider mb-3" style={{ color: "var(--color-ss-text-ghost)" }}>
              Past
            </div>
            <div className="flex flex-col gap-2">
              {past.map((invite) => {
                const cls = invite.classes;
                const accepted = invite.status === "accepted";
                return (
                  <div
                    key={invite.id}
                    className="rounded-xl px-4 py-3 flex items-center justify-between gap-4"
                    style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-[13px]" style={{ color: "#c8b890" }}>
                        {cls?.title ?? "Unknown class"}
                      </span>
                      <span className="text-[11px] ml-2" style={{ color: "var(--color-ss-text-ghost)" }}>
                        as {invite.role}
                      </span>
                    </div>
                    <span
                      className="text-[10px] font-medium px-2 py-0.5 rounded shrink-0"
                      style={{
                        background: accepted ? "var(--color-ss-green-bg)" : "var(--color-ss-red-bg)",
                        color: accepted ? "var(--color-ss-green)" : "var(--color-ss-red)",
                        border: `0.5px solid ${accepted ? "var(--color-ss-green-border)" : "var(--color-ss-red-border)"}`,
                      }}
                    >
                      {accepted ? "Accepted" : "Declined"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}