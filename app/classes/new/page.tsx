"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

export default function NewClassPage() {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState("");
  const [description, setDescription] = useState("");
  const [cycleHours, setCycleHours] = useState("8");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentCurrency, setPaymentCurrency] = useState("GEL");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const inputStyle = {
    background: "#17150f",
    border: "0.5px solid var(--color-ss-border)",
    color: "var(--color-ss-text-secondary)",
  };

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const hours = parseInt(cycleHours) || 8;

    const { data: newClass, error: classError } = await supabase
      .from("classes")
      .insert({
        created_by: user.id,
        title,
        subject: subject || null,
        level: level || null,
        description: description || null,
        cycle_hours: hours,
      })
      .select()
      .single();

    if (classError) { setError(classError.message); setLoading(false); return; }

    const { error: memberError } = await supabase
      .from("class_members")
      .insert({ class_id: newClass.id, user_id: user.id, role: "tutor" });

    if (memberError) { setError(memberError.message); setLoading(false); return; }

    await supabase.from("payment_cycles").insert({
      class_id: newClass.id,
      cycle_number: 1,
      payment_amount: paymentAmount ? parseFloat(paymentAmount) : null,
      payment_currency: paymentCurrency,
    });

    router.push(`/classes/${newClass.id}/overview`);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center"
      style={{ background: "var(--color-ss-bg)" }}>

      <Link href="/dashboard" className="absolute top-6 left-6 flex items-center gap-1.5 text-[12px]"
        style={{ color: "var(--color-ss-text-faint)", textDecoration: "none", opacity: 0.8 }}
        onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
        onMouseLeave={e => (e.currentTarget.style.opacity = "0.8")}>
        ← Back
      </Link>

      <div className="mb-8 text-center">
        <div className="text-[24px] font-medium mb-1" style={{ color: "var(--color-ss-text-primary)" }}>
          Create a class
        </div>
        <div className="text-[13px]" style={{ color: "var(--color-ss-text-faint)" }}>
          Set up a new session space for your student
        </div>
      </div>

      <div className="w-[460px] rounded-xl p-8"
        style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}>
        <form onSubmit={handleCreate} className="flex flex-col gap-4">

          <div>
            <label className="text-[11px] mb-1.5 block" style={{ color: "var(--color-ss-text-faint)" }}>
              Class title <span style={{ color: "var(--color-ss-red)" }}>*</span>
            </label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} required
              placeholder="e.g. Ana — Math & Physics"
              className="w-full px-3 py-2 rounded-md text-[13px] outline-none" style={inputStyle} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] mb-1.5 block" style={{ color: "var(--color-ss-text-faint)" }}>
                Subject <span style={{ color: "var(--color-ss-text-ghost)" }}>(optional)</span>
              </label>
              <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
                placeholder="e.g. Math & Physics"
                className="w-full px-3 py-2 rounded-md text-[13px] outline-none" style={inputStyle} />
            </div>
            <div>
              <label className="text-[11px] mb-1.5 block" style={{ color: "var(--color-ss-text-faint)" }}>
                Level <span style={{ color: "var(--color-ss-text-ghost)" }}>(optional)</span>
              </label>
              <input type="text" value={level} onChange={e => setLevel(e.target.value)}
                placeholder="e.g. Grade 11"
                className="w-full px-3 py-2 rounded-md text-[13px] outline-none" style={inputStyle} />
            </div>
          </div>

          <div>
            <label className="text-[11px] mb-1.5 block" style={{ color: "var(--color-ss-text-faint)" }}>
              Description <span style={{ color: "var(--color-ss-text-ghost)" }}>(optional)</span>
            </label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              rows={3} placeholder="Any notes visible to all class members…"
              className="w-full px-3 py-2 rounded-md text-[13px] outline-none resize-none" style={inputStyle} />
          </div>

          <div>
            <label className="text-[11px] mb-1.5 block" style={{ color: "var(--color-ss-text-faint)" }}>
              Cycle hours
            </label>
            <input type="number" min={1} value={cycleHours} onChange={e => setCycleHours(e.target.value)}
              placeholder="e.g. 8"
              className="w-full px-3 py-2 rounded-md text-[13px] outline-none" style={inputStyle} />
            <div className="text-[11px] mt-1.5" style={{ color: "var(--color-ss-text-ghost)" }}>
              A new payment cycle starts every {cycleHours || "—"} completed hours.
            </div>
          </div>

          <div style={{ borderTop: "0.5px solid #2a2820", paddingTop: 12 }}>
            <label className="text-[11px] mb-1.5 block" style={{ color: "var(--color-ss-text-faint)" }}>
              Payment per cycle <span style={{ color: "var(--color-ss-text-ghost)" }}>(optional)</span>
            </label>
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

          <div className="flex gap-3 mt-1">
            <Link href="/dashboard"
              className="flex-1 text-center text-[13px] py-2.5 rounded-lg"
              style={{ color: "var(--color-ss-text-muted)", background: "#2a2820", border: "0.5px solid var(--color-ss-border)", textDecoration: "none" }}>
              Cancel
            </Link>
            <button type="submit" disabled={loading}
              className="flex-1 text-[13px] font-medium py-2.5 rounded-lg"
              style={{ background: "var(--color-ss-amber-light)", color: "#1c1a17", opacity: loading ? 0.6 : 1, cursor: "pointer" }}>
              {loading ? "Creating…" : "Create class"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}