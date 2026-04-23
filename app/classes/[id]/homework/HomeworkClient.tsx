"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Homework {
  id: string;
  title: string;
  description: string | null;
  deadline: string;
  attachments: any[];
  created_at: string;
}

interface Submission {
  id: string;
  homework_id: string;
  student_id: string;
  attachments: any[];
  created_at: string;
  grade: string | null;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function deadlineStatus(deadline: string) {
  const now = new Date();
  const due = new Date(deadline);
  const diffMs = due.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffMs < 0) return "overdue";
  if (diffHours < 24) return "today";
  if (diffDays < 3) return "soon";
  return "upcoming";
}

function DeadlineBadge({ deadline, submitted, isTutor }: { deadline: string; submitted: boolean; isTutor: boolean }) {
  const status = deadlineStatus(deadline);
  const due = new Date(deadline);
  const timeStr = due.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const dateStr = due.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

  if (submitted && !isTutor) return (
    <span className="text-[10px] font-medium px-2 py-0.5 rounded"
      style={{ background: "#10201a", color: "#40a870", border: "0.5px solid #1a4030" }}>
      ✓ Submitted
    </span>
  );

  if (isTutor) return (
    <span className="text-[10px] font-medium px-2 py-0.5 rounded"
      style={{ background: "#2a2318", color: "#9a8060", border: "0.5px solid #3a3020" }}>
      {status === "overdue" ? `Closed · ${dateStr}` : `Due ${dateStr}`}
    </span>
  );

  if (status === "overdue") return (
    <span className="text-[10px] font-medium px-2 py-0.5 rounded"
      style={{ background: "#2a1010", color: "#c04040", border: "0.5px solid #4a1010" }}>
      Closed · {dateStr}
    </span>
  );
  if (status === "today") return (
    <span className="text-[11px] font-medium px-2 py-1 rounded-md"
      style={{ background: "#2a1a0a", color: "#e07040", border: "0.5px solid #7a3818" }}>
      Due today at {timeStr}
    </span>
  );
  if (status === "soon") return (
    <span className="text-[10px] font-medium px-2 py-0.5 rounded"
      style={{ background: "#2a1e10", color: "#e8903a", border: "0.5px solid #5a3a10" }}>
      Due {dateStr}
    </span>
  );
  return (
    <span className="text-[10px] font-medium px-2 py-0.5 rounded"
      style={{ background: "#2a2318", color: "#9a8060", border: "0.5px solid #3a3020" }}>
      Due {dateStr}
    </span>
  );
}

function HwCard({
  hw, classId, isTutor, isStudent, userId,
  submissions, submittingId, setSubmittingId,
  submitFiles, setSubmitFiles, submitLoading,
  submitError, submitProgress, deletingId,
  onDelete, onSubmit,
}: any) {
  const [expanded, setExpanded] = useState(false);

  const mySub = submissions
    .filter((s: Submission) => s.homework_id === hw.id && s.student_id === userId)
    .sort((a: Submission, b: Submission) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

  const subCount = submissions.filter((s: Submission) => s.homework_id === hw.id).length;
  const isOverdue = deadlineStatus(hw.deadline) === "overdue";
  const isToday = deadlineStatus(hw.deadline) === "today";
  const submitted = !!mySub;

// Card styling based on state
  let borderColor = "#3a3630";
  let bgColor = "var(--color-ss-bg-secondary)";
  let opacity = 1;

  if (isStudent) {
    if (submitted) {
      // Past submitted — ghostly green
      borderColor = "#1a3528";
      bgColor = "#0c1610";
      if (isOverdue) opacity = 0.75;
    } else if (isToday) {
      borderColor = "#7a3818";
      bgColor = "#1a100a";
    } else if (isOverdue) {
      // Past due unsubmitted — ghostly dark red
      borderColor = "#2a1414";
      bgColor = "#110a0a";
      opacity = 0.8;
    }
  } else if (isTutor && isOverdue) {
    // Tutor past due — ghostly dark, desaturated
    borderColor = "#2a2620";
    bgColor = "#141210";
    opacity = 0.7;
  }

  return (
    <div className="rounded-xl overflow-hidden cursor-pointer"
      style={{ background: bgColor, border: `0.5px solid ${borderColor}`, opacity }}>

      <div className="p-4" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <div className="text-[14px] font-medium" style={{ color: "#d8c8a0" }}>{hw.title}</div>
              {isTutor && (
                <span className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ background: "#2a2820", color: "#6a6050", border: "0.5px solid #3a3630" }}>
                  {subCount} submitted
                </span>
              )}
            </div>
            <DeadlineBadge deadline={hw.deadline} submitted={isStudent && submitted} isTutor={isTutor} />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isTutor && (
              <button onClick={e => { e.stopPropagation(); onDelete(hw.id); }}
                disabled={deletingId === hw.id}
                className="text-[11px] px-2 py-0.5 rounded"
                style={{ color: "#a03030", background: "#1e0e0e", border: "0.5px solid #3a1818" }}>
                {deletingId === hw.id ? "…" : "Delete"}
              </button>
            )}
            <span className="text-[13px]" style={{
              color: "#5a5248",
              display: "inline-block",
              transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.15s",
            }}>›</span>
          </div>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: "0.5px solid #2a2820" }}>
          <div className="p-4 flex flex-col gap-3">
            {hw.description && (
              <div className="text-[13px]" style={{ color: "var(--color-ss-text-faint)" }}>
                {hw.description}
              </div>
            )}
            {(hw.attachments ?? []).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {hw.attachments.map((a: any, i: number) => (
                  <a key={i} href={a.url} target="_blank" rel="noreferrer"
                    className="text-[10px] font-medium px-2 py-1 rounded flex items-center gap-1.5"
                    style={{ background: "#17150f", color: "#7a7060", border: "0.5px solid #2a2820", textDecoration: "none" }}>
                    📎 {a.name}
                  </a>
                ))}
              </div>
            )}
            {isTutor && (
              <Link href={`/classes/${classId}/homework/${hw.id}`}
                className="inline-flex items-center gap-2 text-[12px] font-medium px-3 py-1.5 rounded self-start"
                style={{ color: "var(--color-ss-amber-light)", background: "var(--color-ss-amber-dim)", border: "0.5px solid var(--color-ss-amber-border)" }}>
                View submissions ({subCount}) →
              </Link>
            )}
            {isStudent && (
              <>
                {mySub ? (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px]" style={{ color: "#5a5248" }}>
                        Submitted {new Date(mySub.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(mySub.attachments ?? []).map((a: any, i: number) => (
                        <a key={i} href={a.url} target="_blank" rel="noreferrer"
                          className="text-[10px] px-2 py-0.5 rounded flex items-center gap-1"
                          style={{ background: "#17150f", color: "#6a8060", border: "0.5px solid #1a3020", textDecoration: "none" }}>
                          📄 {a.name}
                        </a>
                      ))}
                    </div>
                    {mySub.grade ? (
                      <div className="rounded-md p-2.5"
                        style={{ background: "#1a2010", border: "0.5px solid #2a4020" }}>
                        <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "#5a7050" }}>
                          Tutor feedback
                        </div>
                        <div className="text-[12px]" style={{ color: "#a0c890" }}>{mySub.grade}</div>
                      </div>
                    ) : (
                      <div className="text-[11px]" style={{ color: "#5a5248" }}>
                        Awaiting feedback from tutor
                      </div>
                    )}
                  </div>
                ) : isOverdue ? (
                  <div className="text-[12px]" style={{ color: "#5a4040" }}>
                    Deadline passed — submissions closed.
                  </div>
                ) : (
                  <>
                    {submittingId !== hw.id ? (
                      <button onClick={() => { setSubmittingId(hw.id); setSubmitFiles([]); }}
                        className="text-[12px] font-medium px-3 py-1.5 rounded self-start"
                        style={{ color: "var(--color-ss-amber-light)", background: "var(--color-ss-amber-dim)", border: "0.5px solid var(--color-ss-amber-border)" }}>
                        + Submit work
                      </button>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <input type="file" multiple
                          onChange={e => setSubmitFiles(Array.from(e.target.files ?? []))}
                          className="text-[12px]" style={{ color: "var(--color-ss-text-faint)" }} />
                        {submitFiles.length > 0 && (
                          <div className="flex flex-col gap-1">
                            {submitFiles.map((f: File, i: number) => (
                              <div key={i} className="text-[11px] flex gap-2" style={{ color: "var(--color-ss-text-faint)" }}>
                                <span>📄</span><span className="flex-1 truncate">{f.name}</span>
                                <span style={{ color: "#4a4438" }}>{formatSize(f.size)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {submitProgress && <div className="text-[11px]" style={{ color: "#70b040" }}>{submitProgress}</div>}
                        {submitError && <div className="text-[11px]" style={{ color: "var(--color-ss-red)" }}>{submitError}</div>}
                        <div className="flex gap-2">
                          <button onClick={() => setSubmittingId(null)}
                            className="text-[12px] px-3 py-1.5 rounded"
                            style={{ color: "var(--color-ss-text-muted)", background: "#2a2820", border: "0.5px solid var(--color-ss-border)" }}>
                            Cancel
                          </button>
                          <button onClick={() => onSubmit(hw.id)}
                            disabled={submitLoading || submitFiles.length === 0}
                            className="text-[12px] font-medium px-3 py-1.5 rounded"
                            style={{ background: "var(--color-ss-amber-light)", color: "#1c1a17", opacity: (submitLoading || submitFiles.length === 0) ? 0.6 : 1 }}>
                            {submitLoading ? "Uploading…" : "Submit"}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function HomeworkClient({ classId, userId, role, homework, submissions }: {
  classId: string;
  userId: string;
  role: string;
  homework: Homework[];
  submissions: Submission[];
  studentUsers?: any[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const isTutor = role === "tutor";
  const isStudent = role === "student";
  const now = new Date();

  const [showPostModal, setShowPostModal] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postDesc, setPostDesc] = useState("");
  const [postDeadline, setPostDeadline] = useState("");
  const [postFiles, setPostFiles] = useState<File[]>([]);
  const [postLoading, setPostLoading] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [submitFiles, setSubmitFiles] = useState<File[]>([]);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitProgress, setSubmitProgress] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

const active = homework
  .filter(h => new Date(h.deadline) > now)
  .sort((a, b) => {
    const aSubmitted = submissions.some(s => s.homework_id === a.id && s.student_id === userId);
    const bSubmitted = submissions.some(s => s.homework_id === b.id && s.student_id === userId);
    // Unsubmitted first, then by deadline ascending
    if (aSubmitted !== bSubmitted) return aSubmitted ? 1 : -1;
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });
const past = homework
  .filter(h => new Date(h.deadline) <= now)
  .sort((a, b) => new Date(b.deadline).getTime() - new Date(a.deadline).getTime());

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    setPostLoading(true); setPostError(null);

    let attachments: any[] = [];
    for (let i = 0; i < postFiles.length; i++) {
      const file = postFiles[i];
      const ext = file.name.split(".").pop();
      const path = `${classId}/${Date.now()}-${i}.${ext}`;
      const { error } = await supabase.storage.from("homework-attachments").upload(path, file);
      if (error) { setPostError(error.message); setPostLoading(false); return; }
      const { data: { publicUrl } } = supabase.storage.from("homework-attachments").getPublicUrl(path);
      attachments.push({ url: publicUrl, name: file.name, size_bytes: file.size, mime_type: file.type });
    }

    const { error } = await supabase.from("homework").insert({
      class_id: classId, created_by: userId,
      title: postTitle, description: postDesc || null,
      deadline: new Date(postDeadline).toISOString(), attachments,
    });

    setPostLoading(false);
    if (error) { setPostError(error.message); return; }
    setShowPostModal(false);
    setPostTitle(""); setPostDesc(""); setPostDeadline(""); setPostFiles([]);
    router.refresh();
  }

  async function handleSubmit(hwId: string) {
    if (submitFiles.length === 0) return;
    setSubmitLoading(true); setSubmitError(null);

    let attachments: any[] = [];
    for (let i = 0; i < submitFiles.length; i++) {
      const file = submitFiles[i];
      setSubmitProgress(`Uploading ${i + 1} of ${submitFiles.length}…`);
      const ext = file.name.split(".").pop();
      const path = `${classId}/submissions/${hwId}/${Date.now()}-${i}.${ext}`;
      const { error } = await supabase.storage.from("homework-attachments").upload(path, file);
      if (error) { setSubmitError(error.message); setSubmitLoading(false); return; }
      const { data: { publicUrl } } = supabase.storage.from("homework-attachments").getPublicUrl(path);
      attachments.push({ url: publicUrl, name: file.name, size_bytes: file.size, mime_type: file.type });
    }

    const { error } = await supabase.from("submissions").insert({
      homework_id: hwId, student_id: userId, attachments,
    });

    setSubmitLoading(false); setSubmitProgress(null);
    if (error) { setSubmitError(error.message); return; }
    setSubmittingId(null); setSubmitFiles([]);
    router.refresh();
  }

  async function handleDelete(hwId: string) {
    setDeletingId(hwId);
    await supabase.from("homework").update({ deleted_at: new Date().toISOString() }).eq("id", hwId);
    setDeletingId(null);
    router.refresh();
  }

  const sharedProps = {
    classId, isTutor, isStudent, userId, submissions,
    submittingId, setSubmittingId,
    submitFiles, setSubmitFiles,
    submitLoading, submitError, submitProgress,
    deletingId,
    onDelete: handleDelete,
    onSubmit: handleSubmit,
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="text-[12px]" style={{ color: "var(--color-ss-text-faint)" }}>
          {homework.length} {homework.length === 1 ? "assignment" : "assignments"}
        </div>
        {isTutor && (
          <button onClick={() => setShowPostModal(true)}
            className="text-[12px] font-medium px-3 py-1.5 rounded"
            style={{ color: "var(--color-ss-amber-light)", background: "var(--color-ss-amber-dim)", border: "0.5px solid var(--color-ss-amber-border)" }}>
            + Post homework
          </button>
        )}
      </div>

      {homework.length === 0 && (
        <div className="text-center py-12 text-[13px]" style={{ color: "var(--color-ss-text-ghost)" }}>
          No homework posted yet.
        </div>
      )}

      {active.length > 0 && (
        <div className="mb-6">
          <div className="text-[11px] uppercase tracking-wider mb-3" style={{ color: "var(--color-ss-text-ghost)" }}>Active</div>
          <div className="flex flex-col gap-3">
            {active.map(hw => <HwCard key={hw.id} hw={hw} {...sharedProps} />)}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          {active.length > 0 && <div className="mb-4" style={{ height: "0.5px", background: "#2a2820" }} />}
          <div className="text-[11px] uppercase tracking-wider mb-3" style={{ color: "var(--color-ss-text-ghost)" }}>Past</div>
          <div className="flex flex-col gap-3">
            {past.map(hw => <HwCard key={hw.id} hw={hw} {...sharedProps} />)}
          </div>
        </div>
      )}

      {showPostModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="w-[500px] rounded-xl p-6"
            style={{ background: "#201e18", border: "0.5px solid var(--color-ss-border)" }}>
            <div className="text-[16px] font-medium mb-4" style={{ color: "var(--color-ss-text-primary)" }}>
              Post homework
            </div>
            <form onSubmit={handlePost} className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] mb-1 block" style={{ color: "var(--color-ss-text-faint)" }}>Title</label>
                <input type="text" value={postTitle} onChange={e => setPostTitle(e.target.value)} required
                  placeholder="e.g. Vectors — exercises 3.1 to 3.5"
                  className="w-full px-3 py-2 rounded-md text-[13px] outline-none"
                  style={{ background: "#17150f", border: "0.5px solid var(--color-ss-border)", color: "var(--color-ss-text-secondary)" }} />
              </div>
              <div>
                <label className="text-[11px] mb-1 block" style={{ color: "var(--color-ss-text-faint)" }}>
                  Description <span style={{ color: "var(--color-ss-text-ghost)" }}>(optional)</span>
                </label>
                <textarea rows={2} value={postDesc} onChange={e => setPostDesc(e.target.value)}
                  placeholder="Instructions for the student…"
                  className="w-full px-3 py-2 rounded-md text-[13px] outline-none resize-none"
                  style={{ background: "#17150f", border: "0.5px solid var(--color-ss-border)", color: "var(--color-ss-text-secondary)" }} />
              </div>
              <div>
                <label className="text-[11px] mb-1 block" style={{ color: "var(--color-ss-text-faint)" }}>Deadline</label>
                <input type="datetime-local" value={postDeadline} onChange={e => setPostDeadline(e.target.value)} required
                  className="w-full px-3 py-2 rounded-md text-[13px] outline-none"
                  style={{ background: "#17150f", border: "0.5px solid var(--color-ss-border)", color: "var(--color-ss-text-secondary)" }} />
              </div>
              <div>
                <label className="text-[11px] mb-1 block" style={{ color: "var(--color-ss-text-faint)" }}>
                  Attachments <span style={{ color: "var(--color-ss-text-ghost)" }}>(optional)</span>
                </label>
                <input type="file" multiple
                  onChange={e => setPostFiles(Array.from(e.target.files ?? []))}
                  className="w-full text-[12px]" style={{ color: "var(--color-ss-text-faint)" }} />
                {postFiles.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1">
                    {postFiles.map((f, i) => (
                      <div key={i} className="text-[11px] flex gap-2" style={{ color: "var(--color-ss-text-faint)" }}>
                        <span>📎</span><span className="flex-1 truncate">{f.name}</span>
                        <span style={{ color: "#4a4438" }}>{formatSize(f.size)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {postError && (
                <div className="text-[12px] px-3 py-2 rounded-md"
                  style={{ background: "var(--color-ss-red-bg)", color: "var(--color-ss-red)", border: "0.5px solid var(--color-ss-red-border)" }}>
                  {postError}
                </div>
              )}
              <div className="flex gap-2 mt-1">
                <button type="button" onClick={() => setShowPostModal(false)}
                  className="flex-1 py-2 rounded-md text-[13px]"
                  style={{ color: "var(--color-ss-text-muted)", background: "#2a2820", border: "0.5px solid var(--color-ss-border)" }}>
                  Cancel
                </button>
                <button type="submit" disabled={postLoading}
                  className="flex-1 py-2 rounded-md text-[13px] font-medium"
                  style={{ background: "var(--color-ss-amber-light)", color: "#1c1a17", opacity: postLoading ? 0.6 : 1 }}>
                  {postLoading ? "Posting…" : "Post"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}