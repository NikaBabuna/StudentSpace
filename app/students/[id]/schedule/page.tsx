"use client";

import { useState } from "react";

const lessons = [
  {
    id: "1",
    day: "24", dow: "Thu", month: "Apr",
    time: "17:00 – 19:00", duration: "2 hours", subject: "Math",
    status: "upcoming",
    missedId: null, makeupFor: null,
  },
  {
    id: "2",
    day: "26", dow: "Sat", month: "Apr",
    time: "11:00 – 12:00", duration: "1 hour", subject: "Physics",
    status: "upcoming",
    missedId: null, makeupFor: null,
  },
  {
    id: "3",
    day: "17", dow: "Thu", month: "Apr",
    time: "17:00 – 19:00", duration: "2 hours", subject: "Math",
    status: "completed",
    missedId: null, makeupFor: null,
  },
  {
    id: "4",
    day: "19", dow: "Sat", month: "Apr",
    time: "11:00 – 12:00", duration: "1 hour", subject: "Physics",
    status: "missed",
    missedId: "4", makeupFor: null,
  },
  {
    id: "5",
    day: "21", dow: "Mon", month: "Apr",
    time: "16:00 – 17:00", duration: "1 hour", subject: "Physics",
    status: "makeup",
    missedId: null, makeupFor: "4",
  },
];

const pendingMakeups = [
  { missedDate: "Sat Mar 8", subject: "Physics", duration: "1 hour" },
];

const scheduledMakeups = [
  { missedDate: "Sat Apr 19", subject: "Physics", duration: "1 hour", makeupDate: "Mon Apr 21" },
];

type Filter = "all" | "upcoming" | "completed" | "missed";

const statusConfig: Record<string, { stripe: string; badge: string; badgeBg: string; badgeBorder: string; label: string }> = {
  upcoming: { stripe: "#c8a050", badge: "#c8a050", badgeBg: "#2a2318", badgeBorder: "#4a3a18", label: "Upcoming" },
  completed: { stripe: "#40a870", badge: "#40a870", badgeBg: "#10201a", badgeBorder: "#1a4030", label: "Completed" },
  missed: { stripe: "#c04040", badge: "#c04040", badgeBg: "#2a1010", badgeBorder: "#4a1010", label: "Missed" },
  makeup: { stripe: "#9090d8", badge: "#9090d8", badgeBg: "#1a1a2a", badgeBorder: "#2a2a4a", label: "Makeup" },
};

function LessonCard({ lesson }: { lesson: typeof lessons[0] }) {
  const cfg = statusConfig[lesson.status];
  return (
    <div className="flex rounded-xl overflow-hidden"
      style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}>
      <div className="w-1 shrink-0" style={{ background: cfg.stripe }} />
      <div className="flex items-center gap-3 flex-1 px-4 py-3">
        <div className="min-w-[44px] text-center">
          <div className="text-[18px] font-medium" style={{ color: "var(--color-ss-text-primary)" }}>{lesson.day}</div>
          <div className="text-[10px]" style={{ color: "var(--color-ss-text-faint)" }}>{lesson.dow}</div>
        </div>
        <div className="w-px h-9 shrink-0" style={{ background: "var(--color-ss-border)" }} />
        <div className="flex-1">
          <div className="text-[13px] font-medium" style={{ color: "var(--color-ss-text-primary)" }}>{lesson.time}</div>
          <div className="text-[11px] mt-0.5" style={{ color: "var(--color-ss-text-faint)" }}>
            {lesson.duration} · {lesson.subject}
            {lesson.makeupFor && <span style={{ color: "#6a5a80", fontStyle: "italic" }}> · makeup for {
              lessons.find(l => l.id === lesson.makeupFor)
                ? `${lessons.find(l => l.id === lesson.makeupFor)!.dow} ${lessons.find(l => l.id === lesson.makeupFor)!.month} ${lessons.find(l => l.id === lesson.makeupFor)!.day}`
                : ""
            }</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-medium px-2 py-0.5 rounded"
            style={{ background: cfg.badgeBg, color: cfg.badge, border: `0.5px solid ${cfg.badgeBorder}` }}>
            {cfg.label}
          </span>
          <span className="text-[13px] cursor-pointer" style={{ color: "var(--color-ss-text-ghost)" }}>···</span>
        </div>
      </div>
    </div>
  );
}

export default async function SchedulePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
  const [filter, setFilter] = useState<Filter>("all");
  const [showModal, setShowModal] = useState(false);

  const thisWeek = lessons.filter(l =>
    ["1", "2"].includes(l.id) &&
    (filter === "all" || l.status === filter)
  );
  const lastWeek = lessons.filter(l =>
    ["3", "4", "5"].includes(l.id) &&
    (filter === "all" || l.status === filter)
  );

  // Group last week: pair missed with its makeup
  const missedIds = lastWeek.filter(l => l.status === "missed").map(l => l.id);
  const makeupIds = lastWeek.filter(l => l.status === "makeup").map(l => l.makeupFor);

  return (
    <div className="p-6">

      {/* Makeups tracker banner */}
      <div className="rounded-xl p-4 mb-5"
        style={{ background: "#1e1a2a", border: "0.5px solid #3a3060" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[12px] font-medium uppercase tracking-wider" style={{ color: "var(--color-ss-purple)" }}>
            Makeups tracker
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-full"
            style={{ background: "#2a2040", color: "var(--color-ss-purple)", border: "0.5px solid #4a3a70" }}>
            {pendingMakeups.length + scheduledMakeups.length} missed lessons
          </span>
        </div>

        <div className="flex flex-col gap-0">
          {pendingMakeups.map((m, i) => (
            <div key={i} className="flex items-center gap-2 py-2"
              style={{ borderTop: "0.5px solid #2a2540" }}>
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--color-ss-red)" }} />
              <div className="flex-1 text-[12px]" style={{ color: "#8a8090" }}>
                Missed <span className="font-medium" style={{ color: "#c0b090" }}>{m.missedDate}</span> · {m.subject}, {m.duration}
              </div>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded"
                style={{ background: "#2a2040", color: "var(--color-ss-purple)", border: "0.5px solid #4a3a70" }}>
                No makeup yet
              </span>
            </div>
          ))}
          {scheduledMakeups.map((m, i) => (
            <div key={i} className="flex items-center gap-2 py-2"
              style={{ borderTop: "0.5px solid #2a2540" }}>
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--color-ss-red)" }} />
              <div className="flex-1 text-[12px]" style={{ color: "#8a8090" }}>
                Missed <span className="font-medium" style={{ color: "#c0b090" }}>{m.missedDate}</span> · {m.subject}, {m.duration}
              </div>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded"
                style={{ background: "#1a2a30", color: "#50b0c0", border: "0.5px solid #2a4a50" }}>
                Makeup scheduled {m.makeupDate}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1">
          {(["all", "upcoming", "completed", "missed"] as Filter[]).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className="text-[12px] px-3 py-1.5 rounded capitalize"
              style={{
                background: filter === f ? "#2a2318" : "transparent",
                color: filter === f ? "var(--color-ss-amber-light)" : "var(--color-ss-text-faint)",
                border: filter === f ? "0.5px solid #4a3a18" : "0.5px solid transparent",
              }}>
              {f}
            </button>
          ))}
        </div>
        <button onClick={() => setShowModal(true)}
          className="text-[12px] font-medium px-3 py-1.5 rounded"
          style={{ color: "var(--color-ss-amber-light)", background: "var(--color-ss-amber-dim)", border: "0.5px solid var(--color-ss-amber-border)" }}>
          + Schedule lesson
        </button>
      </div>

      {/* This week */}
      {thisWeek.length > 0 && (
        <div className="mb-5">
          <div className="text-[11px] uppercase tracking-wider mb-2" style={{ color: "var(--color-ss-text-ghost)" }}>
            This week
          </div>
          <div className="flex flex-col gap-2">
            {thisWeek.map(l => <LessonCard key={l.id} lesson={l} />)}
          </div>
        </div>
      )}

      {/* Last week */}
      {lastWeek.length > 0 && (
        <div className="mb-5">
          <div className="text-[11px] uppercase tracking-wider mb-2" style={{ color: "var(--color-ss-text-ghost)" }}>
            Last week
          </div>
          <div className="flex flex-col gap-2">
            {lastWeek.map((l) => {
              if (l.status === "missed" && makeupIds.includes(l.id)) {
                const makeup = lastWeek.find(m => m.makeupFor === l.id);
                return (
                  <div key={l.id}>
                    <LessonCard lesson={l} />
                    {makeup && (
                      <div className="flex gap-0 mt-1">
                        <div className="flex flex-col items-center w-6 shrink-0 py-1">
                          <div className="flex-1 w-px" style={{ background: "#3a2a4a" }} />
                          <div className="w-2 h-2 rotate-45 shrink-0 mb-1"
                            style={{ borderRight: "1.5px solid #3a2a4a", borderBottom: "1.5px solid #3a2a4a" }} />
                        </div>
                        <div className="flex-1">
                          <div className="text-[10px] mb-1 pl-1" style={{ color: "#6a5a80", fontStyle: "italic" }}>
                            makeup for {l.dow} {l.month} {l.day}
                          </div>
                          <LessonCard lesson={makeup} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              }
              if (l.status === "makeup") return null;
              return <LessonCard key={l.id} lesson={l} />;
            })}
          </div>
        </div>
      )}

      {/* Schedule lesson modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="w-[440px] rounded-xl p-6"
            style={{ background: "#201e18", border: "0.5px solid var(--color-ss-border)" }}>
            <div className="text-[16px] font-medium mb-4" style={{ color: "var(--color-ss-text-primary)" }}>
              Schedule lesson
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] mb-1 block" style={{ color: "var(--color-ss-text-faint)" }}>Date & time</label>
                <input type="datetime-local" className="w-full px-3 py-2 rounded-md text-[13px] outline-none"
                  style={{ background: "#17150f", border: "0.5px solid var(--color-ss-border)", color: "var(--color-ss-text-secondary)" }} />
              </div>
              <div>
                <label className="text-[11px] mb-1 block" style={{ color: "var(--color-ss-text-faint)" }}>Duration</label>
                <select className="w-full px-3 py-2 rounded-md text-[13px] outline-none"
                  style={{ background: "#17150f", border: "0.5px solid var(--color-ss-border)", color: "var(--color-ss-text-secondary)" }}>
                  <option>1 hour</option>
                  <option>2 hours</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] mb-1 block" style={{ color: "var(--color-ss-text-faint)" }}>Subject</label>
                <select className="w-full px-3 py-2 rounded-md text-[13px] outline-none"
                  style={{ background: "#17150f", border: "0.5px solid var(--color-ss-border)", color: "var(--color-ss-text-secondary)" }}>
                  <option>Math</option>
                  <option>Physics</option>
                  <option>Math & Physics</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] mb-1 block" style={{ color: "var(--color-ss-text-faint)" }}>Is this a makeup lesson?</label>
                <select className="w-full px-3 py-2 rounded-md text-[13px] outline-none"
                  style={{ background: "#17150f", border: "0.5px solid var(--color-ss-border)", color: "var(--color-ss-text-secondary)" }}>
                  <option>No</option>
                  <option>Yes — makeup for Sat Mar 8</option>
                  <option>Yes — makeup for Sat Apr 19</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowModal(false)}
                className="text-[13px] px-4 py-2 rounded-md"
                style={{ color: "var(--color-ss-text-muted)", background: "#2a2820", border: "0.5px solid var(--color-ss-border)" }}>
                Cancel
              </button>
              <button className="text-[13px] font-medium px-4 py-2 rounded-md"
                style={{ background: "var(--color-ss-amber-light)", color: "#1c1a17" }}>
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}