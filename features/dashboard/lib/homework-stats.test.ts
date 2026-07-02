/* =============================================================================
 * features/dashboard/lib/homework-stats.test.ts
 * -----------------------------------------------------------------------------
 * Role: Verifies per-slot homework status counting for tutors (student ×
 *       assignment matrix) and for a single student.
 * Dependencies: vitest, homework-stats
 * Used by: npm test / CI
 * ========================================================================== */
import { describe, expect, it } from "vitest";

import { countStudentHomeworkSlots, countTutorHomeworkSlots } from "./homework-stats";

const NOW = new Date("2026-06-15T12:00:00Z");

const homework = [
  { id: "hw-1", deadline: "2026-06-20T12:00:00Z" }, // upcoming
  { id: "hw-2", deadline: "2026-06-01T12:00:00Z" }, // past
];

describe("countTutorHomeworkSlots", () => {
  it("counts one slot per student per homework", () => {
    const stats = countTutorHomeworkSlots(
      homework,
      ["student-a", "student-b"],
      [{ homework_id: "hw-1", student_id: "student-a", grade: null }],
      NOW
    );

    expect(stats.submitted).toBe(1); // a's hw-1
    expect(stats.pending).toBe(1); // b's hw-1 (upcoming, no sub)
    expect(stats.overdue).toBe(2); // both hw-2 slots
    expect(stats.withFeedback).toBe(0);
  });

  it("counts graded submissions as feedback regardless of deadline", () => {
    const stats = countTutorHomeworkSlots(
      homework,
      ["student-a"],
      [
        { homework_id: "hw-1", student_id: "student-a", grade: "Nice work" },
        { homework_id: "hw-2", student_id: "student-a", grade: "Late but good" },
      ],
      NOW
    );
    expect(stats.withFeedback).toBe(2);
    expect(stats.overdue).toBe(0);
  });

  it("returns zeros when there are no students", () => {
    const stats = countTutorHomeworkSlots(homework, [], [], NOW);
    expect(stats).toEqual({ withFeedback: 0, submitted: 0, pending: 0, overdue: 0 });
  });
});

describe("countStudentHomeworkSlots", () => {
  it("classifies each assignment for the student", () => {
    const stats = countStudentHomeworkSlots(
      homework,
      "student-a",
      [{ homework_id: "hw-1", student_id: "student-a", grade: null }],
      NOW
    );
    expect(stats.submitted).toBe(1); // hw-1 submitted, ungraded
    expect(stats.overdue).toBe(1); // hw-2 past, no submission
    expect(stats.pending).toBe(0);
    expect(stats.withFeedback).toBe(0);
  });

  it("ignores other students' submissions", () => {
    const stats = countStudentHomeworkSlots(
      homework,
      "student-a",
      [{ homework_id: "hw-1", student_id: "student-b", grade: "Great" }],
      NOW
    );
    expect(stats.submitted).toBe(0);
    expect(stats.pending).toBe(1);
    expect(stats.overdue).toBe(1);
  });

  it("counts graded work as feedback", () => {
    const stats = countStudentHomeworkSlots(
      homework,
      "student-a",
      [
        { homework_id: "hw-1", student_id: "student-a", grade: "A" },
        { homework_id: "hw-2", student_id: "student-a", grade: "B" },
      ],
      NOW
    );
    expect(stats.withFeedback).toBe(2);
  });
});
