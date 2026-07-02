/* =============================================================================
 * lib/rate-limit.test.ts — unit tests for lib/rate-limit.ts
 * -----------------------------------------------------------------------------
 * Role: Verifies the fixed-window limiter: allows up to the limit, rejects
 *       beyond it, resets after the window, and isolates keys.
 * Dependencies: vitest (fake timers), lib/rate-limit
 * Used by: npm test / CI
 * ========================================================================== */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit } from "./rate-limit";

// Unique keys per test so the module-level Map never bleeds state between tests.
let n = 0;
const freshKey = () => `test-key-${++n}`;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("checkRateLimit", () => {
  it("allows calls up to the limit", () => {
    const key = freshKey();
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(key, 5, 60_000)).toBe(true);
    }
  });

  it("rejects the call after the limit is reached", () => {
    const key = freshKey();
    for (let i = 0; i < 3; i++) checkRateLimit(key, 3, 60_000);
    expect(checkRateLimit(key, 3, 60_000)).toBe(false);
  });

  it("resets after the window expires", () => {
    const key = freshKey();
    for (let i = 0; i < 3; i++) checkRateLimit(key, 3, 60_000);
    expect(checkRateLimit(key, 3, 60_000)).toBe(false);

    vi.advanceTimersByTime(60_001);
    expect(checkRateLimit(key, 3, 60_000)).toBe(true);
  });

  it("does not reset mid-window", () => {
    const key = freshKey();
    for (let i = 0; i < 3; i++) checkRateLimit(key, 3, 60_000);

    vi.advanceTimersByTime(30_000);
    expect(checkRateLimit(key, 3, 60_000)).toBe(false);
  });

  it("tracks keys independently", () => {
    const a = freshKey();
    const b = freshKey();
    for (let i = 0; i < 3; i++) checkRateLimit(a, 3, 60_000);
    expect(checkRateLimit(a, 3, 60_000)).toBe(false);
    expect(checkRateLimit(b, 3, 60_000)).toBe(true);
  });

  it("sweeps expired windows once the map grows large, keeping live ones", () => {
    // Fill past the sweep threshold with short-lived windows…
    for (let i = 0; i < 1001; i++) checkRateLimit(`sweep-${freshKey()}`, 1, 1_000);
    // …plus one live window that must survive the sweep.
    const live = freshKey();
    for (let i = 0; i < 2; i++) checkRateLimit(live, 2, 120_000);

    vi.advanceTimersByTime(2_000); // expire the short windows only
    checkRateLimit(freshKey(), 1, 1_000); // triggers the sweep

    // The live window survived the sweep — still at its limit.
    expect(checkRateLimit(live, 2, 120_000)).toBe(false);
  });
});
