"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

const roleColors: Record<string, { bg: string; color: string; border: string }> = {
  tutor:    { bg: "#2a2318", color: "#c8a050", border: "#4a3a18" },
  student:  { bg: "#2a1e10", color: "#e8a060", border: "#5a3a1a" },
  parent:   { bg: "#10203a", color: "#60a8e8", border: "#1a3a6a" },
  employer: { bg: "#1a2a10", color: "#80c060", border: "#2a4a1a" },
};

export default function MembersButton({ classId, members, currentUserId }: {
  classId: string;
  members: { id: string; full_name: string; role: string }[];
  currentUserId: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function handleRemove(userId: string) {
    setRemoving(userId);
    await supabase.from("class_members")
      .delete()
      .eq("class_id", classId)
      .eq("user_id", userId);
    setRemoving(null);
    setConfirmId(null);
    router.refresh();
  }

  const modal = open && (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={e => { if (e.target === e.currentTarget) { setOpen(false); setConfirmId(null); } }}>
      <div className="w-[400px] rounded-xl flex flex-col max-h-[80vh]"
        style={{ background: "#201e18", border: "0.5px solid var(--color-ss-border)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: "0.5px solid #2a2820" }}>
          <div className="text-[14px] font-medium" style={{ color: "var(--color-ss-text-primary)" }}>
            Members
          </div>
          <button onClick={() => { setOpen(false); setConfirmId(null); }}
            style={{ color: "#5a5248", background: "none", border: "none", cursor: "pointer", fontSize: 14 }}>
            ✕
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto p-4 flex flex-col gap-2">
          {members.map(m => {
            const colors = roleColors[m.role] ?? roleColors.student;
            const isSelf = m.id === currentUserId;
            const isConfirming = confirmId === m.id;

            return (
              <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                style={{ background: "#17150f", border: "0.5px solid #2a2820" }}>

                {/* Avatar */}
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-medium shrink-0"
                  style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.color }}>
                  {m.full_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
                </div>

                {/* Name + role */}
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] truncate" style={{ color: "#c8b890" }}>
                    {m.full_name}{isSelf && <span className="ml-1.5 text-[10px]" style={{ color: "#4a4438" }}>(you)</span>}
                  </div>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded mt-0.5 inline-block"
                    style={{ background: colors.bg, color: colors.color, border: `0.5px solid ${colors.border}` }}>
                    {m.role}
                  </span>
                </div>

                {/* Remove */}
                {!isSelf && (
                  !isConfirming ? (
                    <button onClick={() => setConfirmId(m.id)}
                      className="text-[11px] px-2.5 py-1 rounded shrink-0"
                      style={{ color: "#7a5a48", background: "#1e1410", border: "0.5px solid #3a2010", cursor: "pointer" }}>
                      Remove
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[11px]" style={{ color: "#7a6050" }}>Sure?</span>
                      <button onClick={() => setConfirmId(null)}
                        className="text-[11px] px-2 py-1 rounded"
                        style={{ color: "#6a6050", background: "#2a2820", border: "0.5px solid #3a3630", cursor: "pointer" }}>
                        No
                      </button>
                      <button onClick={() => handleRemove(m.id)} disabled={removing === m.id}
                        className="text-[11px] px-2 py-1 rounded font-medium"
                        style={{ background: "var(--color-ss-red)", color: "#fff", opacity: removing === m.id ? 0.6 : 1, cursor: "pointer" }}>
                        {removing === m.id ? "…" : "Yes"}
                      </button>
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

 return (
  <>
    <button
      onClick={() => setOpen(true)}
      className="text-[12px] font-medium px-3 py-1 rounded"
      style={{ color: "#9a8060", background: "#2a2318", border: "0.5px solid #4a3a18", cursor: "pointer" }}
    >
      Members ({members.length})
    </button>
    {open && typeof document !== "undefined" && createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.55)" }}
        onClick={e => { if (e.target === e.currentTarget) { setOpen(false); setConfirmId(null); } }}>
        <div className="w-[400px] rounded-xl flex flex-col max-h-[80vh]"
          style={{ background: "#201e18", border: "0.5px solid var(--color-ss-border)" }}>
          <div className="flex items-center justify-between px-5 py-4 shrink-0"
            style={{ borderBottom: "0.5px solid #2a2820" }}>
            <div className="text-[14px] font-medium" style={{ color: "var(--color-ss-text-primary)" }}>
              Members
            </div>
            <button onClick={() => { setOpen(false); setConfirmId(null); }}
              style={{ color: "#5a5248", background: "none", border: "none", cursor: "pointer", fontSize: 14 }}>
              ✕
            </button>
          </div>
          <div className="overflow-y-auto p-4 flex flex-col gap-2">
            {members.map(m => {
              const colors = roleColors[m.role] ?? roleColors.student;
              const isSelf = m.id === currentUserId;
              const isConfirming = confirmId === m.id;
              return (
                <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                  style={{ background: "#17150f", border: "0.5px solid #2a2820" }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-medium shrink-0"
                    style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.color }}>
                    {m.full_name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] truncate" style={{ color: "#c8b890" }}>
                      {m.full_name}{isSelf && <span className="ml-1.5 text-[10px]" style={{ color: "#4a4438" }}>(you)</span>}
                    </div>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded mt-0.5 inline-block"
                      style={{ background: colors.bg, color: colors.color, border: `0.5px solid ${colors.border}` }}>
                      {m.role}
                    </span>
                  </div>
                  {!isSelf && (
                    !isConfirming ? (
                      <button onClick={() => setConfirmId(m.id)}
                        className="text-[11px] px-2.5 py-1 rounded shrink-0"
                        style={{ color: "#7a5a48", background: "#1e1410", border: "0.5px solid #3a2010", cursor: "pointer" }}>
                        Remove
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px]" style={{ color: "#7a6050" }}>Sure?</span>
                        <button onClick={() => setConfirmId(null)}
                          className="text-[11px] px-2 py-1 rounded"
                          style={{ color: "#6a6050", background: "#2a2820", border: "0.5px solid #3a3630", cursor: "pointer" }}>
                          No
                        </button>
                        <button onClick={() => handleRemove(m.id)} disabled={removing === m.id}
                          className="text-[11px] px-2 py-1 rounded font-medium"
                          style={{ background: "var(--color-ss-red)", color: "#fff", opacity: removing === m.id ? 0.6 : 1, cursor: "pointer" }}>
                          {removing === m.id ? "…" : "Yes"}
                        </button>
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>,
      document.body
    )}
  </>
);
}