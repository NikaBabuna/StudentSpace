"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import type { Attachment } from "@/lib/types";
import { gradeSubmission } from "./actions";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { Textarea } from "@/components/ui/textarea";
import { HomeworkIcon } from "@/components/icons";

interface Submission {
  id: string;
  student_id: string;
  attachments: Attachment[];
  created_at: string;
  grade: string | null;
}

interface StudentUser {
  id: string;
  full_name: string;
}

export default function SubmissionsClient({
  classId,
  hw,
  studentUsers,
  submissions,
}: {
  classId: string;
  hw: {
    id: string;
    title: string;
    description: string | null;
    deadline: string;
    attachments: Attachment[];
  };
  studentUsers: StudentUser[];
  submissions: Submission[];
  tutorId: string;
}) {
  const router = useRouter();

  const [gradingId, setGradingId] = useState<string | null>(null);
  const [gradeText, setGradeText] = useState("");
  const [gradeLoading, setGradeLoading] = useState(false);
  const [gradeError, setGradeError] = useState<string | null>(null);

  const deadline = new Date(hw.deadline);
  const isPast = new Date() > deadline;
  const deadlineLabel = deadline.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const submittedIds = [...new Set(submissions.map((s) => s.student_id))];
  const notSubmitted = studentUsers.filter((u) => !submittedIds.includes(u.id));
  const pendingReview = submissions.filter((s) => !s.grade).length;

  function submissionStatus(sub: Submission) {
    return new Date(sub.created_at) <= deadline ? "on_time" : "late";
  }

  async function handleGrade(subId: string) {
    setGradeLoading(true);
    setGradeError(null);
    const { error } = await gradeSubmission(subId, gradeText, classId);
    setGradeLoading(false);
    if (error) {
      setGradeError(error);
      return;
    }
    setGradingId(null);
    setGradeText("");
    router.refresh();
  }

  function studentName(id: string) {
    return studentUsers.find((u) => u.id === id)?.full_name ?? "Student";
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/classes/${classId}/homework`}
        className="text-[13px] font-medium text-muted transition-colors hover:text-accent"
      >
        ← Back to homework
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-serif text-[26px] leading-tight tracking-[-0.01em] text-ink">
            {hw.title}
          </h2>
          {hw.description ? (
            <p className="mt-1.5 text-[14px] text-ink-2">{hw.description}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-[12px] text-muted">Deadline · {deadlineLabel}</span>
            {isPast ? (
              <Badge tone="danger" className="text-[11px] font-semibold">
                Closed
              </Badge>
            ) : (
              <Badge tone="warn" className="text-[11px] font-semibold">
                Open
              </Badge>
            )}
          </div>
          {(hw.attachments ?? []).length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {hw.attachments.map((a, i) => (
                <a
                  key={i}
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-ink-2 no-underline hover:bg-surface-3"
                >
                  📎 {a.name}
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Submitted"
          value={submissions.length}
          delta={`of ${studentUsers.length} students`}
          deltaTone="up"
        />
        <StatCard
          label="Missing"
          value={notSubmitted.length}
          delta={isPast ? "deadline passed" : "still pending"}
          deltaTone={notSubmitted.length > 0 ? "warn" : "muted"}
        />
        <StatCard
          label="To review"
          value={pendingReview}
          delta={pendingReview > 0 ? "needs feedback" : "all reviewed"}
          deltaTone={pendingReview > 0 ? "warn" : "up"}
        />
      </div>

      {studentUsers.length === 0 ? (
        <EmptyState
          icon={<HomeworkIcon size={20} />}
          title="No students yet"
          description="Add students to this class before reviewing submissions."
        />
      ) : (
        <>
          {submissions.length > 0 ? (
            <section>
              <h3 className="mb-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
                Submissions ({submissions.length})
              </h3>
              <div className="flex flex-col gap-3">
                {submissions.map((sub) => {
                  const status = submissionStatus(sub);
                  const isGrading = gradingId === sub.id;
                  const name = studentName(sub.student_id);

                  return (
                    <div
                      key={sub.id}
                      className="rounded-2xl border border-line bg-surface p-4"
                    >
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <Avatar name={name} size="sm" />
                        <span className="text-[13px] font-semibold text-ink">{name}</span>
                        <span className="text-[11px] text-muted">
                          {new Date(sub.created_at).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <Badge tone={status === "late" ? "danger" : "ok"} className="text-[10px]">
                          {status === "late" ? "Late" : "On time"}
                        </Badge>
                        <Badge
                          tone={sub.grade ? "ok" : "warn"}
                          className="ml-auto text-[10px]"
                        >
                          {sub.grade ? "Graded" : "Pending review"}
                        </Badge>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="min-w-0">
                          <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-muted">
                            Files
                          </div>
                          {(sub.attachments ?? []).length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {sub.attachments.map((a, j) => (
                                <a
                                  key={j}
                                  href={a.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface-2 px-2 py-1 text-[11px] text-ink-2 no-underline hover:bg-surface-3"
                                >
                                  📄 {a.name}
                                </a>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[12px] text-muted">No files attached</p>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-muted">
                            Feedback
                          </div>
                          {isGrading ? (
                            <div className="flex flex-col gap-2">
                              <Textarea
                                rows={3}
                                value={gradeText}
                                onChange={(e) => setGradeText(e.target.value)}
                                placeholder="Write feedback…"
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => {
                                    setGradingId(null);
                                    setGradeError(null);
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button size="sm" busy={gradeLoading} onClick={() => handleGrade(sub.id)}>
                                  Save feedback
                                </Button>
                              </div>
                              {gradeError && isGrading ? (
                                <p className="text-[12px] text-danger">{gradeError}</p>
                              ) : null}
                            </div>
                          ) : (
                            <div>
                              {sub.grade ? (
                                <div className="mb-2 rounded-lg border border-ok/20 bg-ok-tint px-3 py-2">
                                  <p className="text-[13px] text-ok">{sub.grade}</p>
                                </div>
                              ) : null}
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  setGradingId(sub.id);
                                  setGradeText(sub.grade ?? "");
                                  setGradeError(null);
                                }}
                              >
                                {sub.grade ? "Edit feedback" : "Add feedback"}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {notSubmitted.length > 0 ? (
            <section>
              {submissions.length > 0 ? <div className="mb-4 h-px bg-line" /> : null}
              <h3 className="mb-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
                {isPast ? "Did not submit" : "Not yet submitted"} ({notSubmitted.length})
              </h3>
              <div className="flex flex-col gap-2">
                {notSubmitted.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3"
                  >
                    <Avatar name={student.full_name} size="sm" />
                    <span className="text-[13px] font-medium text-ink">{student.full_name}</span>
                    <Badge tone={isPast ? "danger" : "neutral"} className="ml-auto text-[10px]">
                      {isPast ? "Missing" : "Pending"}
                    </Badge>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
