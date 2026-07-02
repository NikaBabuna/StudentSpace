/* =============================================================================
 * lib/rate-limit.ts — best-effort in-memory rate limiter
 * -----------------------------------------------------------------------------
 * Role: Throttles abuse-prone server actions (email lookups in invite and
 *       parent-link flows) with a fixed-window counter per user + operation.
 * Dependencies: None
 * Used by: features/classes/actions (invite, create-class),
 *          features/settings/actions (sendParentRequest)
 * Inputs: key (e.g. `invite:${userId}`), limit, window
 * Outputs: checkRateLimit() → true when the call is allowed
 *
 * Limitation (accepted for this app's scale): the counter lives in module
 * memory, so each serverless instance has its own window and a cold start
 * resets it. That still stops casual scripted abuse from a single session.
 * If the app ever needs hard guarantees, swap the Map for Upstash Redis and
 * keep the same function signature.
 * ========================================================================== */

type WindowEntry = { count: number; resetAt: number };

const windows = new Map<string, WindowEntry>();

/** Drop expired windows occasionally so the map can't grow unbounded. */
function sweep(now: number): void {
  if (windows.size < 1000) return;
  for (const [key, entry] of windows) {
    if (entry.resetAt <= now) windows.delete(key);
  }
}

/**
 * Returns true when the caller is within `limit` calls per `windowMs` for
 * `key`; false when the call should be rejected. Callers should return a
 * friendly "try again shortly" error on false.
 */
export function checkRateLimit(key: string, limit = 10, windowMs = 60_000): boolean {
  const now = Date.now();
  sweep(now);

  const entry = windows.get(key);
  if (!entry || entry.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count += 1;
  return entry.count <= limit;
}

// The user-facing message for a rejected call is the SS-RATE-01 entry in
// lib/errors.ts — return it via actionFail("SS-RATE-01") so the hit is logged.
