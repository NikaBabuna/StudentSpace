/* =============================================================================
 * lib/recent-classes.test.ts — unit tests for lib/recent-classes.ts
 * -----------------------------------------------------------------------------
 * Role: Verifies the pure sorting helpers that order dashboard previews by
 *       recent visits. (The localStorage store itself is browser-only and is
 *       exercised in the running app, not here.)
 * Dependencies: vitest, lib/recent-classes
 * Used by: npm test / CI
 * ========================================================================== */
import { describe, expect, it } from "vitest";
import { sortClassesByRecency, sortItemsByClassRecency } from "./recent-classes";
import type { DashboardClassRow } from "./dashboard-data";

function cls(id: string, title: string, nextSession: string | null = null): DashboardClassRow {
  return {
    id,
    title,
    cycle_hours: 8,
    role: "tutor",
    member_count: 1,
    student_count: 1,
    isCreator: true,
    paymentAmount: null,
    paymentCurrency: "GEL",
    dotColor: "",
    nextSession,
  };
}

describe("sortClassesByRecency", () => {
  const classes = [cls("a", "Algebra"), cls("b", "Biology", "Today 16:00"), cls("c", "Chemistry")];

  it("puts visited classes first, most recent visit leading", () => {
    const visits = [
      { classId: "c", visitedAt: 2000 },
      { classId: "a", visitedAt: 1000 },
    ];
    expect(sortClassesByRecency(classes, visits).map((c) => c.id)).toEqual(["c", "a", "b"]);
  });

  it("prefers classes with an upcoming session among unvisited ones", () => {
    expect(sortClassesByRecency(classes, []).map((c) => c.id)).toEqual(["b", "a", "c"]);
  });

  it("falls back to alphabetical title order", () => {
    const noSessions = [cls("z", "Zoology"), cls("a", "Algebra")];
    expect(sortClassesByRecency(noSessions, []).map((c) => c.id)).toEqual(["a", "z"]);
  });

  it("does not mutate the input array", () => {
    const input = [...classes];
    sortClassesByRecency(input, [{ classId: "c", visitedAt: 1 }]);
    expect(input.map((c) => c.id)).toEqual(["a", "b", "c"]);
  });
});

describe("sortItemsByClassRecency", () => {
  it("orders items by their class's visit recency, keeping unvisited order stable", () => {
    const items = [
      { id: "h1", classId: "a" },
      { id: "h2", classId: "b" },
      { id: "h3", classId: "c" },
    ];
    const visits = [{ classId: "b", visitedAt: 5000 }];
    expect(sortItemsByClassRecency(items, visits).map((i) => i.id)).toEqual(["h2", "h1", "h3"]);
  });
});
