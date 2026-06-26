/* =============================================================================
 * features/dashboard/components/class-shared.tsx — shared class list cards
 * -----------------------------------------------------------------------------
 * Role: ClassCard and ClassGroup components used on dashboard home and class
 *       list. Includes settings menu hooking into class-settings-modal.
 * Dependencies: dashboard/actions, class-settings-modal, components/ui
 * Used by: DashboardHomeClient, ClassesClient
 * Inputs: DashboardClassRow from lib/dashboard-data
 * Outputs: Linked cards with role badges and quick actions
 * ========================================================================== */
"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { updateClass, deleteClass } from "@/features/dashboard/actions";
import type { DashboardClassRow } from "@/lib/dashboard-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { IconButton } from "@/components/ui/icon-button";
import { CloseIcon } from "@/components/icons";

const ROLE: Record<string, { label: string; tone: "accent" | "ok" | "warn" | "neutral" }> = {
  tutor: { label: "Tutor", tone: "accent" },
  student: { label: "Student", tone: "ok" },
  parent: { label: "Parent", tone: "warn" },
  employer: { label: "Employer", tone: "neutral" },
};

export type { DashboardClassRow as ClassRow };

function EditClassModal({ cls, onClose }: { cls: DashboardClassRow; onClose: () => void }) {
  const router = useRouter();

  const [title, setTitle] = useState(cls.title ?? "");
  const [subject, setSubject] = useState(cls.subject ?? "");
  const [level, setLevel] = useState(cls.level ?? "");
  const [description, setDescription] = useState(cls.description ?? "");
  const [tutorNotes, setTutorNotes] = useState(cls.tutor_notes ?? "");
  const [cycleHours, setCycleHours] = useState(String(cls.cycle_hours ?? 8));
  const [paymentAmount, setPaymentAmount] = useState(String(cls.paymentAmount ?? ""));
  const [paymentCurrency, setPaymentCurrency] = useState(cls.paymentCurrency ?? "GEL");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { error: dbErr } = await updateClass({
      classId: cls.id,
      title,
      subject,
      level,
      description,
      tutorNotes,
      cycleHours: parseInt(cycleHours) || cls.cycle_hours,
      paymentAmount: paymentAmount ? parseFloat(paymentAmount) : null,
      paymentCurrency,
    });
    setSaving(false);
    if (dbErr) {
      setError(dbErr);
      return;
    }
    onClose();
    router.refresh();
  }

  async function handleDelete() {
    setDeleting(true);
    const { error } = await deleteClass(cls.id);
    if (error) {
      setDeleting(false);
      setError(error);
      return;
    }
    router.push("/dashboard/classes");
    router.refresh();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-[460px] max-w-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow)]">
        <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-4">
          <div className="text-sm font-semibold text-ink">Edit class</div>
          <IconButton aria-label="Close" onClick={onClose}>
            <CloseIcon size={16} />
          </IconButton>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto p-5">
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <Field label="Title" htmlFor="ec-title">
              <Input id="ec-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Subject" htmlFor="ec-subject" optional>
                <Input id="ec-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Physics" />
              </Field>
              <Field label="Level" htmlFor="ec-level" optional>
                <Input id="ec-level" value={level} onChange={(e) => setLevel(e.target.value)} placeholder="e.g. Grade 10" />
              </Field>
            </div>

            <Field label="Description" htmlFor="ec-desc" optional>
              <Textarea id="ec-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this class about?" />
            </Field>

            <Field label="Tutor notes" htmlFor="ec-notes" optional>
              <Textarea id="ec-notes" rows={2} value={tutorNotes} onChange={(e) => setTutorNotes(e.target.value)} placeholder="Private notes visible only to you…" />
            </Field>

            <Field label="Cycle hours" htmlFor="ec-hours">
              <Input id="ec-hours" type="number" min={1} value={cycleHours} onChange={(e) => setCycleHours(e.target.value)} />
            </Field>

            <div className="border-t border-line pt-3">
              <Field label="Payment per cycle" htmlFor="ec-amount" optional>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    id="ec-amount"
                    type="number"
                    min={0}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="e.g. 200"
                  />
                  <select
                    value={paymentCurrency}
                    onChange={(e) => setPaymentCurrency(e.target.value)}
                    className="h-11 w-full rounded-xl border border-line-2 bg-surface px-3 text-sm text-ink outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
                  >
                    <option value="GEL">GEL — Lari</option>
                    <option value="USD">USD — Dollar</option>
                    <option value="EUR">EUR — Euro</option>
                    <option value="RUB">RUB — Ruble</option>
                  </select>
                </div>
              </Field>
            </div>

            {error ? (
              <div className="rounded-lg bg-danger-tint px-3 py-2 text-[12px] text-danger">{error}</div>
            ) : null}

            <Button type="submit" busy={saving} className="w-full">
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </form>

          <div className="border-t border-line pt-3">
            {!confirmDelete ? (
              <Button variant="destructive" className="w-full" onClick={() => setConfirmDelete(true)}>
                Delete class
              </Button>
            ) : (
              <div className="flex flex-col gap-2 rounded-xl border border-danger/40 bg-danger-tint p-3">
                <p className="text-[12px] text-danger">
                  Permanently delete this class and all its data? This cannot be undone.
                </p>
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
        </div>
      </div>
    </div>
  );
}

export function ClassCard({ cls }: { cls: DashboardClassRow }) {
  const role = ROLE[cls.role] ?? ROLE.tutor;
  const [showMenu, setShowMenu] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const meta = [cls.subject, cls.level].filter(Boolean).join(" · ") || "No subject set";

  return (
    <>
      <div className="rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-line-2">
        <div className="mb-3 flex items-center gap-2.5">
          <Avatar name={cls.title} size="md" />
          <Link href={`/classes/${cls.id}/overview`} className="min-w-0 flex-1">
            <div className="truncate text-[14.5px] font-semibold text-ink">{cls.title}</div>
            <div className="mt-0.5 truncate text-[12px] text-muted">{meta}</div>
          </Link>
          <Badge tone={role.tone}>{role.label}</Badge>
          {cls.isCreator ? (
            <div ref={menuRef} className="relative shrink-0">
              <IconButton size="sm" aria-label="Class actions" onClick={() => setShowMenu((m) => !m)}>
                <span className="text-[15px] leading-none">⋯</span>
              </IconButton>
              {showMenu ? (
                <div className="absolute right-0 top-9 z-50 min-w-[130px] overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--shadow)]">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowEdit(true);
                    }}
                    className="block w-full px-3 py-2 text-left text-[13px] text-ink-2 hover:bg-surface-2 hover:text-ink"
                  >
                    Edit class
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <Link href={`/classes/${cls.id}/overview`} className="flex flex-wrap gap-1.5">
          <Badge>{cls.cycle_hours}h cycle</Badge>
          {cls.paymentAmount ? (
            <Badge>
              {cls.paymentAmount} {cls.paymentCurrency}/cycle
            </Badge>
          ) : null}
          {cls.member_count > 1 ? <Badge>{cls.member_count} members</Badge> : null}
        </Link>
      </div>

      {showEdit ? <EditClassModal cls={cls} onClose={() => setShowEdit(false)} /> : null}
    </>
  );
}

export function ClassGroup({ title, classes }: { title: string; classes: DashboardClassRow[] }) {
  if (classes.length === 0) return null;
  return (
    <section className="mb-9">
      <div className="mb-3 font-mono text-[12px] uppercase tracking-[0.06em] text-muted">{title}</div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {classes.map((cls) => (
          <ClassCard key={cls.id} cls={cls} />
        ))}
      </div>
    </section>
  );
}
