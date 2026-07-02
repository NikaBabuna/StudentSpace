/* =============================================================================
 * lib/dashboard-stats.test.ts — unit tests for lib/dashboard-stats.ts
 * -----------------------------------------------------------------------------
 * Role: Verifies greeting periods use the app timezone (not the host's) and
 *       that stat cards aggregate lessons/submissions correctly per role.
 * Dependencies: vitest (fake timers), lib/dashboard-stats
 * Used by: npm test / CI
 * ========================================================================== */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildDashboardStats, greetingForHour } from "./dashboard-stats";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("greetingForHour", () => {
  it("uses the Tbilisi hour, not the host hour", () => {
    // 06:00 UTC = 10:00 Tbilisi → morning (a UTC host clock alone would also
    // say morning here; the afternoon/evening cases below catch the offset).
    vi.setSystemTime(new Date("2026-07-02T06:00:00Z"));
    expect(greetingForHour("Nika")).toBe("Good morning, Nika");
  });

  it("is afternoon at 09:00 UTC (13:00 Tbilisi)", () => {
    vi.setSystemTime(new Date("2026-07-02T09:00:00Z"));
    expect(greetingForHour("Nika")).toBe("Good afternoon, Nika");
  });

  it("is evening at 14:00 UTC (18:00 Tbilisi)", () => {
    vi.setSystemTime(new Date("2026-07-02T14:00:00Z"));
    expect(greetingForHour("Nika")).toBe("Good evening, Nika");
  });

  it("omits the name when empty", () => {
    vi.setSystemTime(new Date("2026-07-02T06:00:00Z"));
    expect(greetingForHour("")).toBe("Good morning");
  });
});

describe("buildDashboardStats (tutor)", () => {
  // Fixed "now": 2026-07-02 10:00 UTC = 14:00 Tbilisi.
  const NOW = new Date("2026-07-02T10:00:00Z");

  const lessons = [
    // Completed + missed drive attendance: 3 of 4 concluded → 75%.
    { class_id: "t1", status: "completed", scheduled_at: "2026-06-01T10:00:00Z" },
    { class_id: "t1", status: "completed", scheduled_at: "2026-06-08T10:00:00Z" },
    { class_id: "t1", status: "completed", scheduled_at: "2026-06-15T10:00:00Z" },
    { class_id: "t1", status: "missed", scheduled_at: "2026-06-22T10:00:00Z" },
    // Scheduled today in Tbilisi terms (12:00 UTC = 16:00 local).
    { class_id: "t1", status: "scheduled", scheduled_at: "2026-07-02T12:00:00Z" },
    // Scheduled today only if bucketed in UTC — 21:00 UTC is 01:00 on the 3rd
    // in Tbilisi, so it must NOT count as today.
    { class_id: "t1", status: "scheduled", scheduled_at: "2026-07-02T21:00:00Z" },
    // A lesson in a class this tutor doesn't teach — ignored.
    { class_id: "other", status: "completed", scheduled_at: "2026-06-01T10:00:00Z" },
  ];

  function build() {
    return buildDashboardStats({
      teachingClassIds: ["t1"],
      attendingClassIds: [],
      studentUserIds: ["s1", "s2", "s1"], // duplicates collapse
      lessons,
      tutorSubmissions: [
        { homework_id: "hw1", grade: null },
        { homework_id: "hw1", grade: "Well done" },
        { homework_id: "hw2", grade: null },
      ],
      homeworkIds: ["hw1", "hw2"],
      myPendingFeedback: 0,
    });
  }

  it("counts distinct students", () => {
    vi.setSystemTime(NOW);
    const { stats } = build();
    expect(stats.find((s) => s.label === "Students")?.value).toBe(2);
  });

  it("computes attendance over concluded lessons only", () => {
    vi.setSystemTime(NOW);
    const { stats } = build();
    expect(stats.find((s) => s.label === "Avg. attendance")?.value).toBe("75%");
  });

  it("counts ungraded submissions to grade", () => {
    vi.setSystemTime(NOW);
    const { stats } = build();
    expect(stats.find((s) => s.label === "To grade")?.value).toBe(2);
  });

  it("buckets 'sessions today' by the Tbilisi day, not the UTC day", () => {
    vi.setSystemTime(NOW);
    const { greetingSub } = build();
    // Only the 12:00 UTC lesson is today in Tbilisi; the 21:00 UTC one is tomorrow.
    expect(greetingSub).toContain("1 session today");
  });
});

describe("buildDashboardStats (student)", () => {
  it("reports enrolment and pending feedback", () => {
    vi.setSystemTime(new Date("2026-07-02T10:00:00Z"));
    const { stats, greetingSub } = buildDashboardStats({
      teachingClassIds: [],
      attendingClassIds: ["c1", "c2"],
      studentUserIds: [],
      lessons: [
        { class_id: "c1", status: "completed", scheduled_at: "2026-06-01T10:00:00Z" },
        { class_id: "c1", status: "missed", scheduled_at: "2026-06-08T10:00:00Z" },
      ],
      tutorSubmissions: [],
      homeworkIds: [],
      myPendingFeedback: 3,
    });

    expect(stats.find((s) => s.label === "Active classes")?.value).toBe(2);
    expect(stats.find((s) => s.label === "Avg. attendance")?.value).toBe("50%");
    expect(stats.find((s) => s.label === "To grade")?.value).toBe(3);
    expect(greetingSub).toBe("You're enrolled in 2 classes.");
  });
});
