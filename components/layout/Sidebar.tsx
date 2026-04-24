"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useState } from "react";
import { createPortal } from "react-dom";

interface NavItem {
  label: string;
  href: string;
  badge?: number;
}

interface SidebarProps {
  mode: "dashboard" | "session";
  student?: {
    id: string;
    name: string;
    initials: string;
    grade: string;
    cycleNumber: number;
    cycleHours: number;
    cycleTotal: number;
    subject?: string | null;
    level?: string | null;
    description?: string | null;
    tutor_notes?: string | null;
    cycleHoursTarget?: number;
    isCreator?: boolean;
  };
  tutorInitials?: string;
  tutorName?: string;
  role?: "tutor" | "student" | "parent" | "employer";
}

const dashboardNav: NavItem[] = [
  { label: "My classes", href: "/dashboard" },
  { label: "Analytics", href: "/dashboard/analytics" },
  { label: "Inbox", href: "/inbox" },
];

const dashboardSettingsNav: NavItem[] = [
  { label: "Access & accounts", href: "/settings/access" },
  { label: "Preferences", href: "/settings/preferences" },
];

// ─── Class settings modal ────────────────────────────────────────────────────

function ClassSettingsModal({
  classId,
  initialName,
  initialSubject,
  initialLevel,
  initialDescription,
  initialTutorNotes,
  initialCycleHours,
  isCreator,
  onClose,
}: {
  classId: string;
  initialName: string;
  initialSubject: string | null | undefined;
  initialLevel: string | null | undefined;
  initialDescription: string | null | undefined;
  initialTutorNotes: string | null | undefined;
  initialCycleHours: number;
  isCreator: boolean;
  onClose: () => void;
}) {
  const supabase = createClient();
  const router = useRouter();

  const [name, setName] = useState(initialName);
  const [subject, setSubject] = useState(initialSubject ?? "");
  const [level, setLevel] = useState(initialLevel ?? "");
  const [description, setDescription] = useState(initialDescription ?? "");
  const [tutorNotes, setTutorNotes] = useState(initialTutorNotes ?? "");
  const [cycleHours, setCycleHours] = useState(String(initialCycleHours));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const inputStyle = {
    background: "#17150f",
    border: "0.5px solid var(--color-ss-border)",
    color: "var(--color-ss-text-secondary)",
  };

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    const { error } = await supabase
      .from("classes")
      .update({
        title: name.trim(),
        subject: subject.trim() || null,
        level: level.trim() || null,
        description: description.trim() || null,
        tutor_notes: tutorNotes.trim() || null,
        cycle_hours: parseInt(cycleHours) || initialCycleHours,
      })
      .eq("id", classId);
    setSaving(false);
    if (error) { setSaveError(error.message); return; }
    onClose();
    router.refresh();
  }

  async function handleLeave() {
    setLeaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from("class_members").delete().eq("class_id", classId).eq("user_id", user.id);
    router.push("/dashboard");
  }

  async function handleDelete() {
    setDeleting(true);
    await supabase.from("lessons").update({ deleted_at: new Date().toISOString() }).eq("class_id", classId);
    await supabase.from("homework").update({ deleted_at: new Date().toISOString() }).eq("class_id", classId);
    await supabase.from("materials").update({ deleted_at: new Date().toISOString() }).eq("class_id", classId);
    await supabase.from("material_groups").update({ deleted_at: new Date().toISOString() }).eq("class_id", classId);
    await supabase.from("class_members").delete().eq("class_id", classId);
    await supabase.from("classes").update({ deleted_at: new Date().toISOString() } as any).eq("id", classId);
    router.push("/dashboard");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-[440px] rounded-xl max-h-[90vh] flex flex-col"
        style={{ background: "#201e18", border: "0.5px solid var(--color-ss-border)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: "0.5px solid #2a2820" }}>
          <div className="text-[14px] font-medium" style={{ color: "var(--color-ss-text-primary)" }}>
            Class settings
          </div>
          <button onClick={onClose} className="text-[14px]" style={{ color: "#5a5248" }}>✕</button>
        </div>

        <div className="p-5 flex flex-col gap-4 overflow-y-auto">
          {isCreator ? (
            <>
              <form onSubmit={handleSave} className="flex flex-col gap-3">
                <div>
                  <label className="text-[11px] mb-1 block" style={{ color: "var(--color-ss-text-faint)" }}>Title</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} required
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

                {saveError && (
                  <div className="text-[12px] px-3 py-2 rounded-md"
                    style={{ background: "var(--color-ss-red-bg)", color: "var(--color-ss-red)", border: "0.5px solid var(--color-ss-red-border)" }}>
                    {saveError}
                  </div>
                )}

                <button type="submit" disabled={saving}
                  className="w-full py-2 rounded-md text-[13px] font-medium"
                  style={{ background: "var(--color-ss-amber-light)", color: "#1c1a17", opacity: saving ? 0.6 : 1 }}>
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </form>

              <div style={{ height: "0.5px", background: "#2a2820" }} />

              <div className="flex flex-col gap-2">
                {!confirmLeave ? (
                  <button onClick={() => setConfirmLeave(true)}
                    className="w-full py-2 rounded-md text-[13px]"
                    style={{ color: "var(--color-ss-text-muted)", background: "#2a2820", border: "0.5px solid var(--color-ss-border)" }}>
                    Leave class
                  </button>
                ) : (
                  <div className="rounded-md p-3 flex flex-col gap-2"
                    style={{ background: "#1e1c16", border: "0.5px solid #3a3630" }}>
                    <div className="text-[12px]" style={{ color: "var(--color-ss-text-faint)" }}>
                      Leave this class? You'll lose access unless re-invited.
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setConfirmLeave(false)}
                        className="flex-1 py-1.5 rounded text-[12px]"
                        style={{ color: "var(--color-ss-text-muted)", background: "#2a2820", border: "0.5px solid var(--color-ss-border)" }}>
                        Cancel
                      </button>
                      <button onClick={handleLeave} disabled={leaving}
                        className="flex-1 py-1.5 rounded text-[12px] font-medium"
                        style={{ background: "var(--color-ss-red)", color: "#fff", opacity: leaving ? 0.6 : 1 }}>
                        {leaving ? "Leaving…" : "Yes, leave"}
                      </button>
                    </div>
                  </div>
                )}

                {!confirmDelete ? (
                  <button onClick={() => setConfirmDelete(true)}
                    className="w-full py-2 rounded-md text-[13px]"
                    style={{ color: "var(--color-ss-red)", background: "var(--color-ss-red-bg)", border: "0.5px solid var(--color-ss-red-border)" }}>
                    Delete class
                  </button>
                ) : (
                  <div className="rounded-md p-3 flex flex-col gap-2"
                    style={{ background: "#1a0c0c", border: "0.5px solid #4a1818" }}>
                    <div className="text-[12px]" style={{ color: "#c08080" }}>
                      Permanently delete this class, all lessons, homework, and materials? This cannot be undone.
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setConfirmDelete(false)}
                        className="flex-1 py-1.5 rounded text-[12px]"
                        style={{ color: "var(--color-ss-text-muted)", background: "#2a2820", border: "0.5px solid var(--color-ss-border)" }}>
                        Cancel
                      </button>
                      <button onClick={handleDelete} disabled={deleting}
                        className="flex-1 py-1.5 rounded text-[12px] font-medium"
                        style={{ background: "var(--color-ss-red)", color: "#fff", opacity: deleting ? 0.6 : 1 }}>
                        {deleting ? "Deleting…" : "Yes, delete"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="text-[13px]" style={{ color: "var(--color-ss-text-faint)" }}>
                You are a member of this class.
              </div>
              {!confirmLeave ? (
                <button onClick={() => setConfirmLeave(true)}
                  className="w-full py-2 rounded-md text-[13px]"
                  style={{ color: "var(--color-ss-red)", background: "var(--color-ss-red-bg)", border: "0.5px solid var(--color-ss-red-border)" }}>
                  Leave class
                </button>
              ) : (
                <div className="rounded-md p-3 flex flex-col gap-2"
                  style={{ background: "#1e1c16", border: "0.5px solid #3a3630" }}>
                  <div className="text-[12px]" style={{ color: "var(--color-ss-text-faint)" }}>
                    Leave this class? You'll lose access unless re-invited.
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setConfirmLeave(false)}
                      className="flex-1 py-1.5 rounded text-[12px]"
                      style={{ color: "var(--color-ss-text-muted)", background: "#2a2820", border: "0.5px solid var(--color-ss-border)" }}>
                      Cancel
                    </button>
                    <button onClick={handleLeave} disabled={leaving}
                      className="flex-1 py-1.5 rounded text-[12px] font-medium"
                      style={{ background: "var(--color-ss-red)", color: "#fff", opacity: leaving ? 0.6 : 1 }}>
                      {leaving ? "Leaving…" : "Yes, leave"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Sidebar ────────────────────────────────────────────────────────────

export default function Sidebar({
  mode,
  student,
  tutorInitials = "TN",
  tutorName = "",
  role = "tutor",
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [signingOut, setSigningOut] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/login");
  }

  const sessionNav: NavItem[] = student
    ? [
        { label: "Overview",  href: `/classes/${student.id}/overview` },
        { label: "Homework",  href: `/classes/${student.id}/homework` },
        { label: "Schedule",  href: `/classes/${student.id}/schedule` },
        { label: "Materials", href: `/classes/${student.id}/materials` },
        { label: "Chat",      href: `/classes/${student.id}/chat` },
      ]
    : [];

  const cyclePercent = student
    ? Math.min(Math.round((student.cycleHours / student.cycleTotal) * 100), 100)
    : 0;

  return (
    <>
      <aside className="w-[220px] shrink-0 flex flex-col" style={{
        background: "var(--color-ss-sidebar)",
        borderRight: "0.5px solid var(--color-ss-border)",
      }}>
        {/* Logo → dashboard */}
        <Link href="/dashboard"
          className="px-5 py-5 hover:opacity-75 transition-opacity"
          style={{ borderBottom: "0.5px solid var(--color-ss-border)", textDecoration: "none" }}>
          <div className="text-[15px] font-medium" style={{ color: "var(--color-ss-text-primary)" }}>
            StudentSpace
          </div>
        </Link>

        {/* Session mode */}
        {mode === "session" && student && (
          <>
            <Link href="/dashboard"
              className="flex items-center gap-1.5 px-5 py-3 text-[12px] hover:opacity-80"
              style={{ color: "var(--color-ss-text-faint)" }}>
              <span>←</span> All classes
            </Link>

            <div className="px-5 pb-4" style={{ borderBottom: "0.5px solid var(--color-ss-border)" }}>
              <div className="w-[42px] h-[42px] rounded-full flex items-center justify-center text-[14px] font-medium mb-2"
                style={{ background: "var(--color-ss-orange-bg)", border: "1px solid var(--color-ss-orange-border)", color: "var(--color-ss-orange)" }}>
                {student.initials}
              </div>

              <div className="flex items-center gap-1.5">
                <div className="text-[14px] font-medium flex-1 min-w-0 truncate" style={{ color: "#d8c8a0" }}>
                  {student.name}
                </div>
                <button
                  onClick={() => setShowSettings(true)}
                  className="shrink-0 w-6 h-6 flex items-center justify-center rounded text-[13px] transition-colors"
                  style={{ color: "#7a6a40", background: "#2a2318", border: "0.5px solid #4a3a18" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "var(--color-ss-amber-light)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#7a6a40")}
                  title="Class settings"
                >
                  ⚙
                </button>
              </div>

              {student.grade && (
                <div className="text-[11px] mt-0.5" style={{ color: "var(--color-ss-text-faint)" }}>{student.grade}</div>
              )}
            </div>

            {/* Payment cycle */}
            <div className="mx-5 my-4 rounded-md p-3" style={{
              background: "var(--color-ss-bg-secondary)",
              border: "0.5px solid var(--color-ss-border)",
            }}>
              <div className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: "var(--color-ss-text-ghost)" }}>
                Payment cycle
              </div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[13px] font-medium" style={{ color: "#d8c8a0" }}>
                  Cycle {student.cycleNumber}
                </span>
                <span className="text-[12px]" style={{ color: "#9a8060" }}>
                  {student.cycleHours} / {student.cycleTotal}h
                </span>
              </div>
              <div className="h-[5px] rounded-full overflow-hidden" style={{ background: "#2a2820" }}>
                <div className="h-full rounded-full"
                  style={{ background: "var(--color-ss-amber)", width: `${cyclePercent}%` }} />
              </div>
            </div>
          </>
        )}

        {/* Nav */}
        <nav className="flex flex-col gap-0 px-3 flex-1">
          {mode === "dashboard" && (
            <>
              <NavSection label="Main" items={dashboardNav} pathname={pathname} />
              <NavSection label="Settings" items={dashboardSettingsNav} pathname={pathname} />
            </>
          )}
          {mode === "session" && (
            <NavSection label="Session" items={sessionNav} pathname={pathname} />
          )}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4" style={{ borderTop: "0.5px solid var(--color-ss-border)" }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-[28px] h-[28px] rounded-full flex items-center justify-center text-[10px] font-medium shrink-0"
              style={{ background: "#3a2e1a", border: "1px solid #6a5530", color: "var(--color-ss-amber-light)" }}>
              {tutorInitials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium truncate" style={{ color: "#b0a080" }}>{tutorName}</div>
            </div>
          </div>
          <button onClick={handleSignOut} disabled={signingOut}
            className="w-full text-[11px] py-1.5 rounded-md"
            style={{
              background: "#2a2820",
              color: "var(--color-ss-text-faint)",
              border: "0.5px solid var(--color-ss-border)",
              opacity: signingOut ? 0.6 : 1,
            }}>
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>

      {showSettings && student && typeof document !== "undefined" && createPortal(
        <ClassSettingsModal
          classId={student.id}
          initialName={student.name}
          initialSubject={student.subject}
          initialLevel={student.level}
          initialDescription={student.description}
          initialTutorNotes={student.tutor_notes}
          initialCycleHours={student.cycleHoursTarget ?? student.cycleTotal}
          isCreator={student.isCreator ?? false}
          onClose={() => setShowSettings(false)}
        />,
        document.body
      )}
    </>
  );
}

function NavSection({ label, items, pathname }: { label: string; items: NavItem[]; pathname: string }) {
  return (
    <div className="mb-4">
      <div className="text-[10px] uppercase tracking-widest px-2 mb-1" style={{ color: "#5a5248" }}>
        {label}
      </div>
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link key={item.href} href={item.href}
            className="flex items-center gap-2 px-2.5 py-[7px] rounded-md text-[13px]"
            style={{
              background: active ? "#2a2318" : "transparent",
              color: active ? "var(--color-ss-amber-light)" : "var(--color-ss-text-muted)",
            }}>
            <span className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: active ? "var(--color-ss-amber-light)" : "#5a5248" }} />
            {item.label}
            {item.badge ? (
              <span className="ml-auto text-[10px] font-medium rounded-full px-1.5 py-0.5"
                style={{ background: "#3a2010", color: "#c87a30" }}>
                {item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
