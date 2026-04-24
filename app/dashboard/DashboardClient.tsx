"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

function LangToggle() {
  const [lang, setLang] = useState<"EN" | "GE">("EN");
  return (
    <div className="flex rounded-md overflow-hidden"
      style={{ border: "0.5px solid var(--color-ss-border)" }}>
      {(["EN", "GE"] as const).map(l => (
        <button key={l} onClick={() => setLang(l)}
          className="text-[11px] px-3 py-1.5"
          style={{
            background: lang === l ? "#2a2318" : "#17150f",
            color: lang === l ? "var(--color-ss-amber-light)" : "var(--color-ss-text-ghost)",
            borderRight: l === "EN" ? "0.5px solid var(--color-ss-border)" : "none",
            fontFamily: "inherit", cursor: "pointer",
          }}>
          {l}
        </button>
      ))}
    </div>
  );
}

// ─── Edit modal ───────────────────────────────────────────────────────────────

function EditClassModal({ cls, onClose }: { cls: any; onClose: () => void }) {
  const supabase = createClient();
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

  const inputStyle = {
    background: "#17150f",
    border: "0.5px solid var(--color-ss-border)",
    color: "var(--color-ss-text-secondary)",
  };

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    const { error: dbErr } = await supabase.from("classes").update({
      title: title.trim(),
      subject: subject.trim() || null,
      level: level.trim() || null,
      description: description.trim() || null,
      tutor_notes: tutorNotes.trim() || null,
      cycle_hours: parseInt(cycleHours) || cls.cycle_hours,
    }).eq("id", cls.id);

    if (!dbErr && paymentAmount) {
      // Update open cycle payment info
      await supabase.from("payment_cycles").update({
        payment_amount: parseFloat(paymentAmount) || null,
        payment_currency: paymentCurrency,
      }).eq("class_id", cls.id).is("closed_at", null);
    }

    setSaving(false);
    if (dbErr) { setError(dbErr.message); return; }
    onClose();
    router.refresh();
  }

  async function handleDelete() {
    setDeleting(true);
    await supabase.from("lessons").update({ deleted_at: new Date().toISOString() }).eq("class_id", cls.id);
    await supabase.from("homework").update({ deleted_at: new Date().toISOString() }).eq("class_id", cls.id);
    await supabase.from("materials").update({ deleted_at: new Date().toISOString() }).eq("class_id", cls.id);
    await supabase.from("material_groups").update({ deleted_at: new Date().toISOString() }).eq("class_id", cls.id);
    await supabase.from("class_members").delete().eq("class_id", cls.id);
    await supabase.from("classes").update({ deleted_at: new Date().toISOString() } as any).eq("id", cls.id);
    router.push("/dashboard");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-[440px] rounded-xl max-h-[90vh] flex flex-col"
        style={{ background: "#201e18", border: "0.5px solid var(--color-ss-border)" }}>

        <div className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: "0.5px solid #2a2820" }}>
          <div className="text-[14px] font-medium" style={{ color: "var(--color-ss-text-primary)" }}>
            Edit class
          </div>
          <button onClick={onClose} style={{ color: "#5a5248", background: "none", border: "none", cursor: "pointer", fontSize: 14 }}>✕</button>
        </div>

        <div className="p-5 flex flex-col gap-3 overflow-y-auto">
          <form onSubmit={handleSave} className="flex flex-col gap-3">
            <div>
              <label className="text-[11px] mb-1 block" style={{ color: "var(--color-ss-text-faint)" }}>Title</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} required
                className="w-full px-3 py-2 rounded-md text-[13px] outline-none" style={inputStyle} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] mb-1 block" style={{ color: "var(--color-ss-text-faint)" }}>
                  Subject <span style={{ color: "var(--color-ss-text-ghost)" }}>(optional)</span>
                </label>
                <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
                  placeholder="e.g. Physics"
                  className="w-full px-3 py-2 rounded-md text-[13px] outline-none" style={inputStyle} />
              </div>
              <div>
                <label className="text-[11px] mb-1 block" style={{ color: "var(--color-ss-text-faint)" }}>
                  Level <span style={{ color: "var(--color-ss-text-ghost)" }}>(optional)</span>
                </label>
                <input type="text" value={level} onChange={e => setLevel(e.target.value)}
                  placeholder="e.g. Grade 10"
                  className="w-full px-3 py-2 rounded-md text-[13px] outline-none" style={inputStyle} />
              </div>
            </div>

            <div>
              <label className="text-[11px] mb-1 block" style={{ color: "var(--color-ss-text-faint)" }}>
                Description <span style={{ color: "var(--color-ss-text-ghost)" }}>(optional)</span>
              </label>
              <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)}
                placeholder="What is this class about?"
                className="w-full px-3 py-2 rounded-md text-[13px] outline-none resize-none" style={inputStyle} />
            </div>

            <div>
              <label className="text-[11px] mb-1 block" style={{ color: "var(--color-ss-text-faint)" }}>
                Tutor notes <span style={{ color: "var(--color-ss-text-ghost)" }}>(optional)</span>
              </label>
              <textarea rows={2} value={tutorNotes} onChange={e => setTutorNotes(e.target.value)}
                placeholder="Private notes visible only to you…"
                className="w-full px-3 py-2 rounded-md text-[13px] outline-none resize-none" style={inputStyle} />
            </div>

            <div>
              <label className="text-[11px] mb-1 block" style={{ color: "var(--color-ss-text-faint)" }}>Cycle hours</label>
              <input type="number" min={1} value={cycleHours} onChange={e => setCycleHours(e.target.value)}
                className="w-full px-3 py-2 rounded-md text-[13px] outline-none" style={inputStyle} />
            </div>

            {/* Payment */}
            <div style={{ borderTop: "0.5px solid #2a2820", paddingTop: 12 }}>
              <div className="text-[11px] mb-2" style={{ color: "var(--color-ss-text-faint)" }}>
                Payment per cycle <span style={{ color: "var(--color-ss-text-ghost)" }}>(optional)</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" min={0} value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)}
                  placeholder="e.g. 200"
                  className="w-full px-3 py-2 rounded-md text-[13px] outline-none" style={inputStyle} />
                <select value={paymentCurrency} onChange={e => setPaymentCurrency(e.target.value)}
                  className="w-full px-3 py-2 rounded-md text-[13px] outline-none"
                  style={{ ...inputStyle, fontFamily: "inherit", cursor: "pointer" }}>
                  <option value="GEL">GEL — Lari</option>
                  <option value="USD">USD — Dollar</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="RUB">RUB — Ruble</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="text-[12px] px-3 py-2 rounded-md"
                style={{ background: "var(--color-ss-red-bg)", color: "var(--color-ss-red)", border: "0.5px solid var(--color-ss-red-border)" }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={saving}
              className="w-full py-2 rounded-md text-[13px] font-medium"
              style={{ background: "var(--color-ss-amber-light)", color: "#1c1a17", opacity: saving ? 0.6 : 1, cursor: "pointer" }}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </form>

          <div style={{ borderTop: "0.5px solid #2a2820", paddingTop: 12 }}>
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)}
                className="w-full py-2 rounded-md text-[13px]"
                style={{ color: "var(--color-ss-red)", background: "var(--color-ss-red-bg)", border: "0.5px solid var(--color-ss-red-border)", cursor: "pointer" }}>
                Delete class
              </button>
            ) : (
              <div className="rounded-md p-3 flex flex-col gap-2"
                style={{ background: "#1a0c0c", border: "0.5px solid #4a1818" }}>
                <div className="text-[12px]" style={{ color: "#c08080" }}>
                  Permanently delete this class and all its data? This cannot be undone.
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmDelete(false)}
                    className="flex-1 py-1.5 rounded text-[12px]"
                    style={{ color: "var(--color-ss-text-muted)", background: "#2a2820", border: "0.5px solid var(--color-ss-border)", cursor: "pointer" }}>
                    Cancel
                  </button>
                  <button onClick={handleDelete} disabled={deleting}
                    className="flex-1 py-1.5 rounded text-[12px] font-medium"
                    style={{ background: "var(--color-ss-red)", color: "#fff", opacity: deleting ? 0.6 : 1, cursor: "pointer" }}>
                    {deleting ? "Deleting…" : "Yes, delete"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Class card ───────────────────────────────────────────────────────────────

function ClassCard({ cls, index, avatarColors, roleConfig, userId }: {
  cls: any; index: number; avatarColors: any[]; roleConfig: any; userId: string;
}) {
  const colors = avatarColors[index % avatarColors.length];
  const initials = cls.title.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
  const role = roleConfig[cls.role as keyof typeof roleConfig];
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

  const canEdit = cls.isCreator;

  return (
    <>
      <div className="rounded-xl p-4"
        style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}>

        {/* Header row */}
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-medium shrink-0"
            style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}>
            {initials}
          </div>
          <Link href={`/classes/${cls.id}/overview`} className="flex-1 min-w-0" style={{ textDecoration: "none" }}>
            <div className="text-[14px] font-medium truncate" style={{ color: "#d8c8a0" }}>{cls.title}</div>
            <div className="text-[11px] mt-0.5" style={{ color: "var(--color-ss-text-faint)" }}>
              {[cls.subject, cls.level].filter(Boolean).join(" · ") || "No subject set"}
            </div>
          </Link>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded shrink-0"
            style={{ background: "#2a2318", color: role.color, border: "0.5px solid #4a3a18" }}>
            {role.label}
          </span>
          {canEdit && (
            <div ref={menuRef} className="relative shrink-0">
              <button
                onClick={() => setShowMenu(m => !m)}
                className="w-6 h-6 flex items-center justify-center rounded text-[15px]"
                style={{ color: "#5a5248", background: "transparent", border: "none", cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#9a8060")}
                onMouseLeave={e => (e.currentTarget.style.color = "#5a5248")}
              >
                ⋯
              </button>
              {showMenu && (
                <div className="absolute right-0 top-8 rounded-lg overflow-hidden"
                  style={{ background: "#201e18", border: "0.5px solid #3a3630", minWidth: 120, zIndex: 50 }}>
                  <button
                    onClick={() => { setShowMenu(false); setShowEdit(true); }}
                    className="w-full text-left px-3 py-2 text-[12px]"
                    style={{ color: "#c8b890", background: "transparent", border: "none", cursor: "pointer", display: "block" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#2a2318")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    Edit class
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Badges */}
        <Link href={`/classes/${cls.id}/overview`} style={{ textDecoration: "none", display: "block" }}>
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[10px] font-medium px-2 py-0.5 rounded"
              style={{ background: "#17150f", color: "var(--color-ss-text-ghost)", border: "0.5px solid var(--color-ss-border)" }}>
              {cls.cycle_hours}h cycle
            </span>
            {cls.paymentAmount && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded"
                style={{ background: "#17150f", color: "#7a7060", border: "0.5px solid var(--color-ss-border)" }}>
                {cls.paymentAmount} {cls.paymentCurrency}/cycle
              </span>
            )}
            {cls.member_count > 1 && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded"
                style={{ background: "#17150f", color: "var(--color-ss-text-ghost)", border: "0.5px solid var(--color-ss-border)" }}>
                {cls.member_count} members
              </span>
            )}
          </div>
        </Link>
      </div>

      {showEdit && <EditClassModal cls={cls} onClose={() => setShowEdit(false)} />}
    </>
  );
}

function ClassGroup({ title, classes, avatarColors, roleConfig, userId }: {
  title: string; classes: any[]; avatarColors: any[]; roleConfig: any; userId: string;
}) {
  if (classes.length === 0) return null;
  return (
    <div className="mb-8">
      <div className="text-[12px] uppercase tracking-wider mb-3" style={{ color: "var(--color-ss-text-faint)" }}>{title}</div>
      <div className="grid grid-cols-2 gap-3">
        {classes.map((cls, i) => (
          <ClassCard key={cls.id} cls={cls} index={i} avatarColors={avatarColors} roleConfig={roleConfig} userId={userId} />
        ))}
      </div>
    </div>
  );
}

export default function DashboardClient({
  userId, firstName, allClasses, teaching, attending, observing,
  pendingInvites, avatarColors, roleConfig,
}: {
  userId: string;
  firstName: string;
  fullName: string;
  allClasses: any[];
  teaching: any[];
  attending: any[];
  observing: any[];
  pendingInvites: number;
  avatarColors: any[];
  roleConfig: any;
}) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 shrink-0"
        style={{ borderBottom: "0.5px solid var(--color-ss-border)" }}>
        <div>
          <h1 className="text-[18px] font-medium" style={{ color: "var(--color-ss-text-primary)" }}>
            {firstName ? `Hello, ${firstName}` : "Hello"}
          </h1>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--color-ss-text-faint)" }}>
            {allClasses.length === 0 ? "No classes yet" : `${allClasses.length} ${allClasses.length === 1 ? "class" : "classes"}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <LangToggle />
          {pendingInvites > 0 && (
            <Link href="/inbox"
              className="text-[12px] font-medium px-3 py-1.5 rounded-md flex items-center gap-1.5"
              style={{ background: "#2a2040", color: "var(--color-ss-purple)", border: "0.5px solid #4a3a70", textDecoration: "none" }}>
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-medium"
                style={{ background: "var(--color-ss-purple)", color: "#1c1a17" }}>
                {pendingInvites}
              </span>
              Invites
            </Link>
          )}
          <Link href="/classes/new"
            className="text-[13px] font-medium px-3.5 py-[7px] rounded-md"
            style={{ background: "var(--color-ss-amber-light)", color: "#1c1a17", textDecoration: "none" }}>
            + Create class
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {allClasses.length === 0 && (
          <div className="rounded-xl p-10 text-center"
            style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}>
            <div className="text-[14px] font-medium mb-2" style={{ color: "var(--color-ss-text-muted)" }}>No classes yet</div>
            <div className="text-[12px] mb-5" style={{ color: "var(--color-ss-text-faint)" }}>
              Create your first class or wait for an invite from a tutor.
            </div>
            <Link href="/classes/new"
              className="inline-block text-[13px] font-medium px-4 py-2 rounded-lg"
              style={{ background: "var(--color-ss-amber-light)", color: "#1c1a17", textDecoration: "none" }}>
              + Create class
            </Link>
          </div>
        )}
        <ClassGroup title="Classes I teach"   classes={teaching}  avatarColors={avatarColors} roleConfig={roleConfig} userId={userId} />
        <ClassGroup title="Classes I attend"  classes={attending} avatarColors={avatarColors} roleConfig={roleConfig} userId={userId} />
        <ClassGroup title="Classes I observe" classes={observing} avatarColors={avatarColors} roleConfig={roleConfig} userId={userId} />
      </div>
    </div>
  );
}