import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";

const students = [
  {
    id: "1",
    name: "Ana Svanidze",
    initials: "AS",
    grade: "Grade 11 · Math & Physics",
    cycleNumber: 3,
    cycleHours: 5,
    cycleTotal: 8,
    avatarColor: { bg: "#2a1e10", border: "#5a3a1a", text: "#e8a060" },
    badges: [
      { label: "2 hw due", style: { background: "#2a1e10", color: "#c87a30", border: "0.5px solid #4a3010" } },
      { label: "lesson tomorrow", style: { background: "#10201a", color: "#40a870", border: "0.5px solid #1a4030" } },
      { label: "1 new message", style: { background: "#1a1a2a", color: "#9090d8", border: "0.5px solid #2a2a4a" } },
    ],
  },
  {
    id: "2",
    name: "Giorgi Kiknadze",
    initials: "GK",
    grade: "Grade 12 · Math",
    cycleNumber: 5,
    cycleHours: 8,
    cycleTotal: 8,
    avatarColor: { bg: "#101e2a", border: "#1a3a5a", text: "#60a0e8" },
    badges: [
      { label: "lesson fri 16:00", style: { background: "#10201a", color: "#40a870", border: "0.5px solid #1a4030" } },
    ],
  },
  {
    id: "3",
    name: "Nino Beridze",
    initials: "NB",
    grade: "Grade 10 · Physics",
    cycleNumber: 1,
    cycleHours: 2,
    cycleTotal: 8,
    avatarColor: { bg: "#1a2a10", border: "#3a5a1a", text: "#80c040" },
    badges: [
      { label: "1 hw due", style: { background: "#2a1e10", color: "#c87a30", border: "0.5px solid #4a3010" } },
      { label: "1 missed lesson", style: { background: "#2a1010", color: "#c04040", border: "0.5px solid #4a1010" } },
    ],
  },
  {
    id: "4",
    name: "Luka Jikia",
    initials: "LJ",
    grade: "Grade 9 · Math & Physics",
    cycleNumber: 2,
    cycleHours: 7,
    cycleTotal: 8,
    avatarColor: { bg: "#2a102a", border: "#5a1a5a", text: "#c060c0" },
    badges: [
      { label: "lesson today 18:00", style: { background: "#10201a", color: "#40a870", border: "0.5px solid #1a4030" } },
      { label: "3 new messages", style: { background: "#1a1a2a", color: "#9090d8", border: "0.5px solid #2a2a4a" } },
    ],
  },
];

export default function DashboardPage() {
  return (
    <AppLayout mode="dashboard" tutorInitials="TN" tutorName="Tutor" role="tutor">
      <div className="flex-1 p-6 overflow-auto">

        {/* Top bar */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-[18px] font-medium" style={{ color: "var(--color-ss-text-primary)" }}>
              My students
            </h1>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--color-ss-text-faint)" }}>
              {students.length} active session spaces
            </p>
          </div>
          <button
            className="text-[13px] font-medium px-3.5 py-[7px] rounded-md"
            style={{ background: "var(--color-ss-amber-light)", color: "#1c1a17" }}
          >
            + Add student
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Total hours this month", value: "24", sub: "across all students" },
            { label: "Homework pending review", value: "3", sub: "submissions waiting" },
            { label: "Lessons this week", value: "6", sub: "2 upcoming today" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-lg p-4"
              style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}
            >
              <div className="text-[11px] mb-1" style={{ color: "var(--color-ss-text-faint)" }}>{s.label}</div>
              <div className="text-[22px] font-medium" style={{ color: "var(--color-ss-text-primary)" }}>{s.value}</div>
              <div className="text-[11px] mt-1" style={{ color: "var(--color-ss-text-ghost)" }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Section label */}
        <div className="text-[12px] uppercase tracking-wider mb-3" style={{ color: "var(--color-ss-text-faint)" }}>
          Session spaces
        </div>

        {/* Student grid */}
        <div className="grid grid-cols-2 gap-3">
          {students.map((s) => {
            const pct = Math.round((s.cycleHours / s.cycleTotal) * 100);
            return (
              <Link
                key={s.id}
                href={`/students/${s.id}/overview`}
                className="rounded-xl p-4 block transition-colors"
                style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}
              >
                {/* Student header */}
                <div className="flex items-center gap-2.5 mb-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-medium shrink-0"
                    style={{ background: s.avatarColor.bg, border: `1px solid ${s.avatarColor.border}`, color: s.avatarColor.text }}
                  >
                    {s.initials}
                  </div>
                  <div>
                    <div className="text-[14px] font-medium" style={{ color: "#d8c8a0" }}>{s.name}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: "var(--color-ss-text-faint)" }}>{s.grade}</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-[4px] rounded-full overflow-hidden" style={{ background: "#2a2820" }}>
                    <div className="h-full rounded-full" style={{ background: "var(--color-ss-amber)", width: `${pct}%` }} />
                  </div>
                  <span className="text-[11px] whitespace-nowrap" style={{ color: "var(--color-ss-text-faint)" }}>
                    {s.cycleHours} / {s.cycleTotal}h · Cycle {s.cycleNumber}
                  </span>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-1.5">
                  {s.badges.map((b) => (
                    <span key={b.label} className="text-[10px] font-medium px-2 py-0.5 rounded" style={b.style}>
                      {b.label}
                    </span>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}