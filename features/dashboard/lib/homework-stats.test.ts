import { describe, expect, it } from "vitest";

import { countTutorHomeworkSlots } from "./homework-stats";

describe("countTutorHomeworkSlots", () => {
  it("counts one slot per student per homework", () => {
    const now = new Date("2026-06-15T12:00:00Z");
    const stats = countTutorHomeworkSlots(
      [
        { id: "hw-1", deadline: "2026-06-20T12:00:00Z" },
        { id: "hw-2", deadline: "2026-06-01T12:00:00Z" },
      ],
      ["student-a", "student-b"],
      [{ homework_id: "hw-1", student_id: "student-a", grade: null }],
      now
    );

    expect(stats.submitted).toBe(1);
    expect(stats.pending).toBe(1);
    expect(stats.overdue).toBe(2);
    expect(stats.withFeedback).toBe(0);
  });
});
