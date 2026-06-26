"use client";

import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

import type { Attachment } from "@/lib/types";
import { deadlineStatus } from "@/lib/homework";
import { homeworkSchema, firstError } from "@/lib/validation";
import { submitHomework, createHomework, updateHomework, deleteHomework } from "./actions";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";
import { HomeworkIcon } from "@/components/icons";

interface Homework {
  id: string;
  title: string;
  description: string | null;
  deadline: string;
  attachments: Attachment[];
  created_at: string;
}

interface Submission {
  id: string;
  homework_id: string;
  student_id: string;
  attachments: Attachment[];
  created_at: string;
  grade: string | null;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function cardShellClasses({
  isStudent,
  isTutor,
  submitted,
  isOverdue,
  isToday,
  dimmed,
}: {
  isStudent: boolean;
  isTutor: boolean;
  submitted: boolean;
  isOverdue: boolean;
  isToday: boolean;
  dimmed?: boolean;
}) {
  let classes = "overflow-hidden rounded-2xl border ";

  if (isStudent) {
    if (submitted) {
      classes += "border-ok/35 bg-ok-tint/25";
      if (isOverdue) classes += " opacity-80";
    } else if (isToday) {
      classes += "border-warn/40 bg-warn-tint/15";
    } else if (isOverdue) {
      classes += "border-line bg-surface-2 opacity-80";
    } else {
      classes += "border-line bg-surface";
    }
  } else if (isTutor && isOverdue) {
    classes += "border-line bg-surface-2 opacity-75";
  } else {
    classes += "border-line bg-surface";
  }

  if (dimmed) classes += " opacity-75";
  return classes;
}

function DeadlineBadge({
  deadline,
  submitted,
  isTutor,
}: {
  deadline: string;
  submitted: boolean;
  isTutor: boolean;
}) {
  const status = deadlineStatus(deadline);
  const due = new Date(deadline);
  const timeStr = due.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const dateStr = due.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  if (submitted && !isTutor) {
    return (
      <Badge tone="ok" className="text-[12px] font-semibold">
        Submitted
      </Badge>
    );
  }

  if (isTutor) {
    return (
      <Badge tone={status === "overdue" ? "neutral" : "warn"} className="text-[12px] font-semibold">
        {status === "overdue" ? `Closed · ${dateStr}` : `Due ${dateStr}`}
      </Badge>
    );
  }

  if (status === "overdue") {
    return (
      <Badge tone="danger" className="text-[12px] font-semibold">
        Closed · {dateStr}
      </Badge>
    );
  }
  if (status === "today") {
    return (
      <Badge tone="warn" className="text-[12px] font-semibold">
        Due today · {timeStr}
      </Badge>
    );
  }
  if (status === "soon") {
    return (
      <Badge tone="warn" className="text-[12px] font-semibold">
        Due {dateStr}
      </Badge>
    );
  }
  return (
    <Badge tone="neutral" className="text-[12px] font-semibold">
      Due {dateStr}
    </Badge>
  );
}

function FileDropZone({
  files,
  onChange,
}: {
  files: File[];
  onChange: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function addFiles(incoming: FileList | null) {
    if (!incoming) return;
    const next = [...files];
    Array.from(incoming).forEach((f) => {
      if (!next.find((x) => x.name === f.name && x.size === f.size)) next.push(f);
    });
    onChange(next);
  }

  function removeFile(idx: number) {
    onChange(files.filter((_, i) => i !== idx));
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-4 py-5 select-none transition-colors",
          dragging
            ? "border-accent bg-accent-tint text-accent"
            : "border-line-2 bg-surface-2 text-muted hover:bg-surface-3"
        )}
      >
        <span className="text-lg">📎</span>
        <span className="text-[12px] font-medium text-ink-2">Click to attach files</span>
        <span className="text-[11px] text-muted">or drag and drop</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />

      {files.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          {files.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-2.5 py-1.5"
            >
              <span className="text-[13px]">📄</span>
              <span className="min-w-0 flex-1 truncate text-[12px] text-ink">{f.name}</span>
              <span className="shrink-0 text-[10px] text-muted">{formatSize(f.size)}</span>
              <IconButton
                size="sm"
                aria-label={`Remove ${f.name}`}
                className="size-6 text-muted hover:text-danger"
                onClick={() => removeFile(i)}
              >
                ×
              </IconButton>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function HwCard({
  hw,
  classId,
  isTutor,
  isStudent,
  userId,
  submissions,
  submittingId,
  setSubmittingId,
  submitFiles,
  setSubmitFiles,
  submitLoading,
  submitError,
  submitProgress,
  deletingId,
  onDelete,
  onSubmit,
  onEdit,
  dimmed,
}: {
  hw: Homework;
  classId: string;
  isTutor: boolean;
  isStudent: boolean;
  userId: string;
  submissions: Submission[];
  submittingId: string | null;
  setSubmittingId: (id: string | null) => void;
  submitFiles: File[];
  setSubmitFiles: (files: File[]) => void;
  submitLoading: boolean;
  submitError: string | null;
  submitProgress: string | null;
  deletingId: string | null;
  onDelete: (id: string) => void;
  onSubmit: (id: string) => void;
  onEdit: (hw: Homework) => void;
  dimmed?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const mySub = submissions
    .filter((s) => s.homework_id === hw.id && s.student_id === userId)
    .sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];

  const hwSubs = submissions.filter((s) => s.homework_id === hw.id);
  const subCount = hwSubs.length;
  const status = deadlineStatus(hw.deadline);
  const isOverdue = status === "overdue";
  const isToday = status === "today";
  const submitted = !!mySub;

  return (
    <div className={cardShellClasses({ isStudent, isTutor, submitted, isOverdue, isToday, dimmed })}>
      <div className="p-4" onClick={() => setExpanded((e) => !e)}>
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <div className="text-[15px] font-semibold text-ink">{hw.title}</div>
              {isTutor ? (
                <Badge tone="neutral" className="text-[10px]">
                  {subCount} submitted
                </Badge>
              ) : null}
            </div>
            <DeadlineBadge deadline={hw.deadline} submitted={isStudent && submitted} isTutor={isTutor} />
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {isTutor ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-[12px]"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(hw);
                  }}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-[12px] text-danger"
                  busy={deletingId === hw.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(hw.id);
                  }}
                >
                  Delete
                </Button>
              </>
            ) : null}
            <span
              className={cn(
                "inline-block px-1 text-[15px] text-muted transition-transform duration-150",
                expanded && "rotate-90"
              )}
            >
              ›
            </span>
          </div>
        </div>
      </div>

      {expanded ? (
        <div className="border-t border-line">
          <div className="flex flex-col gap-3 p-4">
            {hw.description ? (
              <p className="text-[13px] leading-relaxed text-ink-2">{hw.description}</p>
            ) : null}

            {(hw.attachments ?? []).length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {hw.attachments.map((a, i) => (
                  <a
                    key={i}
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-ink-2 no-underline hover:bg-surface-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    📎 {a.name}
                  </a>
                ))}
              </div>
            ) : null}

            {isTutor ? (
              <Button asChild variant="secondary" size="sm" className="self-start">
                <Link href={`/classes/${classId}/homework/${hw.id}`}>
                  View submissions ({subCount}) →
                </Link>
              </Button>
            ) : null}

            {isStudent ? (
              <>
                {mySub ? (
                  <div className="rounded-xl border border-line bg-surface-2 p-3">
                    <p className="text-[11px] text-muted">
                      Submitted{" "}
                      {new Date(mySub.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    {(mySub.attachments ?? []).length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {mySub.attachments.map((a, i) => (
                          <a
                            key={i}
                            href={a.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2 py-0.5 text-[11px] text-ink-2 no-underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            📄 {a.name}
                          </a>
                        ))}
                      </div>
                    ) : null}
                    {mySub.grade ? (
                      <div className="mt-3 rounded-lg border border-ok/20 bg-ok-tint px-3 py-2">
                        <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted">
                          Tutor feedback
                        </div>
                        <p className="text-[13px] text-ok">{mySub.grade}</p>
                      </div>
                    ) : (
                      <p className="mt-2 text-[12px] text-muted">Awaiting feedback from tutor</p>
                    )}
                  </div>
                ) : null}

                {isOverdue ? (
                  !mySub ? (
                    <p className="text-[13px] text-muted">Deadline passed — submissions closed.</p>
                  ) : null
                ) : submittingId !== hw.id ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="self-start"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSubmittingId(hw.id);
                      setSubmitFiles([]);
                    }}
                  >
                    {mySub ? "↻ Resubmit work" : "+ Submit work"}
                  </Button>
                ) : (
                  <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                    <FileDropZone files={submitFiles} onChange={setSubmitFiles} />
                    {submitProgress ? (
                      <p className="text-[12px] text-ok">{submitProgress}</p>
                    ) : null}
                    {submitError ? (
                      <p className="rounded-lg bg-danger-tint px-3 py-2 text-[12px] text-danger">
                        {submitError}
                      </p>
                    ) : null}
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => setSubmittingId(null)}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        busy={submitLoading}
                        disabled={submitFiles.length === 0}
                        onClick={() => onSubmit(hw.id)}
                      >
                        {mySub ? "Resubmit" : "Submit"}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function toLocalDatetimeValue(isoString: string) {
  const d = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function HwModal({
  classId,
  editTarget,
  onClose,
  onSuccess,
}: {
  classId: string;
  editTarget: Homework | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const supabase = createClient();

  const [title, setTitle] = useState(editTarget?.title ?? "");
  const [desc, setDesc] = useState(editTarget?.description ?? "");
  const [deadline, setDeadline] = useState(
    editTarget ? toLocalDatetimeValue(editTarget.deadline) : ""
  );
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>(
    editTarget?.attachments ?? []
  );
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!editTarget;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = homeworkSchema.safeParse({ title, description: desc, deadline });
    if (!parsed.success) {
      setError(firstError(parsed.error));
      return;
    }

    setLoading(true);

    const uploadedAttachments: Attachment[] = [];
    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];
      const ext = file.name.split(".").pop();
      const path = `${classId}/${Date.now()}-${i}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("homework-attachments")
        .upload(path, file);
      if (uploadErr) {
        setError(uploadErr.message);
        setLoading(false);
        return;
      }
      const {
        data: { publicUrl },
      } = supabase.storage.from("homework-attachments").getPublicUrl(path);
      uploadedAttachments.push({
        url: publicUrl,
        name: file.name,
        size_bytes: file.size,
        mime_type: file.type,
      });
    }

    const finalAttachments = [...existingAttachments, ...uploadedAttachments];

    const { error: dbErr } = isEdit
      ? await updateHomework({
          hwId: editTarget!.id,
          classId,
          title,
          description: desc,
          deadline,
          attachments: finalAttachments,
        })
      : await createHomework({
          classId,
          title,
          description: desc,
          deadline,
          attachments: finalAttachments,
        });

    setLoading(false);
    if (dbErr) {
      setError(dbErr);
      return;
    }

    onSuccess();
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-[500px] flex-col overflow-hidden rounded-2xl border border-line bg-bg shadow-[var(--shadow)]"
        role="dialog"
        aria-labelledby="hw-modal-title"
      >
        <div className="shrink-0 border-b border-line px-5 py-4">
          <h2 id="hw-modal-title" className="text-[17px] font-semibold text-ink">
            {isEdit ? "Edit homework" : "Post homework"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto p-5">
          <Field label="Title" htmlFor="hw-title">
            <Input
              id="hw-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Vectors — exercises 3.1 to 3.5"
              required
            />
          </Field>

          <Field label="Description" htmlFor="hw-desc" optional>
            <Textarea
              id="hw-desc"
              rows={2}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Instructions for the student…"
            />
          </Field>

          <Field label="Deadline" htmlFor="hw-deadline">
            <Input
              id="hw-deadline"
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              required
            />
          </Field>

          <Field label="Attachments" optional>
            {existingAttachments.length > 0 ? (
              <div className="mb-2 flex flex-col gap-1.5">
                {existingAttachments.map((a, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-1.5"
                  >
                    <span className="text-[13px]">📎</span>
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      className="min-w-0 flex-1 truncate text-[12px] text-accent no-underline hover:underline"
                    >
                      {a.name}
                    </a>
                    {a.size_bytes ? (
                      <span className="shrink-0 text-[10px] text-muted">
                        {formatSize(a.size_bytes)}
                      </span>
                    ) : null}
                    <IconButton
                      size="sm"
                      aria-label={`Remove ${a.name}`}
                      className="size-6 text-muted hover:text-danger"
                      onClick={() =>
                        setExistingAttachments((prev) => prev.filter((_, j) => j !== i))
                      }
                    >
                      ×
                    </IconButton>
                  </div>
                ))}
              </div>
            ) : null}
            <FileDropZone files={newFiles} onChange={setNewFiles} />
          </Field>

          {error ? (
            <div className="rounded-lg bg-danger-tint px-3 py-2 text-[12px] text-danger">
              {error}
            </div>
          ) : null}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" busy={loading}>
              {isEdit ? "Save changes" : "Post homework"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}


export default function HomeworkClient({
  classId,
  userId,
  role,
  homework,
  submissions,
}: {
  classId: string;
  userId: string;
  role: string;
  homework: Homework[];
  submissions: Submission[];
  studentUsers?: { id: string; full_name: string }[];
}) {
  const router = useRouter();
  const isTutor = role === "tutor";
  const isStudent = role === "student";
  const now = new Date();

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Homework | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [submitFiles, setSubmitFiles] = useState<File[]>([]);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitProgress, setSubmitProgress] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const supabase = createClient();

  const active = homework
    .filter((h) => new Date(h.deadline) > now)
    .sort((a, b) => {
      const aSubmitted = submissions.some(
        (s) => s.homework_id === a.id && s.student_id === userId
      );
      const bSubmitted = submissions.some(
        (s) => s.homework_id === b.id && s.student_id === userId
      );
      if (aSubmitted !== bSubmitted) return aSubmitted ? 1 : -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });

  const past = homework
    .filter((h) => new Date(h.deadline) <= now)
    .sort((a, b) => new Date(b.deadline).getTime() - new Date(a.deadline).getTime());

  function openPost() {
    setEditTarget(null);
    setModalOpen(true);
  }

  function openEdit(hw: Homework) {
    setEditTarget(hw);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditTarget(null);
  }

  function onModalSuccess() {
    closeModal();
    router.refresh();
  }

  async function handleSubmit(hwId: string) {
    if (submitFiles.length === 0) return;
    setSubmitLoading(true);
    setSubmitError(null);

    const attachments: Attachment[] = [];
    for (let i = 0; i < submitFiles.length; i++) {
      const file = submitFiles[i];
      setSubmitProgress(`Uploading ${i + 1} of ${submitFiles.length}…`);
      const ext = file.name.split(".").pop();
      const path = `${classId}/submissions/${hwId}/${Date.now()}-${i}.${ext}`;
      const { error } = await supabase.storage.from("homework-attachments").upload(path, file);
      if (error) {
        setSubmitError(error.message);
        setSubmitLoading(false);
        return;
      }
      const {
        data: { publicUrl },
      } = supabase.storage.from("homework-attachments").getPublicUrl(path);
      attachments.push({
        url: publicUrl,
        name: file.name,
        size_bytes: file.size,
        mime_type: file.type,
      });
    }

    const { error } = await submitHomework({ homeworkId: hwId, attachments });

    setSubmitLoading(false);
    setSubmitProgress(null);
    if (error) {
      setSubmitError(error);
      return;
    }
    setSubmittingId(null);
    setSubmitFiles([]);
    router.refresh();
  }

  async function handleDelete(hwId: string) {
    setDeletingId(hwId);
    const { error } = await deleteHomework(hwId, classId);
    setDeletingId(null);
    if (error) {
      setSubmitError(error);
      return;
    }
    router.refresh();
  }

  const sharedProps = {
    classId,
    isTutor,
    isStudent,
    userId,
    submissions,
    submittingId,
    setSubmittingId,
    submitFiles,
    setSubmitFiles,
    submitLoading,
    submitError,
    submitProgress,
    deletingId,
    onDelete: handleDelete,
    onSubmit: handleSubmit,
    onEdit: openEdit,
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="mb-1 flex items-center justify-between gap-3">
        <p className="text-[13px] text-muted">
          {homework.length} {homework.length === 1 ? "assignment" : "assignments"}
        </p>
        {isTutor ? (
          <Button size="sm" onClick={openPost}>
            + Post homework
          </Button>
        ) : null}
      </div>

      {homework.length === 0 ? (
        <EmptyState
          icon={<HomeworkIcon size={20} />}
          title="No homework yet"
          description={
            isTutor
              ? "Post your first assignment for this class."
              : "Your tutor hasn't posted any homework yet."
          }
          action={
            isTutor ? (
              <Button size="sm" onClick={openPost}>
                Post homework
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {active.length > 0 ? (
            <div className="mb-2">
              <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
                Active
              </div>
              <div className="flex flex-col gap-3">
                {active.map((hw) => (
                  <HwCard key={hw.id} hw={hw} {...sharedProps} />
                ))}
              </div>
            </div>
          ) : null}

          {past.length > 0 ? (
            <div>
              {active.length > 0 ? <div className="mb-4 h-px bg-line" /> : null}
              <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
                Past
              </div>
              <div className="flex flex-col gap-3">
                {past.map((hw) => (
                  <HwCard key={hw.id} hw={hw} {...sharedProps} dimmed />
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}

      {submitError && !submittingId ? (
        <p className="rounded-lg bg-danger-tint px-3 py-2 text-[12px] text-danger">{submitError}</p>
      ) : null}

      {modalOpen ? (
        <HwModal
          classId={classId}
          editTarget={editTarget}
          onClose={closeModal}
          onSuccess={onModalSuccess}
        />
      ) : null}
    </div>
  );
}
