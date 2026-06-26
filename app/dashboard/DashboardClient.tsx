/* =============================================================================
 * app/dashboard/DashboardClient.tsx — tutor/student/parent home
 * -----------------------------------------------------------------------------
 * Renders the signed-in dashboard from data fetched in page.tsx:
 *   • a greeting header with a "New class" action,
 *   • four headline stats (derived from the class lists + pending invites),
 *   • the user's classes grouped by relationship (teach / attend / observe),
 *   • an edit-class modal for classes the user created.
 *
 * Adapted from the redesign mockup to our real capabilities: the mockup's
 * "Today" and "Homework" panels need lesson data this page doesn't load, so we
 * show stats we actually have instead of inventing them. The non-functional
 * EN/GE language toggle from the old UI was dropped.
 *
 * Class mutations go through the existing server actions (./actions).
 * ========================================================================== */
"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { updateClass, deleteClass } from "./actions";
import { PageContainer, PageHeader } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { PlusIcon, ClassesIcon, CloseIcon } from "@/components/icons";

/** Role → badge label + tone. */
const ROLE: Record<string, { label: string; tone: "accent" | "ok" | "warn" | "neutral" }> = {
  tutor: { label: "Tutor", tone: "accent" },
  student: { label: "Student", tone: "ok" },
  parent: { label: "Parent", tone: "warn" },
  employer: { label: "Employer", tone: "neutral" },
};

// ─── Edit modal ──────────────────────────────────────────────────────────────

function EditClassModal({ cls, onClose }: { cls: ClassRow; onClose: () => void }) {
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
    router.push("/dashboard");
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

            {/* Payment per cycle */}
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

// ─── Class card ──────────────────────────────────────────────────────────────

function ClassCard({ cls }: { cls: ClassRow }) {
  const role = ROLE[cls.role] ?? ROLE.tutor;
  const [showMenu, setShowMenu] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the ⋯ menu on outside click.
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

function ClassGroup({ title, classes }: { title: string; classes: ClassRow[] }) {
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

// ─── Page ────────────────────────────────────────────────────────────────────

/** Shape of a class row as assembled in page.tsx. */
type ClassRow = {
  id: string;
  title: string;
  subject?: string | null;
  level?: string | null;
  description?: string | null;
  tutor_notes?: string | null;
  cycle_hours: number;
  role: string;
  member_count: number;
  isCreator: boolean;
  paymentAmount: number | null;
  paymentCurrency: string;
};

export default function DashboardClient({
  firstName,
  allClasses,
  teaching,
  attending,
  observing,
  pendingInvites,
}: {
  userId: string;
  firstName: string;
  fullName: string;
  allClasses: ClassRow[];
  teaching: ClassRow[];
  attending: ClassRow[];
  observing: ClassRow[];
  pendingInvites: number;
  avatarColors: unknown[];
  roleConfig: unknown;
}) {
  // Compute the date label client-side to avoid SSR/CSR locale mismatches.
  const [dateLabel, setDateLabel] = useState("");
  useEffect(() => {
    setDateLabel(
      new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })
    );
  }, []);

  return (
    <PageContainer>
      <PageHeader
        eyebrow={dateLabel}
        title={firstName ? `Hello, ${firstName}` : "Hello"}
        sub={
          allClasses.length === 0
            ? "No classes yet"
            : `${allClasses.length} ${allClasses.length === 1 ? "class" : "classes"}`
        }
        action={
          <Button asChild>
            <Link href="/classes/new">
              <PlusIcon size={16} /> New class
            </Link>
          </Button>
        }
      />

      {/* Headline stats (derived from what we actually load) */}
      <div className="mb-8 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatCard label="All classes" value={allClasses.length} />
        <StatCard label="Teaching" value={teaching.length} />
        <StatCard label="Attending" value={attending.length} />
        <Link href="/inbox" className="block">
          <StatCard
            label="Pending invites"
            value={pendingInvites}
            delta={pendingInvites > 0 ? "Review in inbox →" : "All caught up"}
            deltaTone={pendingInvites > 0 ? "accent" : "muted"}
          />
        </Link>
      </div>

      {allClasses.length === 0 ? (
        <EmptyState
          icon={<ClassesIcon size={20} />}
          title="No classes yet"
          description="Create your first class or wait for an invite from a tutor."
          action={
            <Button asChild>
              <Link href="/classes/new">
                <PlusIcon size={16} /> Create class
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <ClassGroup title="Classes I teach" classes={teaching} />
          <ClassGroup title="Classes I attend" classes={attending} />
          <ClassGroup title="Classes I observe" classes={observing} />
        </>
      )}
    </PageContainer>
  );
}
