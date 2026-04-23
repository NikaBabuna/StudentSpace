"use client";

import { useState } from "react";

const homeworkItems = [
  { id: "1", title: "Vectors — exercises 3.1 to 3.5", description: "Complete all five exercises from the worksheet. Show all working.", due: "Mon Apr 28, 18:00", status: "pending", attachments: 1, submissions: 0 },
  { id: "2", title: "Newton's laws — summary sheet", description: "Write a one-page summary of Newton's three laws with examples for each.", due: "Wed Apr 30, 20:00", status: "pending", attachments: 0, submissions: 0 },
  { id: "3", title: "Kinematics — problem set 2", description: "Problems 1–8 from chapter 4.", due: "Apr 17, 18:00", status: "submitted", attachments: 0, submissions: 2 },
  { id: "4", title: "Algebra review", description: "Equations and inequalities worksheet.", due: "Apr 10, 18:00", status: "submitted", attachments: 0, submissions: 1 },
  { id: "5", title: "Trigonometry — unit circle", description: "Memorize and reproduce the unit circle from scratch.", due: "Apr 3, 18:00", status: "late", attachments: 0, submissions: 1 },
];

function StatusBadge({ status }: { status: string }) {
  if (status === "submitted") return (
    <span className="text-[10px] font-medium px-2 py-0.5 rounded shrink-0"
      style={{ background: "#10201a", color: "#40a870", border: "0.5px solid #1a4030" }}>
      Submitted on time
    </span>
  );
  if (status === "late") return (
    <span className="text-[10px] font-medium px-2 py-0.5 rounded shrink-0"
      style={{ background: "#2a1010", color: "#c04040", border: "0.5px solid #4a1010" }}>
      Submitted late
    </span>
  );
  return (
    <span className="text-[10px] font-medium px-2 py-0.5 rounded shrink-0"
      style={{ background: "#2a1e10", color: "#c87a30", border: "0.5px solid #4a3010" }}>
      Pending
    </span>
  );
}

function HwIcon({ status }: { status: string }) {
  const bg = status === "submitted" ? "#10201a" : status === "late" ? "#2a1010" : "#2a1e10";
  const color = status === "submitted" ? "#40a870" : status === "late" ? "#c04040" : "#c87a30";
  const symbol = status === "submitted" ? "✓" : status === "late" ? "!" : "📄";
  return (
    <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 text-[13px] font-medium mt-0.5"
      style={{ background: bg, color }}>
      {symbol}
    </div>
  );
}

export default function HomeworkPage() {
  const [showModal, setShowModal] = useState(false);
  const active = homeworkItems.filter((h) => h.status === "pending");
  const past = homeworkItems.filter((h) => h.status !== "pending");

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="text-[12px] uppercase tracking-wider" style={{ color: "var(--color-ss-text-faint)" }}>
          {homeworkItems.length} assignments total
        </div>
        <button onClick={() => setShowModal(true)}
          className="text-[12px] font-medium px-3 py-1.5 rounded"
          style={{ color: "var(--color-ss-amber-light)", background: "var(--color-ss-amber-dim)", border: "0.5px solid var(--color-ss-amber-border)" }}>
          + Post homework
        </button>
      </div>

      <div className="text-[11px] uppercase tracking-wider mb-2" style={{ color: "var(--color-ss-text-ghost)" }}>Active</div>
      <div className="flex flex-col gap-2 mb-6">
        {active.map((h) => (
          <div key={h.id} className="rounded-xl p-4 flex gap-3"
            style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}>
            <HwIcon status={h.status} />
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-medium mb-1" style={{ color: "#d8c8a0" }}>{h.title}</div>
              <div className="text-[12px] mb-2" style={{ color: "var(--color-ss-text-faint)" }}>{h.description}</div>
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[10px] font-medium px-2 py-0.5 rounded"
                  style={{ background: "#2a1e10", color: "#c87a30", border: "0.5px solid #4a3010" }}>
                  Due {h.due}
                </span>
                {h.attachments > 0 && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded"
                    style={{ background: "#1a1818", color: "#7a7060", border: "0.5px solid #3a3020" }}>
                    {h.attachments} attachment
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-start gap-2 shrink-0">
              <button className="text-[11px] px-2.5 py-1 rounded"
                style={{ color: "var(--color-ss-text-ghost)", background: "#2a2820", border: "0.5px solid var(--color-ss-border)" }}>
                Edit
              </button>
              <button className="text-[11px] px-2.5 py-1 rounded"
                style={{ color: "var(--color-ss-red)", background: "var(--color-ss-red-bg)", border: "0.5px solid var(--color-ss-red-border)" }}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4" style={{ height: "0.5px", background: "#2a2820" }} />

      <div className="text-[11px] uppercase tracking-wider mb-2" style={{ color: "var(--color-ss-text-ghost)" }}>Past</div>
      <div className="flex flex-col gap-2">
        {past.map((h) => (
          <div key={h.id} className="rounded-xl p-4 flex gap-3"
            style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}>
            <HwIcon status={h.status} />
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-medium mb-1" style={{ color: "#d8c8a0" }}>{h.title}</div>
              <div className="text-[12px] mb-2" style={{ color: "var(--color-ss-text-faint)" }}>{h.description}</div>
              <div className="flex flex-wrap gap-2 items-center">
                <StatusBadge status={h.status} />
                {h.submissions > 0 && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded"
                    style={{ background: "#1a1818", color: "#7a7060", border: "0.5px solid #3a3020" }}>
                    {h.submissions} {h.submissions === 1 ? "photo" : "photos"}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="w-[480px] rounded-xl p-6"
            style={{ background: "#201e18", border: "0.5px solid var(--color-ss-border)" }}>
            <div className="text-[16px] font-medium mb-4" style={{ color: "var(--color-ss-text-primary)" }}>
              Post homework
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] mb-1 block" style={{ color: "var(--color-ss-text-faint)" }}>Title</label>
                <input type="text" placeholder="e.g. Vectors — exercises 3.1 to 3.5"
                  className="w-full px-3 py-2 rounded-md text-[13px] outline-none"
                  style={{ background: "#17150f", border: "0.5px solid var(--color-ss-border)", color: "var(--color-ss-text-secondary)" }} />
              </div>
              <div>
                <label className="text-[11px] mb-1 block" style={{ color: "var(--color-ss-text-faint)" }}>Description</label>
                <textarea rows={3} placeholder="Instructions for the student..."
                  className="w-full px-3 py-2 rounded-md text-[13px] outline-none resize-none"
                  style={{ background: "#17150f", border: "0.5px solid var(--color-ss-border)", color: "var(--color-ss-text-secondary)" }} />
              </div>
              <div>
                <label className="text-[11px] mb-1 block" style={{ color: "var(--color-ss-text-faint)" }}>Deadline</label>
                <input type="datetime-local" className="w-full px-3 py-2 rounded-md text-[13px] outline-none"
                  style={{ background: "#17150f", border: "0.5px solid var(--color-ss-border)", color: "var(--color-ss-text-secondary)" }} />
              </div>
              <div>
                <label className="text-[11px] mb-1 block" style={{ color: "var(--color-ss-text-faint)" }}>Attachments (optional)</label>
                <div className="w-full px-3 py-4 rounded-md text-[12px] text-center"
                  style={{ background: "#17150f", border: "0.5px dashed var(--color-ss-border)", color: "var(--color-ss-text-ghost)" }}>
                  Drop files here or click to upload
                </div>
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
                Post
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}