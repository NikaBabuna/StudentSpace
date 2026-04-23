"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Submission {
  id: string;
  student_id: string;
  attachments: any[];
  created_at: string;
  grade: string | null;
}

interface StudentUser {
  id: string;
  full_name: string;
}

export default function SubmissionsClient({
  classId, hw, studentUsers, submissions, tutorId,
}: {
  classId: string;
  hw: { id: string; title: string; description: string | null; deadline: string; attachments: any[] };
  studentUsers: StudentUser[];
  submissions: Submission[];
  tutorId: string;
}) {
  const supabase = createClient();
  const router = useRouter();

  const [gradingId, setGradingId] = useState<string | null>(null);
  const [gradeText, setGradeText] = useState("");
  const [gradeLoading, setGradeLoading] = useState(false);

  const deadline = new Date(hw.deadline);
  const isPast = new Date() > deadline;

const submittedIds = [...new Set(submissions.map(s => s.student_id))];
const notSubmitted = studentUsers.filter(u => !submittedIds.includes(u.id));

  function submissionStatus(sub: Submission) {
    const subDate = new Date(sub.created_at);
    return subDate <= deadline ? "on_time" : "late";
  }

  async function handleGrade(subId: string) {
    setGradeLoading(true);
    await supabase.from("submissions").update({ grade: gradeText }).eq("id", subId);
    setGradeLoading(false);
    setGradingId(null);
    setGradeText("");
    router.refresh();
  }

  function StudentName({ id }: { id: string }) {
    return <>{studentUsers.find(u => u.id === id)?.full_name ?? "Student"}</>;
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--color-ss-bg)" }}>

      {/* Header */}
      <div className="px-8 py-5" style={{ borderBottom: "0.5px solid var(--color-ss-border)" }}>
        <Link href={`/classes/${classId}/homework`}
          className="text-[11px] mb-3 block"
          style={{ color: "var(--color-ss-text-ghost)" }}>
          ← Back to homework
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[20px] font-medium mb-1" style={{ color: "var(--color-ss-text-primary)" }}>
              {hw.title}
            </div>
            {hw.description && (
              <div className="text-[13px] mb-2" style={{ color: "var(--color-ss-text-faint)" }}>
                {hw.description}
              </div>
            )}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[11px]" style={{ color: "var(--color-ss-text-ghost)" }}>
                Deadline: {deadline.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </span>
              {isPast && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded"
                  style={{ background: "#2a1010", color: "#c04040", border: "0.5px solid #4a1010" }}>
                  Closed
                </span>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-3 shrink-0">
            <div className="text-center px-4 py-2 rounded-lg"
              style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}>
              <div className="text-[20px] font-medium" style={{ color: "#40a870" }}>{submissions.length}</div>
              <div className="text-[10px]" style={{ color: "#5a5248" }}>submitted</div>
            </div>
            <div className="text-center px-4 py-2 rounded-lg"
              style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}>
              <div className="text-[20px] font-medium" style={{ color: "#c04040" }}>{notSubmitted.length}</div>
              <div className="text-[10px]" style={{ color: "#5a5248" }}>missing</div>
            </div>
            <div className="text-center px-4 py-2 rounded-lg"
              style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}>
              <div className="text-[20px] font-medium" style={{ color: "#c8a050" }}>
                {submissions.filter(s => !s.grade).length}
              </div>
              <div className="text-[10px]" style={{ color: "#5a5248" }}>pending review</div>
            </div>
          </div>
        </div>

        {/* Homework attachments */}
        {(hw.attachments ?? []).length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {hw.attachments.map((a: any, i: number) => (
              <a key={i} href={a.url} target="_blank" rel="noreferrer"
                className="text-[10px] font-medium px-2 py-1 rounded flex items-center gap-1.5"
                style={{ background: "#17150f", color: "#7a7060", border: "0.5px solid #2a2820", textDecoration: "none" }}>
                📎 {a.name}
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="px-8 py-6 flex flex-col gap-6">

        {/* Submissions */}
{submissions.length > 0 && (
  <div>
    <div className="text-[11px] uppercase tracking-wider mb-3" style={{ color: "var(--color-ss-text-ghost)" }}>
      Submissions ({submissions.length})
    </div>
    <div className="flex flex-col gap-2">
      {submissions.map(sub => {
        const status = submissionStatus(sub);
        const isGrading = gradingId === sub.id;
        const studentName = studentUsers.find(u => u.id === sub.student_id)?.full_name ?? "Student";
        return (
          <div key={sub.id} className="rounded-xl p-4"
            style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}>

            {/* Top row */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium shrink-0"
                style={{ background: "#2a1e10", color: "#e8a060", border: "1px solid #5a3a1a" }}>
                {studentName[0]?.toUpperCase()}
              </div>
              <span className="text-[13px] font-medium" style={{ color: "#d8c8a0" }}>{studentName}</span>
              <span className="text-[10px]" style={{ color: "#5a5248" }}>
                {new Date(sub.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </span>
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded"
                style={status === "late"
                  ? { background: "#2a1010", color: "#c04040", border: "0.5px solid #4a1010" }
                  : { background: "#10201a", color: "#40a870", border: "0.5px solid #1a4030" }}>
                {status === "late" ? "Late" : "On time"}
              </span>
              <span className="ml-auto text-[9px] font-medium px-1.5 py-0.5 rounded"
                style={sub.grade
                  ? { background: "#10201a", color: "#40a870", border: "0.5px solid #1a4030" }
                  : { background: "#2a2010", color: "#c87a30", border: "0.5px solid #4a3010" }}>
                {sub.grade ? "Graded" : "Pending review"}
              </span>
            </div>

            {/* Files + feedback side by side */}
            <div className="flex gap-4">
              {/* Left: files */}
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: "#5a5248" }}>Files</div>
                <div className="flex flex-wrap gap-2">
                  {(sub.attachments ?? []).map((a: any, j: number) => (
                    <a key={j} href={a.url} target="_blank" rel="noreferrer"
                      className="text-[10px] px-2 py-1 rounded flex items-center gap-1.5"
                      style={{ background: "#17150f", color: "#6a8060", border: "0.5px solid #1a3020", textDecoration: "none" }}>
                      📄 {a.name}
                    </a>
                  ))}
                </div>
              </div>

              {/* Right: feedback */}
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: "#5a5248" }}>Feedback</div>
                {isGrading ? (
                  <div className="flex flex-col gap-2">
                    <textarea rows={2} value={gradeText} onChange={e => setGradeText(e.target.value)}
                      placeholder="Write feedback…" autoFocus
                      className="w-full px-3 py-2 rounded-md text-[12px] outline-none resize-none"
                      style={{ background: "#17150f", border: "0.5px solid var(--color-ss-border)", color: "var(--color-ss-text-secondary)" }} />
                    <div className="flex gap-2">
                      <button onClick={() => setGradingId(null)}
                        className="text-[11px] px-3 py-1 rounded"
                        style={{ color: "var(--color-ss-text-muted)", background: "#2a2820", border: "0.5px solid var(--color-ss-border)" }}>
                        Cancel
                      </button>
                      <button onClick={() => handleGrade(sub.id)} disabled={gradeLoading}
                        className="text-[11px] font-medium px-3 py-1 rounded"
                        style={{ background: "var(--color-ss-amber-light)", color: "#1c1a17", opacity: gradeLoading ? 0.6 : 1 }}>
                        {gradeLoading ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {sub.grade && (
                      <div className="rounded-md p-2 mb-2"
                        style={{ background: "#1a2010", border: "0.5px solid #2a4020" }}>
                        <div className="text-[12px]" style={{ color: "#a0c890" }}>{sub.grade}</div>
                      </div>
                    )}
                    <button onClick={() => { setGradingId(sub.id); setGradeText(sub.grade ?? ""); }}
                      className="text-[11px] px-2.5 py-1 rounded"
                      style={{ color: "#7a8a70", background: "#1a2010", border: "0.5px solid #2a3820" }}>
                      {sub.grade ? "Edit feedback" : "+ Add feedback"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
)}

{/* Not submitted */}
{notSubmitted.length > 0 && (
  <div>
    <div className="text-[11px] uppercase tracking-wider mb-3" style={{ color: "var(--color-ss-text-ghost)" }}>
      {isPast ? "Did not submit" : "Not yet submitted"} ({notSubmitted.length})
    </div>
    <div className="flex flex-col gap-2">
      {notSubmitted.map(student => (
        <div key={student.id} className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium shrink-0"
            style={{ background: "#2a1010", color: "#c04040", border: "1px solid #4a1010" }}>
            {student.full_name[0]?.toUpperCase()}
          </div>
          <span className="text-[13px]" style={{ color: "#9a8e7a" }}>{student.full_name}</span>
          <span className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded"
            style={{ background: "#2a1010", color: "#c04040", border: "0.5px solid #4a1010" }}>
            {isPast ? "Missing" : "Pending"}
          </span>
        </div>
      ))}
    </div>
  </div>
)}

        {submissions.length === 0 && notSubmitted.length === 0 && (
          <div className="text-center py-12 text-[13px]" style={{ color: "var(--color-ss-text-ghost)" }}>
            No students in this class yet.
          </div>
        )}
      </div>
    </div>
  );
}