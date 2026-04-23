"use client";

import { useState } from "react";

const groups = [
  {
    id: "1",
    name: "Vectors",
    files: [
      { id: "f1", name: "Reference sheet", added: "Apr 20", type: "PDF", size: "180 KB", isNew: true, isPinned: true },
      { id: "f2", name: "Exercises worksheet", added: "Apr 18", type: "PDF", size: "240 KB", isNew: false, isPinned: false },
      { id: "f3", name: "Whiteboard — lesson Apr 17", added: "Apr 17", type: "Image", size: "1.2 MB", isNew: false, isPinned: false },
    ],
  },
  {
    id: "2",
    name: "Newton's laws",
    files: [
      { id: "f4", name: "Formula card", added: "Apr 15", type: "PDF", size: "95 KB", isNew: true, isPinned: false },
      { id: "f5", name: "Worked examples", added: "Apr 12", type: "PDF", size: "210 KB", isNew: false, isPinned: true },
    ],
  },
  {
    id: "3",
    name: "Kinematics",
    files: [
      { id: "f6", name: "Cheat sheet", added: "Mar 30", type: "PDF", size: "210 KB", isNew: false, isPinned: false },
      { id: "f7", name: "Projectile motion — worked example", added: "Mar 12", type: "Image", size: "540 KB", isNew: false, isPinned: false },
      { id: "f8", name: "Answer key", added: "Feb 28", type: "PDF", size: "180 KB", isNew: false, isPinned: false },
    ],
  },
  {
    id: "4",
    name: "Algebra review",
    files: [
      { id: "f9", name: "Answer key", added: "Feb 10", type: "PDF", size: "160 KB", isNew: false, isPinned: false },
    ],
  },
];

function TypeBadge({ type }: { type: string }) {
  const isPdf = type === "PDF";
  return (
    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded shrink-0"
      style={{
        background: isPdf ? "#2a1510" : "#101828",
        color: isPdf ? "#c86040" : "#4080c8",
        border: `0.5px solid ${isPdf ? "#4a2510" : "#102040"}`,
      }}>
      {type}
    </span>
  );
}

export default function MaterialsPage() {
  const [openGroups, setOpenGroups] = useState<string[]>(["1"]);
  const [pinnedFiles, setPinnedFiles] = useState<string[]>(["f1", "f5"]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const totalFiles = groups.reduce((acc, g) => acc + g.files.length, 0);

  function toggleGroup(id: string) {
    setOpenGroups((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  }

  function togglePin(fileId: string) {
    setPinnedFiles((prev) =>
      prev.includes(fileId) ? prev.filter((f) => f !== fileId) : [...prev, fileId]
    );
  }

  return (
    <div className="p-6">

      {/* Top bar */}
      <div className="flex items-center justify-between mb-5">
        <div className="text-[12px]" style={{ color: "var(--color-ss-text-faint)" }}>
          {groups.length} groups · {totalFiles} files
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowGroupModal(true)}
            className="text-[12px] font-medium px-3 py-1.5 rounded"
            style={{ color: "var(--color-ss-amber-light)", background: "var(--color-ss-amber-dim)", border: "0.5px solid var(--color-ss-amber-border)" }}>
            + New group
          </button>
          <button onClick={() => setShowUploadModal(true)}
            className="text-[12px] font-medium px-3 py-1.5 rounded"
            style={{ color: "var(--color-ss-amber-light)", background: "var(--color-ss-amber-dim)", border: "0.5px solid var(--color-ss-amber-border)" }}>
            + Upload file
          </button>
        </div>
      </div>

      {/* Groups grid */}
      <div className="grid grid-cols-2 gap-3">
        {groups.map((group) => {
          const isOpen = openGroups.includes(group.id);
          const newCount = group.files.filter(f => f.isNew).length;

          return (
            <div key={group.id} className="rounded-xl overflow-hidden"
              style={{
                background: "var(--color-ss-bg-secondary)",
                border: `0.5px solid ${isOpen ? "#6a5530" : "var(--color-ss-border)"}`,
              }}>

              {/* Group header */}
              <button
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                style={{ borderBottom: isOpen ? "0.5px solid #2a2820" : "none" }}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-[16px]"
                  style={{ background: "#2a2010", border: "0.5px solid #4a3820" }}>
                  📁
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium" style={{ color: "#d8c8a0" }}>{group.name}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: "var(--color-ss-text-faint)" }}>
                    {group.files.length} {group.files.length === 1 ? "file" : "files"}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {newCount > 0 && (
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded"
                      style={{ background: "#1a2a10", color: "#70b040", border: "0.5px solid #2a4a10" }}>
                      {newCount} new
                    </span>
                  )}
                  <span className="text-[13px] transition-transform duration-150"
                    style={{
                      color: "var(--color-ss-text-ghost)",
                      display: "inline-block",
                      transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                    }}>
                    ›
                  </span>
                </div>
              </button>

              {/* Files */}
              {isOpen && (
                <div>
                  {group.files.map((file, i) => {
                    const pinned = pinnedFiles.includes(file.id);
                    return (
                      <div key={file.id}
                        className="flex items-center gap-2.5 px-4 py-2.5"
                        style={{ borderBottom: i < group.files.length - 1 ? "0.5px solid #252320" : "none" }}>

                        {/* File icon */}
                        <div className="w-[26px] h-[26px] rounded-md flex items-center justify-center text-[12px] shrink-0"
                          style={{ background: file.type === "PDF" ? "#2a1510" : "#101828" }}>
                          {file.type === "PDF" ? "📄" : "🖼"}
                        </div>

                        {/* File info */}
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] truncate" style={{ color: "#c8b890" }}>{file.name}</div>
                          <div className="text-[10px] mt-0.5" style={{ color: "var(--color-ss-text-ghost)" }}>
                            {file.added} · {file.size}
                          </div>
                        </div>

                        {/* Badges + actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {file.isNew && (
                            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded"
                              style={{ background: "#1a2a10", color: "#70b040", border: "0.5px solid #2a4a10" }}>
                              New
                            </span>
                          )}
                          <button onClick={() => togglePin(file.id)}
                            className="text-[13px] transition-colors"
                            style={{ color: pinned ? "var(--color-ss-amber)" : "#3a3630" }}
                            title={pinned ? "Unpin" : "Pin"}>
                            ★
                          </button>
                          <TypeBadge type={file.type} />
                          <span className="text-[12px] cursor-pointer" style={{ color: "var(--color-ss-text-ghost)" }}>···</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* New group modal */}
      {showGroupModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="w-[400px] rounded-xl p-6"
            style={{ background: "#201e18", border: "0.5px solid var(--color-ss-border)" }}>
            <div className="text-[16px] font-medium mb-4" style={{ color: "var(--color-ss-text-primary)" }}>
              New group
            </div>
            <div>
              <label className="text-[11px] mb-1 block" style={{ color: "var(--color-ss-text-faint)" }}>Group name</label>
              <input type="text" placeholder="e.g. Vectors"
                className="w-full px-3 py-2 rounded-md text-[13px] outline-none"
                style={{ background: "#17150f", border: "0.5px solid var(--color-ss-border)", color: "var(--color-ss-text-secondary)" }} />
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowGroupModal(false)}
                className="text-[13px] px-4 py-2 rounded-md"
                style={{ color: "var(--color-ss-text-muted)", background: "#2a2820", border: "0.5px solid var(--color-ss-border)" }}>
                Cancel
              </button>
              <button className="text-[13px] font-medium px-4 py-2 rounded-md"
                style={{ background: "var(--color-ss-amber-light)", color: "#1c1a17" }}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload file modal */}
      {showUploadModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="w-[440px] rounded-xl p-6"
            style={{ background: "#201e18", border: "0.5px solid var(--color-ss-border)" }}>
            <div className="text-[16px] font-medium mb-4" style={{ color: "var(--color-ss-text-primary)" }}>
              Upload file
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] mb-1 block" style={{ color: "var(--color-ss-text-faint)" }}>Group</label>
                <select className="w-full px-3 py-2 rounded-md text-[13px] outline-none"
                  style={{ background: "#17150f", border: "0.5px solid var(--color-ss-border)", color: "var(--color-ss-text-secondary)" }}>
                  {groups.map(g => <option key={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] mb-1 block" style={{ color: "var(--color-ss-text-faint)" }}>File</label>
                <div className="w-full px-3 py-6 rounded-md text-[12px] text-center"
                  style={{ background: "#17150f", border: "0.5px dashed var(--color-ss-border)", color: "var(--color-ss-text-ghost)" }}>
                  Drop a file here or click to upload
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowUploadModal(false)}
                className="text-[13px] px-4 py-2 rounded-md"
                style={{ color: "var(--color-ss-text-muted)", background: "#2a2820", border: "0.5px solid var(--color-ss-border)" }}>
                Cancel
              </button>
              <button className="text-[13px] font-medium px-4 py-2 rounded-md"
                style={{ background: "var(--color-ss-amber-light)", color: "#1c1a17" }}>
                Upload
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}