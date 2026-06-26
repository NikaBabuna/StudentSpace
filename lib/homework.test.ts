/* =============================================================================
 * lib/homework.test.ts — unit tests for lib/homework.ts
 * -----------------------------------------------------------------------------
 * Role: Verifies deadlineStatus() and canSubmit() edge cases with fixed dates.
 * Dependencies: vitest, lib/homework
 * Used by: npm test / CI
 * ========================================================================== */
import { describe, it, expect } from "vitest";
import { deadlineStatus, canSubmit } from "./homework";

const now = new Date("2026-06-20T12:00:00Z");
const iso = (d: Date) => d.toISOString();
const hours = (n: number) => iso(new Date(now.getTime() + n * 3600_000));

describe("deadlineStatus", () => {
  it("returns overdue for a past deadline", () => {
    expect(deadlineStatus(hours(-1), now)).toBe("overdue");
  });

  it("returns today within 24h", () => {
    expect(deadlineStatus(hours(5), now)).toBe("today");
    expect(deadlineStatus(hours(23), now)).toBe("today");
  });

  it("returns soon within 3 days", () => {
    expect(deadlineStatus(hours(48), now)).toBe("soon");
  });

  it("returns upcoming beyond 3 days", () => {
    expect(deadlineStatus(hours(24 * 5), now)).toBe("upcoming");
  });
});

describe("canSubmit", () => {
  it("allows submission before the deadline", () => {
    expect(canSubmit(hours(1), now)).toBe(true);
  });

  it("blocks submission after the deadline", () => {
    expect(canSubmit(hours(-1), now)).toBe(false);
  });
});
