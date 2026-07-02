/* =============================================================================
 * features/classes/components/MembersButton.tsx — class roster popover
 * -----------------------------------------------------------------------------
 * Role: Shows class members with roles; tutor can remove members via action.
 * Dependencies: members action, Avatar, components/ui
 * Used by: app/classes/[id]/layout.tsx (class header)
 * Inputs: classId, members list, current user role from layout
 * Outputs: Popover UI with remove controls for tutor
 * ========================================================================== */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

import { removeMember } from "@/features/classes/actions/members";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { useEscapeClose } from "@/components/ui/use-escape-close";
import { CloseIcon } from "@/components/icons";

// Same role → tone mapping as the class cards and inbox (ROLE / ROLE_TONE).
const ROLE_BADGE: Record<string, "accent" | "warn" | "ok" | "neutral"> = {
  tutor: "accent",
  student: "ok",
  parent: "warn",
  employer: "neutral",
};

export default function MembersButton({
  classId,
  members,
  currentUserId,
}: {
  classId: string;
  members: { id: string; full_name: string; role: string }[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  function close() {
    setOpen(false);
    setConfirmId(null);
  }

  useEscapeClose(close, open);

  async function handleRemove(userId: string) {
    setRemoving(userId);
    const { error } = await removeMember(classId, userId);
    setRemoving(null);
    setConfirmId(null);
    if (error) return;
    router.refresh();
  }

  return (
    <>
      <Button variant="secondary" size="sm" className="bg-bg hover:bg-surface-2" onClick={() => setOpen(true)}>
        Members ({members.length})
      </Button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) close();
            }}
          >
            <div
              className="flex max-h-[80vh] w-full max-w-[400px] flex-col overflow-hidden rounded-2xl border border-line bg-bg shadow-[var(--shadow)]"
              role="dialog"
              aria-labelledby="members-dialog-title"
            >
              <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-4">
                <h2 id="members-dialog-title" className="text-[15px] font-semibold text-ink">
                  Members
                </h2>
                <IconButton size="sm" aria-label="Close" onClick={close}>
                  <CloseIcon size={16} />
                </IconButton>
              </div>

              <div className="flex flex-col gap-2 overflow-y-auto p-4">
                {members.map((m) => {
                  const isSelf = m.id === currentUserId;
                  const isConfirming = confirmId === m.id;

                  return (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 rounded-xl border border-line/80 bg-surface px-3 py-2.5"
                    >
                      <Avatar name={m.full_name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-medium text-ink">
                          {m.full_name}
                          {isSelf ? (
                            <span className="ml-1.5 text-[11px] font-normal text-muted">(you)</span>
                          ) : null}
                        </div>
                        <Badge tone={ROLE_BADGE[m.role] ?? "neutral"} className="mt-1 text-[10px]">
                          {m.role}
                        </Badge>
                      </div>

                      {!isSelf &&
                        (!isConfirming ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 shrink-0 px-2.5 text-[12px] text-danger"
                            onClick={() => setConfirmId(m.id)}
                          >
                            Remove
                          </Button>
                        ) : (
                          <div className="flex shrink-0 items-center gap-1.5">
                            <span className="text-[11px] text-muted">Sure?</span>
                            <Button variant="secondary" size="sm" className="h-8 px-2 text-[11px]" onClick={() => setConfirmId(null)}>
                              No
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-8 px-2 text-[11px]"
                              busy={removing === m.id}
                              onClick={() => handleRemove(m.id)}
                            >
                              Yes
                            </Button>
                          </div>
                        ))}
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
