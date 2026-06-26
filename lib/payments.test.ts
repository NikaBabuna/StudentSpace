/* =============================================================================
 * lib/payments.test.ts — unit tests for lib/payments.ts
 * -----------------------------------------------------------------------------
 * Role: Verifies sumCompletedHours() and computeCycleClose() (A2 rollover).
 * Dependencies: vitest, lib/payments
 * Used by: npm test / CI
 * ========================================================================== */
import { describe, it, expect } from "vitest";
import { sumCompletedHours, computeCycleClose } from "./payments";

describe("sumCompletedHours", () => {
  const lessons = [
    { duration_hours: 2, status: "completed", payment_cycle_id: "c1" },
    { duration_hours: 1.5, status: "completed", payment_cycle_id: "c1" },
    { duration_hours: 3, status: "scheduled", payment_cycle_id: "c1" },
    { duration_hours: 2, status: "completed", payment_cycle_id: "c2" },
    { duration_hours: 1, status: "missed", payment_cycle_id: "c1" },
  ];

  it("sums only completed lessons in the given cycle", () => {
    expect(sumCompletedHours(lessons, "c1")).toBe(3.5);
  });

  it("ignores other cycles", () => {
    expect(sumCompletedHours(lessons, "c2")).toBe(2);
  });

  it("returns 0 for a cycle with no completed lessons", () => {
    expect(sumCompletedHours(lessons, "c3")).toBe(0);
  });
});

describe("computeCycleClose", () => {
  it("does not close when below target", () => {
    expect(
      computeCycleClose({ hoursInCycle: 4, lessonHours: 2, cycleTarget: 8 })
    ).toEqual({ closesCycle: false, overflowHours: 0 });
  });

  it("closes exactly at target with no overflow", () => {
    expect(
      computeCycleClose({ hoursInCycle: 6, lessonHours: 2, cycleTarget: 8 })
    ).toEqual({ closesCycle: true, overflowHours: 0 });
  });

  it("closes and carries overflow when exceeding target", () => {
    expect(
      computeCycleClose({ hoursInCycle: 7, lessonHours: 3, cycleTarget: 8 })
    ).toEqual({ closesCycle: true, overflowHours: 2 });
  });

  it("handles fractional hours", () => {
    expect(
      computeCycleClose({ hoursInCycle: 7.5, lessonHours: 1, cycleTarget: 8 })
    ).toEqual({ closesCycle: true, overflowHours: 0.5 });
  });
});
