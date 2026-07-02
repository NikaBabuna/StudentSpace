/* =============================================================================
 * shell/class-settings-modal.tsx — edit / leave / delete a class
 * -----------------------------------------------------------------------------
 * Extracted from the old Sidebar (which had grown to ~470 lines) and re-skinned
 * with primitives. Behaviour is unchanged:
 *   • Class creators see an edit form plus "leave" and "delete" (both confirm).
 *   • Members see only "leave".
 * Mutations go straight to Supabase from the client (existing app pattern); only
 * the presentation changed.
 *
 * Rendered into <body> via a portal so it overlays the whole app regardless of
 * where the trigger sits in the tree.
 * ========================================================================== */
"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { updateClass, deleteClass } from "@/features/dashboard/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { IconButton } from "@/components/ui/icon-button";
import { useEscapeClose } from "@/components/ui/use-escape-close";
import { CloseIcon } from "@/components/icons";

export type ClassSettingsModalProps = {
  classId: string;
  initialName: string;
  initialSubject: string | null | undefined;
  initialLevel: string | null | undefined;
  initialDescription: string | null | undefined;
  initialTutorNotes: string | null | undefined;
  initialCycleHours: number;
  initialPaymentAmount?: number | null;
  initialPaymentCurrency?: string | null;
  isCreator: boolean;
  onClose: () => void;
};

export function ClassSettingsModal({
  classId,
  initialName,
  initialSubject,
  initialLevel,
  initialDescription,
  initialTutorNotes,
  initialCycleHours,
  initialPaymentAmount,
  initialPaymentCurrency,
  isCreator,
  onClose,
}: ClassSettingsModalProps) {
  const supabase = createClient();
  const router = useRouter();

  const [name, setName] = useState(initialName);
  const [subject, setSubject] = useState(initialSubject ?? "");
  const [level, setLevel] = useState(initialLevel ?? "");
  const [description, setDescription] = useState(initialDescription ?? "");
  const [tutorNotes, setTutorNotes] = useState(initialTutorNotes ?? "");
  const [cycleHours, setCycleHours] = useState(String(initialCycleHours));
  const [paymentAmount, setPaymentAmount] = useState(
    initialPaymentAmount != null ? String(initialPaymentAmount) : ""
  );
  const [paymentCurrency, setPaymentCurrency] = useState(initialPaymentCurrency ?? "GEL");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEscapeClose(onClose);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    // Goes through the server action so the per-cycle payment persists on the
    // open cycle — the same path the dashboard "Edit class" modal uses.
    const { error } = await updateClass({
      classId,
      title: name,
      subject,
      level,
      description,
      tutorNotes,
      cycleHours: parseInt(cycleHours) || initialCycleHours,
      paymentAmount: paymentAmount ? parseFloat(paymentAmount) : null,
      paymentCurrency,
    });
    setSaving(false);
    if (error) {
      setSaveError(error);
      return;
    }
    onClose();
    router.refresh();
  }

  async function handleLeave() {
    setLeaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user)
      await supabase.from("class_members").delete().eq("class_id", classId).eq("user_id", user.id);
    router.push("/dashboard");
  }

  // Soft-delete the class + its content and purge its storage files. Runs in a
  // single server action so it can't hang half-done, and errors surface instead
  // of leaving the button spinning.
  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const { error } = await deleteClass(classId);
      if (error) {
        setDeleteError(error);
        setDeleting(false);
        return;
      }
      onClose();
      router.push("/dashboard");
      router.refresh();
    } catch {
      setDeleteError("Could not delete the class. Please try again.");
      setDeleting(false);
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-[460px] max-w-full flex-col overflow-hidden rounded-2xl border border-line bg-bg shadow-[var(--shadow)]">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-4">
          <div className="text-sm font-semibold text-ink">Class settings</div>
          <IconButton aria-label="Close" onClick={onClose}>
            <CloseIcon size={16} />
          </IconButton>
        </div>

        <div className="flex flex-col gap-5 overflow-y-auto p-5">
          {isCreator ? (
            <>
              <form onSubmit={handleSave} className="flex flex-col gap-4">
                <Field label="Title" htmlFor="cs-title">
                  <Input
                    id="cs-title"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Subject" htmlFor="cs-subject" optional>
                    <Input
                      id="cs-subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g. Physics"
                    />
                  </Field>
                  <Field label="Level" htmlFor="cs-level" optional>
                    <Input
                      id="cs-level"
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                      placeholder="e.g. Grade 10"
                    />
                  </Field>
                </div>

                <Field label="Description" htmlFor="cs-desc" optional>
                  <Textarea
                    id="cs-desc"
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What is this class about?"
                  />
                </Field>

                <Field label="Tutor notes" htmlFor="cs-notes" optional>
                  <Textarea
                    id="cs-notes"
                    rows={2}
                    value={tutorNotes}
                    onChange={(e) => setTutorNotes(e.target.value)}
                    placeholder="Private notes visible only to you…"
                  />
                </Field>

                <Field label="Cycle hours" htmlFor="cs-hours">
                  <Input
                    id="cs-hours"
                    type="number"
                    min={1}
                    value={cycleHours}
                    onChange={(e) => setCycleHours(e.target.value)}
                  />
                </Field>

                <div className="border-t border-line pt-3">
                  <Field label="Payment per cycle" htmlFor="cs-amount" optional>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        id="cs-amount"
                        type="number"
                        min={0}
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="e.g. 200"
                      />
                      <select
                        value={paymentCurrency}
                        onChange={(e) => setPaymentCurrency(e.target.value)}
                        className="h-11 w-full rounded-xl border border-line-2 bg-surface px-3 text-sm text-ink outline-none transition-colors hover:bg-surface-2 focus-visible:border-accent focus-visible:bg-surface focus-visible:ring-2 focus-visible:ring-accent/30"
                      >
                        <option value="GEL">GEL — Lari</option>
                        <option value="USD">USD — Dollar</option>
                        <option value="EUR">EUR — Euro</option>
                        <option value="RUB">RUB — Ruble</option>
                      </select>
                    </div>
                  </Field>
                </div>

                {saveError ? (
                  <div className="rounded-lg bg-danger-tint px-3 py-2 text-[12px] text-danger">
                    {saveError}
                  </div>
                ) : null}

                <Button type="submit" busy={saving} className="w-full">
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              </form>

              <div className="h-px bg-line" />

              <div className="flex flex-col gap-2">
                <LeaveControl
                  confirm={confirmLeave}
                  setConfirm={setConfirmLeave}
                  busy={leaving}
                  onConfirm={handleLeave}
                />
                {!confirmDelete ? (
                  <Button variant="destructive" className="w-full" onClick={() => setConfirmDelete(true)}>
                    Delete class
                  </Button>
                ) : (
                  <div className="flex flex-col gap-2 rounded-xl border border-danger/40 bg-danger-tint p-3">
                    <p className="text-[12px] text-danger">
                      Permanently delete this class, all lessons, homework, and materials? This
                      cannot be undone.
                    </p>
                    {deleteError ? (
                      <p className="rounded-lg bg-danger-tint px-3 py-2 text-[12px] text-danger">
                        {deleteError}
                      </p>
                    ) : null}
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" className="flex-1" onClick={() => setConfirmDelete(false)}>
                        Cancel
                      </Button>
                      <Button variant="destructive" size="sm" busy={deleting} className="flex-1 bg-danger text-white" onClick={handleDelete}>
                        {deleting ? "Deleting…" : "Yes, delete"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="text-[13px] text-muted">You are a member of this class.</p>
              <LeaveControl
                confirm={confirmLeave}
                setConfirm={setConfirmLeave}
                busy={leaving}
                onConfirm={handleLeave}
              />
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

/** "Leave class" button that expands into an inline confirm. */
function LeaveControl({
  confirm,
  setConfirm,
  busy,
  onConfirm,
}: {
  confirm: boolean;
  setConfirm: (v: boolean) => void;
  busy: boolean;
  onConfirm: () => void;
}) {
  if (!confirm) {
    return (
      <Button variant="secondary" className="w-full" onClick={() => setConfirm(true)}>
        Leave class
      </Button>
    );
  }
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface-2 p-3">
      <p className="text-[12px] text-ink-2">Leave this class? You&apos;ll lose access unless re-invited.</p>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" className="flex-1" onClick={() => setConfirm(false)}>
          Cancel
        </Button>
        <Button variant="destructive" size="sm" busy={busy} className="flex-1 bg-danger text-white" onClick={onConfirm}>
          {busy ? "Leaving…" : "Yes, leave"}
        </Button>
      </div>
    </div>
  );
}
