"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

const roleColors: Record<string, { bg: string; color: string; border: string }> = {
  student:  { bg: "#2a1e10", color: "#e8a060", border: "#5a3a1a" },
  parent:   { bg: "#10203a", color: "#60a8e8", border: "#1a3a6a" },
  tutor:    { bg: "#2a2318", color: "#c8a050", border: "#4a3a18" },
  employer: { bg: "#1a2a10", color: "#80c060", border: "#2a4a1a" },
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-wider mb-3" style={{ color: "#4a4438" }}>
      {children}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl py-8 text-center text-[13px]"
      style={{ background: "#17150f", border: "0.5px solid #2a2820", color: "#4a4438" }}>
      {message}
    </div>
  );
}

export default function InboxClient({
  invites, parentRequests, userId,
}: {
  invites: any[];
  parentRequests: any[];
  userId: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const pendingInvites = invites.filter(i => i.status === "pending");
  const pastInvites = invites.filter(i => i.status !== "pending");
  const pendingParentReqs = parentRequests.filter(r => r.status === "pending");
  const pastParentReqs = parentRequests.filter(r => r.status !== "pending");

  const totalPending = pendingInvites.length + pendingParentReqs.length;

  async function respondInvite(inviteId: string, classId: string, role: string, accept: boolean) {
    setLoading(inviteId);
    await supabase.from("invites").update({
      status: accept ? "accepted" : "declined",
    }).eq("id", inviteId);

    if (accept) {
      await supabase.from("class_members").insert({
        class_id: classId, user_id: userId, role,
      });
    }
    setLoading(null);
    router.refresh();
  }

  async function respondParentRequest(reqId: string, parentId: string, accept: boolean) {
    setLoading(reqId);
    await supabase.from("parent_requests").update({
      status: accept ? "accepted" : "declined",
    }).eq("id", reqId);

    if (accept) {
      await supabase.from("parent_students").insert({
        parent_id: parentId, student_id: userId,
      });
    }
    setLoading(null);
    router.refresh();
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* Header */}
      <div className="px-6 py-4 shrink-0 flex items-center justify-between"
        style={{ borderBottom: "0.5px solid var(--color-ss-border)" }}>
        <div>
          <h1 className="text-[16px] font-medium" style={{ color: "var(--color-ss-text-primary)" }}>Inbox</h1>
          <p className="text-[11px] mt-0.5" style={{ color: "#5a5248" }}>
            {totalPending > 0 ? `${totalPending} pending` : "Nothing pending"}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 flex flex-col gap-6 max-w-2xl">

        {/* Pending class invites */}
        {pendingInvites.length > 0 && (
          <div>
            <SectionLabel>Class invites</SectionLabel>
            <div className="flex flex-col gap-2.5">
              {pendingInvites.map(invite => {
                const colors = roleColors[invite.role] ?? roleColors.student;
                const cls = invite.classes;
                const invitedBy = invite.invited_by_user?.full_name ?? "Someone";
                return (
                  <div key={invite.id} className="rounded-xl p-4"
                    style={{ background: "#201e18", border: "0.5px solid #3a3630" }}>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[14px] font-medium" style={{ color: "#d8c8a0" }}>
                            {cls?.title ?? "Unknown class"}
                          </span>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded"
                            style={{ background: colors.bg, color: colors.color, border: `0.5px solid ${colors.border}` }}>
                            {invite.role}
                          </span>
                        </div>
                        {(cls?.subject || cls?.level) && (
                          <div className="text-[11px] mb-1" style={{ color: "#6a6050" }}>
                            {[cls.subject, cls.level].filter(Boolean).join(" · ")}
                          </div>
                        )}
                        <div className="text-[11px]" style={{ color: "#4a4438" }}>
                          Invited by {invitedBy}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => respondInvite(invite.id, cls?.id, invite.role, false)}
                          disabled={loading === invite.id}
                          className="text-[12px] px-3 py-1.5 rounded-md"
                          style={{ color: "var(--color-ss-red)", background: "var(--color-ss-red-bg)", border: "0.5px solid var(--color-ss-red-border)", opacity: loading === invite.id ? 0.6 : 1, cursor: "pointer" }}>
                          Decline
                        </button>
                        <button
                          onClick={() => respondInvite(invite.id, cls?.id, invite.role, true)}
                          disabled={loading === invite.id}
                          className="text-[12px] font-medium px-3 py-1.5 rounded-md"
                          style={{ background: "var(--color-ss-amber-light)", color: "#1c1a17", opacity: loading === invite.id ? 0.6 : 1, cursor: "pointer" }}>
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

        {/* Pending parent requests */}
        {pendingParentReqs.length > 0 && (
          <div>
            <SectionLabel>Parent link requests</SectionLabel>
            <div className="flex flex-col gap-2.5">
              {pendingParentReqs.map(req => (
                <div key={req.id} className="rounded-xl p-4"
                  style={{ background: "#201e18", border: "0.5px solid #3a3630" }}>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-medium mb-1" style={{ color: "#d8c8a0" }}>
                        {req.parent?.full_name ?? "Someone"}
                      </div>
                      <div className="text-[11px]" style={{ color: "#4a4438" }}>
                        wants to link as your parent
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => respondParentRequest(req.id, req.parent?.id, false)}
                        disabled={loading === req.id}
                        className="text-[12px] px-3 py-1.5 rounded-md"
                        style={{ color: "var(--color-ss-red)", background: "var(--color-ss-red-bg)", border: "0.5px solid var(--color-ss-red-border)", opacity: loading === req.id ? 0.6 : 1, cursor: "pointer" }}>
                        Decline
                      </button>
                      <button
                        onClick={() => respondParentRequest(req.id, req.parent?.id, true)}
                        disabled={loading === req.id}
                        className="text-[12px] font-medium px-3 py-1.5 rounded-md"
                        style={{ background: "var(--color-ss-amber-light)", color: "#1c1a17", opacity: loading === req.id ? 0.6 : 1, cursor: "pointer" }}>
                        {loading === req.id ? "…" : "Accept"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {totalPending === 0 && pastInvites.length === 0 && pastParentReqs.length === 0 && (
          <EmptyState message="Nothing here yet — invites and parent link requests will appear here." />
        )}

        {/* Past invites */}
        {pastInvites.length > 0 && (
          <div>
            <SectionLabel>Past invites</SectionLabel>
            <div className="flex flex-col gap-2">
              {pastInvites.map(invite => {
                const accepted = invite.status === "accepted";
                const cls = invite.classes;
                return (
                  <div key={invite.id} className="rounded-xl px-4 py-3 flex items-center justify-between gap-4"
                    style={{ background: "#17150f", border: "0.5px solid #2a2820" }}>
                    <div className="flex-1 min-w-0">
                      <span className="text-[12px]" style={{ color: "#c8b890" }}>
                        {cls?.title ?? "Unknown class"}
                      </span>
                      <span className="text-[11px] ml-2" style={{ color: "#4a4438" }}>
                        as {invite.role}
                      </span>
                    </div>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded shrink-0"
                      style={accepted
                        ? { background: "#10201a", color: "#40a870", border: "0.5px solid #1a4030" }
                        : { background: "#1e0e0e", color: "#a03030", border: "0.5px solid #3a1010" }}>
                      {accepted ? "Accepted" : "Declined"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Past parent requests */}
        {pastParentReqs.length > 0 && (
          <div>
            <SectionLabel>Past parent requests</SectionLabel>
            <div className="flex flex-col gap-2">
              {pastParentReqs.map(req => {
                const accepted = req.status === "accepted";
                return (
                  <div key={req.id} className="rounded-xl px-4 py-3 flex items-center justify-between gap-4"
                    style={{ background: "#17150f", border: "0.5px solid #2a2820" }}>
                    <span className="text-[12px]" style={{ color: "#c8b890" }}>
                      {req.parent?.full_name ?? "Someone"} — parent link
                    </span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded shrink-0"
                      style={accepted
                        ? { background: "#10201a", color: "#40a870", border: "0.5px solid #1a4030" }
                        : { background: "#1e0e0e", color: "#a03030", border: "0.5px solid #3a1010" }}>
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