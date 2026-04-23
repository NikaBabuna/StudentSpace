import Link from "next/link";

const student = {
  id: "1",
  name: "Ana Svanidze",
};

const stats = [
  { label: "Total lessons", value: "18", sub: "since start" },
  { label: "Hours completed", value: "21", sub: "across 3 cycles" },
  { label: "Homework done", value: "7/9", sub: "2 pending" },
  { label: "Missed lessons", value: "2", sub: "1 makeup pending" },
];

const homeworkItems = [
  { name: "Vectors — exercises 3.1 to 3.5", due: "Due Mon Apr 28", status: "pending" },
  { name: "Newton's laws — summary sheet", due: "Due Wed Apr 30", status: "pending" },
  { name: "Kinematics — problem set 2", due: "Due Apr 17", status: "submitted" },
];

const recentMessages = [
  { initials: "AS", role: "student", sender: "Ana", text: "I'm stuck on 3.3, the angle part. Can we go over it?", time: "20:11", colorBg: "#2a1e10", colorText: "#e8a060" },
  { initials: "TN", role: "tutor", sender: "Tutor", text: "Of course, we'll start with that. Don't worry about it.", time: "20:30", colorBg: "#3a2e1a", colorText: "#e8c87a" },
  { initials: "P", role: "parent", sender: "Parent", text: "Is the Thursday lesson still at 17:00?", time: "18:05", colorBg: "#10203a", colorText: "#60a8e8" },
];

const materials = [
  { name: "Vectors — reference sheet", added: "Apr 20", type: "PDF" },
  { name: "Newton's laws — formula card", added: "Apr 15", type: "PDF" },
  { name: "Kinematics cheat sheet", added: "Mar 30", type: "PDF" },
];

function StatusBadge({ status }: { status: string }) {
  if (status === "submitted") {
    return (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0"
        style={{ background: "var(--color-ss-green-bg)", color: "var(--color-ss-green)", border: "0.5px solid var(--color-ss-green-border)" }}>
        Submitted
      </span>
    );
  }
  return (
    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0"
      style={{ background: "#2a1e10", color: "#c87a30", border: "0.5px solid #4a3010" }}>
      Pending
    </span>
  );
}

export default async function OverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between mb-5">
  <div className="text-[12px] uppercase tracking-wider" style={{ color: "var(--color-ss-text-faint)" }}>
    Overview
  </div>
  <Link
    href={`/classes/${params?.id}/invite`}
    className="text-[12px] font-medium px-3 py-1.5 rounded"
    style={{ color: "var(--color-ss-amber-light)", background: "var(--color-ss-amber-dim)", border: "0.5px solid var(--color-ss-amber-border)" }}
  >
    + Invite someone
  </Link>
</div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg p-4"
            style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}>
            <div className="text-[11px] mb-1" style={{ color: "var(--color-ss-text-faint)" }}>{s.label}</div>
            <div className="text-[22px] font-medium" style={{ color: "var(--color-ss-text-primary)" }}>{s.value}</div>
            <div className="text-[10px] mt-1" style={{ color: "var(--color-ss-text-ghost)" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Makeup alert */}
      <div className="rounded-xl p-4 flex items-center gap-3"
        style={{ background: "#1a1828", border: "0.5px solid #3a3060" }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[14px] font-medium"
          style={{ background: "#2a2040", border: "1px solid #4a3a70", color: "var(--color-ss-purple)" }}>
          !
        </div>
        <div className="flex-1">
          <div className="text-[13px] font-medium" style={{ color: "#b0a0d8" }}>
            1 missed lesson has no makeup scheduled
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: "#6a6080" }}>
            Sat Mar 8 · Physics, 1 hour — no replacement lesson yet
          </div>
        </div>
        <Link href={`/students/${id}/schedule`}
          className="text-[12px] px-3 py-1.5 rounded shrink-0"
          style={{ color: "var(--color-ss-purple)", background: "#2a2040", border: "0.5px solid #4a3a70" }}>
          Schedule makeup →
        </Link>
      </div>

      {/* Two column row 1: next lesson + homework */}
      <div className="grid grid-cols-2 gap-3">

        {/* Next lesson */}
        <div className="rounded-xl overflow-hidden"
          style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}>
          <div className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "0.5px solid var(--color-ss-border-subtle)" }}>
            <div className="text-[12px] font-medium uppercase tracking-wider" style={{ color: "var(--color-ss-text-muted)" }}>
              Next lesson
            </div>
            <Link href={`/students/${id}/schedule`} className="text-[11px]" style={{ color: "#7a6a40" }}>
              View schedule →
            </Link>
          </div>
          <div className="px-4 py-3.5">
            <div className="text-[18px] font-medium mb-0.5" style={{ color: "var(--color-ss-text-primary)" }}>
              Thursday, Apr 24
            </div>
            <div className="text-[13px] mb-3" style={{ color: "#9a8060" }}>
              17:00 – 19:00 · 2 hours
            </div>
            <div className="flex gap-1.5">
              {["Math", "in 2 days"].map((b) => (
                <span key={b} className="text-[10px] font-medium px-2 py-0.5 rounded"
                  style={{ background: "#2a2318", color: "var(--color-ss-amber)", border: "0.5px solid #4a3a18" }}>
                  {b}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Homework */}
        <div className="rounded-xl overflow-hidden"
          style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}>
          <div className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "0.5px solid var(--color-ss-border-subtle)" }}>
            <div className="text-[12px] font-medium uppercase tracking-wider" style={{ color: "var(--color-ss-text-muted)" }}>
              Homework
            </div>
            <Link href={`/students/${id}/homework`} className="text-[11px]" style={{ color: "#7a6a40" }}>
              View all →
            </Link>
          </div>
          <div>
            {homeworkItems.map((h, i) => (
              <div key={h.name} className="flex items-center gap-2.5 px-4 py-2.5"
                style={{ borderBottom: i < homeworkItems.length - 1 ? "0.5px solid #252320" : "none" }}>
                <div className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: h.status === "submitted" ? "var(--color-ss-green)" : "#c87a30" }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] truncate" style={{ color: "#c8b890" }}>{h.name}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: "var(--color-ss-text-ghost)" }}>{h.due}</div>
                </div>
                <StatusBadge status={h.status} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Two column row 2: recent chat + materials */}
      <div className="grid grid-cols-2 gap-3">

        {/* Recent chat */}
        <div className="rounded-xl overflow-hidden"
          style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}>
          <div className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "0.5px solid var(--color-ss-border-subtle)" }}>
            <div className="text-[12px] font-medium uppercase tracking-wider" style={{ color: "var(--color-ss-text-muted)" }}>
              Recent chat
            </div>
            <Link href={`/students/${id}/chat`} className="text-[11px]" style={{ color: "#7a6a40" }}>
              Open chat →
            </Link>
          </div>
          <div>
            {recentMessages.map((m, i) => (
              <div key={i} className="flex items-start gap-2 px-4 py-2.5"
                style={{ borderBottom: i < recentMessages.length - 1 ? "0.5px solid #252320" : "none" }}>
                <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[8px] font-medium shrink-0 mt-0.5"
                  style={{ background: m.colorBg, color: m.colorText }}>
                  {m.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium" style={{ color: "#8a7a60" }}>{m.sender}</div>
                  <div className="text-[12px] truncate mt-0.5" style={{ color: "var(--color-ss-text-faint)" }}>{m.text}</div>
                </div>
                <div className="text-[10px] shrink-0 mt-0.5" style={{ color: "#4a4438" }}>{m.time}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Materials */}
        <div className="rounded-xl overflow-hidden"
          style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}>
          <div className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "0.5px solid var(--color-ss-border-subtle)" }}>
            <div className="text-[12px] font-medium uppercase tracking-wider" style={{ color: "var(--color-ss-text-muted)" }}>
              Materials
            </div>
            <Link href={`/students/${id}/materials`} className="text-[11px]" style={{ color: "#7a6a40" }}>
              View all →
            </Link>
          </div>
          <div>
            {materials.map((m, i) => (
              <div key={m.name} className="flex items-center gap-2.5 px-4 py-2.5"
                style={{ borderBottom: i < materials.length - 1 ? "0.5px solid #252320" : "none" }}>
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#6a90c8" }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] truncate" style={{ color: "#c8b890" }}>{m.name}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: "var(--color-ss-text-ghost)" }}>Added {m.added} · {m.type}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}