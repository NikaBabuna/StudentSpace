"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="text-[13px] font-medium" style={{ color: "#d8c8a0" }}>{title}</div>
        {subtitle && <div className="text-[11px] mt-0.5" style={{ color: "#5a5248" }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function PersonRow({ name, label, onRemove, removing }: {
  name: string; label?: string; onRemove: () => void; removing: boolean;
}) {
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{ background: "#201e18", border: "0.5px solid #3a3630" }}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-medium shrink-0"
        style={{ background: "#2a2318", border: "1px solid #4a3a18", color: "#c8a050" }}>
        {name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px]" style={{ color: "#c8b890" }}>{name}</div>
        {label && <div className="text-[10px] mt-0.5" style={{ color: "#4a4438" }}>{label}</div>}
      </div>
      {!confirm ? (
        <button onClick={() => setConfirm(true)}
          className="text-[11px] px-2.5 py-1 rounded"
          style={{ color: "#7a5a48", background: "#1e1410", border: "0.5px solid #3a2010", cursor: "pointer" }}>
          Remove
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-[11px]" style={{ color: "#7a6050" }}>Sure?</span>
          <button onClick={() => setConfirm(false)}
            className="text-[11px] px-2 py-1 rounded"
            style={{ color: "#6a6050", background: "#2a2820", border: "0.5px solid #3a3630", cursor: "pointer" }}>
            No
          </button>
          <button onClick={onRemove} disabled={removing}
            className="text-[11px] px-2 py-1 rounded font-medium"
            style={{ background: "var(--color-ss-red)", color: "#fff", opacity: removing ? 0.6 : 1, cursor: "pointer" }}>
            {removing ? "…" : "Yes"}
          </button>
        </div>
      )}
    </div>
  );
}

function PendingRow({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{ background: "#17150f", border: "0.5px solid #2a2820" }}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-medium shrink-0"
        style={{ background: "#1e1c16", border: "1px solid #3a3630", color: "#6a6050" }}>
        {name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px]" style={{ color: "#8a8070" }}>{name}</div>
        <div className="text-[10px] mt-0.5" style={{ color: "#4a4438" }}>Request pending — awaiting their response</div>
      </div>
      <span className="text-[10px] px-2 py-0.5 rounded"
        style={{ background: "#2a2318", color: "#7a6040", border: "0.5px solid #4a3a18" }}>
        Pending
      </span>
    </div>
  );
}

export default function AccessClient({ userId, children, parents, sentRequests }: {
  userId: string;
  children: any[];
  parents: any[];
  sentRequests: any[];
}) {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [searching, setSearching] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  async function handleSendRequest(e: React.FormEvent) {
    e.preventDefault();
    setSearching(true);
    setSendError(null);
    setSendSuccess(false);

    // Find user by email
    const { data: found } = await supabase
      .from("users")
      .select("id, full_name")
      .eq("email", email.trim().toLowerCase())
      .single();

    if (!found) {
      setSendError("No account found with that email.");
      setSearching(false);
      return;
    }

    if (found.id === userId) {
      setSendError("You can't link yourself.");
      setSearching(false);
      return;
    }

    // Check if already linked
    const { data: existing } = await supabase
      .from("parent_students")
      .select("id")
      .eq("parent_id", userId)
      .eq("student_id", found.id)
      .single();

    if (existing) {
      setSendError("Already linked to this person.");
      setSearching(false);
      return;
    }

    // Check if request already pending
    const { data: existingReq } = await supabase
      .from("parent_requests")
      .select("id")
      .eq("parent_id", userId)
      .eq("student_id", found.id)
      .eq("status", "pending")
      .single();

    if (existingReq) {
      setSendError("A request is already pending.");
      setSearching(false);
      return;
    }

    const { error } = await supabase.from("parent_requests").insert({
      parent_id: userId,
      student_id: found.id,
      status: "pending",
    });

    setSearching(false);
    if (error) { setSendError(error.message); return; }
    setEmail("");
    setSendSuccess(true);
    router.refresh();
  }

  async function removeChild(studentId: string) {
    setRemoving(studentId);
    await supabase.from("parent_students")
      .delete()
      .eq("parent_id", userId)
      .eq("student_id", studentId);
    setRemoving(null);
    router.refresh();
  }

  async function removeParent(parentId: string) {
    setRemoving(parentId);
    await supabase.from("parent_students")
      .delete()
      .eq("parent_id", parentId)
      .eq("student_id", userId);
    setRemoving(null);
    router.refresh();
  }

  const inputStyle = {
    background: "#17150f",
    border: "0.5px solid var(--color-ss-border)",
    color: "var(--color-ss-text-secondary)",
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 py-4 shrink-0"
        style={{ borderBottom: "0.5px solid var(--color-ss-border)" }}>
        <h1 className="text-[16px] font-medium" style={{ color: "var(--color-ss-text-primary)" }}>Access & accounts</h1>
        <p className="text-[11px] mt-0.5" style={{ color: "#5a5248" }}>Manage parent-child links</p>
      </div>

      <div className="flex-1 overflow-auto p-6 flex flex-col gap-8 max-w-xl">

        {/* Link a child */}
        <Section title="Link a child" subtitle="Send a request to a student — they'll accept from their inbox.">
          <form onSubmit={handleSendRequest} className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setSendError(null); setSendSuccess(false); }}
                placeholder="Student's email address"
                required
                className="flex-1 px-3 py-2 rounded-md text-[13px] outline-none"
                style={inputStyle}
              />
              <button type="submit" disabled={searching}
                className="px-4 py-2 rounded-md text-[12px] font-medium shrink-0"
                style={{ background: "var(--color-ss-amber-light)", color: "#1c1a17", opacity: searching ? 0.6 : 1, cursor: "pointer" }}>
                {searching ? "…" : "Send request"}
              </button>
            </div>
            {sendError && (
              <div className="text-[12px] px-3 py-2 rounded-md"
                style={{ background: "var(--color-ss-red-bg)", color: "var(--color-ss-red)", border: "0.5px solid var(--color-ss-red-border)" }}>
                {sendError}
              </div>
            )}
            {sendSuccess && (
              <div className="text-[12px] px-3 py-2 rounded-md"
                style={{ background: "#10201a", color: "#40a870", border: "0.5px solid #1a4030" }}>
                Request sent — they'll see it in their inbox.
              </div>
            )}
          </form>

          {/* Pending sent requests */}
          {sentRequests.length > 0 && (
            <div className="flex flex-col gap-2 mt-1">
              {sentRequests.map(r => (
                <PendingRow key={r.id} name={r.student?.full_name ?? "Unknown"} />
              ))}
            </div>
          )}

          {/* Linked children */}
          {children.length > 0 && (
            <div className="flex flex-col gap-2 mt-1">
              {children.map(c => (
                <PersonRow
                  key={c.student.id}
                  name={c.student.full_name}
                  label="Linked child"
                  onRemove={() => removeChild(c.student.id)}
                  removing={removing === c.student.id}
                />
              ))}
            </div>
          )}

          {children.length === 0 && sentRequests.length === 0 && (
            <div className="text-[12px] px-3 py-2 rounded-md"
              style={{ background: "#17150f", color: "#4a4438", border: "0.5px solid #2a2820" }}>
              No children linked yet.
            </div>
          )}
        </Section>

        {/* Your parents */}
        <Section title="Your parents" subtitle="People who are linked as your parent. You can remove them at any time.">
          {parents.length === 0 ? (
            <div className="text-[12px] px-3 py-2 rounded-md"
              style={{ background: "#17150f", color: "#4a4438", border: "0.5px solid #2a2820" }}>
              No parents linked.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {parents.map(p => (
                <PersonRow
                  key={p.parent.id}
                  name={p.parent.full_name}
                  label="Linked parent"
                  onRemove={() => removeParent(p.parent.id)}
                  removing={removing === p.parent.id}
                />
              ))}
            </div>
          )}
        </Section>

      </div>
    </div>
  );
}