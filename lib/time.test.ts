/* =============================================================================
 * lib/time.test.ts — unit tests for lib/time.ts
 * -----------------------------------------------------------------------------
 * Role: Verifies the app-timezone helpers. These guard against the recurring
 *       bug class where server code (UTC on Vercel) renders times hours off or
 *       buckets "today" on the wrong calendar day. Tbilisi is fixed UTC+4.
 * Dependencies: vitest, lib/time
 * Used by: npm test / CI
 * ========================================================================== */
import { describe, it, expect } from "vitest";
import {
  APP_TIME_ZONE,
  calendarDayDiffInZone,
  dayKeyInZone,
  formatDateInZone,
  formatTimeInZone,
  hourInZone,
  isSameDayInZone,
  zonedWallClockToUtcIso,
} from "./time";

describe("APP_TIME_ZONE", () => {
  it("is pinned to Asia/Tbilisi (fixed UTC+4, no DST)", () => {
    expect(APP_TIME_ZONE).toBe("Asia/Tbilisi");
  });
});

describe("zonedWallClockToUtcIso", () => {
  it("interprets a datetime-local value as Tbilisi wall clock", () => {
    // 18:30 in Tbilisi = 14:30 UTC.
    expect(zonedWallClockToUtcIso("2026-07-03T18:30")).toBe("2026-07-03T14:30:00.000Z");
  });

  it("handles seconds and the space separator", () => {
    expect(zonedWallClockToUtcIso("2026-07-03 08:00:30")).toBe("2026-07-03T04:00:30.000Z");
  });

  it("crosses the date boundary correctly", () => {
    // 02:00 Tbilisi on the 3rd is still the 2nd, 22:00 in UTC.
    expect(zonedWallClockToUtcIso("2026-07-03T02:00")).toBe("2026-07-02T22:00:00.000Z");
  });

  it("passes through values that already carry a zone", () => {
    expect(zonedWallClockToUtcIso("2026-07-03T18:30:00.000Z")).toBe("2026-07-03T18:30:00.000Z");
  });

  it("returns unparseable input unchanged instead of throwing", () => {
    expect(zonedWallClockToUtcIso("not-a-date")).toBe("not-a-date");
  });
});

describe("dayKeyInZone", () => {
  it("buckets a late-UTC instant into the next Tbilisi day", () => {
    // 22:00 UTC on the 2nd is already 02:00 on the 3rd in Tbilisi.
    expect(dayKeyInZone(new Date("2026-07-02T22:00:00Z"))).toBe("2026-07-03");
  });

  it("keeps a mid-day instant on the same day", () => {
    expect(dayKeyInZone(new Date("2026-07-02T10:00:00Z"))).toBe("2026-07-02");
  });
});

describe("isSameDayInZone", () => {
  it("treats instants either side of UTC midnight as the same Tbilisi day", () => {
    // 21:00 UTC (= 01:00 on the 3rd) and 04:00 UTC on the 3rd (= 08:00).
    const a = new Date("2026-07-02T21:00:00Z");
    const b = new Date("2026-07-03T04:00:00Z");
    expect(isSameDayInZone(a, b)).toBe(true);
  });

  it("separates instants that fall on different Tbilisi days", () => {
    const a = new Date("2026-07-02T10:00:00Z");
    const b = new Date("2026-07-02T21:00:00Z"); // already the 3rd in Tbilisi
    expect(isSameDayInZone(a, b)).toBe(false);
  });
});

describe("calendarDayDiffInZone", () => {
  it("is 0 within the same Tbilisi day", () => {
    const base = new Date("2026-07-02T10:00:00Z");
    const target = new Date("2026-07-02T15:00:00Z");
    expect(calendarDayDiffInZone(target, base)).toBe(0);
  });

  it("is 1 for tomorrow even when under 24h apart", () => {
    // 19:00 UTC (= 23:00 Tbilisi) → next instant 21:00 UTC = 01:00 Tbilisi on the 3rd.
    const base = new Date("2026-07-02T19:00:00Z");
    const target = new Date("2026-07-02T21:00:00Z");
    expect(calendarDayDiffInZone(target, base)).toBe(1);
  });

  it("is negative for past days", () => {
    const base = new Date("2026-07-05T10:00:00Z");
    const target = new Date("2026-07-02T10:00:00Z");
    expect(calendarDayDiffInZone(target, base)).toBe(-3);
  });
});

describe("hourInZone", () => {
  it("shifts a UTC hour into Tbilisi (+4)", () => {
    expect(hourInZone(new Date("2026-07-02T10:00:00Z"))).toBe(14);
  });

  it("wraps past midnight without emitting 24", () => {
    expect(hourInZone(new Date("2026-07-02T20:00:00Z"))).toBe(0);
  });
});

describe("formatTimeInZone / formatDateInZone", () => {
  it("formats time as 24h in the app zone", () => {
    expect(formatTimeInZone(new Date("2026-07-02T14:30:00Z"))).toBe("18:30");
  });

  it("formats the date in the app zone, not the host zone", () => {
    // 21:00 UTC on the 2nd is already Friday the 3rd in Tbilisi.
    const label = formatDateInZone(new Date("2026-07-02T21:00:00Z"), {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    expect(label).toContain("3");
    expect(label).toContain("Jul");
    expect(label).toContain("Fri");
  });
});
