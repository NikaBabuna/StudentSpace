/* =============================================================================
 * features/dashboard/lib/homework-stats.ts — per-slot homework status counts
 * ----------------------------------------------------------------------------- */

export type HomeworkSlotStats = {
  withFeedback: number;
  submitted: number;
  pending: number;
  overdue: number;
};

type HomeworkItem = { id: string; deadline: string };
type SubmissionItem = { homework_id: string; student_id: string; grade: string | null };

/** Counts tutor homework slots (each student × each assignment). */
export function countTutorHomeworkSlots(
  homework: HomeworkItem[],
  studentIds: string[],
  submissions: SubmissionItem[],
  now = new Date()
): HomeworkSlotStats {
  const stats: HomeworkSlotStats = { withFeedback: 0, submitted: 0, pending: 0, overdue: 0 };
  if (studentIds.length === 0) return stats;

  for (const hw of homework) {
    const past = new Date(hw.deadline) < now;
    for (const studentId of studentIds) {
      const sub = submissions.find((s) => s.homework_id === hw.id && s.student_id === studentId);
      if (sub?.grade) stats.withFeedback++;
      else if (sub) stats.submitted++;
      else if (past) stats.overdue++;
      else stats.pending++;
    }
  }

  return stats;
}

/** Counts homework slots for a single student across their assignments. */
export function countStudentHomeworkSlots(
  homework: HomeworkItem[],
  studentId: string,
  submissions: SubmissionItem[],
  now = new Date()
): HomeworkSlotStats {
  const stats: HomeworkSlotStats = { withFeedback: 0, submitted: 0, pending: 0, overdue: 0 };

  for (const hw of homework) {
    const past = new Date(hw.deadline) < now;
    const sub = submissions.find((s) => s.homework_id === hw.id && s.student_id === studentId);
    if (sub?.grade) stats.withFeedback++;
    else if (sub) stats.submitted++;
    else if (past) stats.overdue++;
    else stats.pending++;
  }

  return stats;
}
