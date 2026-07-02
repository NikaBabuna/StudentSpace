/* =============================================================================
 * lib/time.ts — timezone helpers (app-canonical zone)
 * -----------------------------------------------------------------------------
 * Role: One canonical timezone for the whole app so server and client agree.
 *       Timestamps are stored in UTC; anything the server formats or buckets by
 *       day must go through here, because Server Components/Actions run in the
 *       host's zone (UTC on Vercel) — using toLocale* there silently renders a
 *       few hours off. Also converts a naive `datetime-local` wall-clock (which
 *       has no zone) into the correct UTC instant.
 * Dependencies: Intl (no external date library)
 * Used by: lib/dashboard-data, features/homework/actions
 * Note: Georgia (Asia/Tbilisi) is a fixed UTC+4 with no DST, so the wall-clock
 *       ↔ UTC conversion here is exact for the app's users.
 * ========================================================================== */

/** The single timezone the app reasons in (mirrors users.timezone default). */
export const APP_TIME_ZONE = "Asia/Tbilisi";

/**
 * Offset (ms) of `timeZone` from UTC at a given instant — the standard
 * dependency-free technique: format the instant in the zone, read the parts
 * back as if they were UTC, and diff. Positive east of UTC (Tbilisi = +4h).
 */
function zoneOffsetMs(instantMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instantMs));

  const f: Record<string, number> = {};
  for (const p of parts) if (p.type !== "literal") f[p.type] = Number(p.value);
  const hour = f.hour === 24 ? 0 : f.hour; // some engines emit 24 for midnight

  const wallAsUtc = Date.UTC(f.year, f.month - 1, f.day, hour, f.minute, f.second);
  return wallAsUtc - instantMs;
}

/**
 * Convert a naive wall-clock string ("yyyy-MM-ddTHH:mm[:ss]", as produced by an
 * <input type="datetime-local">) into a UTC ISO string, interpreting the
 * wall-clock in `timeZone`. This is what a `datetime-local` value means to the
 * user — a local time — regardless of where the code runs.
 */
export function zonedWallClockToUtcIso(naive: string, timeZone = APP_TIME_ZONE): string {
  // A value that already carries a zone (Z or ±hh[:]mm) is an instant, not a
  // wall clock — normalise and return it. Checked BEFORE the wall-clock regex,
  // which would otherwise match the prefix and shift the time by the zone
  // offset (a bug lib/time.test.ts guards against).
  if (/(?:Z|[+-]\d{2}:?\d{2})$/.test(naive)) {
    const parsed = new Date(naive);
    return Number.isNaN(parsed.getTime()) ? naive : parsed.toISOString();
  }

  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(naive);
  if (!m) {
    // Unexpected shape — trust it if parseable.
    const parsed = new Date(naive);
    return Number.isNaN(parsed.getTime()) ? naive : parsed.toISOString();
  }
  const [, y, mo, d, h, mi, s] = m;
  const wallAsUtc = Date.UTC(+y, +mo - 1, +d, +h, +mi, s ? +s : 0);
  const offset = zoneOffsetMs(wallAsUtc, timeZone);
  return new Date(wallAsUtc - offset).toISOString();
}

/** Calendar day of an instant, in the app zone, as "yyyy-MM-dd". */
export function dayKeyInZone(date: Date, timeZone = APP_TIME_ZONE): string {
  return date.toLocaleDateString("en-CA", { timeZone }); // en-CA => ISO yyyy-mm-dd
}

/** True when two instants fall on the same calendar day in the app zone. */
export function isSameDayInZone(a: Date, b: Date, timeZone = APP_TIME_ZONE): boolean {
  return dayKeyInZone(a, timeZone) === dayKeyInZone(b, timeZone);
}

/** Whole calendar days from `base` to `target` in the app zone (target − base). */
export function calendarDayDiffInZone(target: Date, base: Date, timeZone = APP_TIME_ZONE): number {
  const t = Date.parse(`${dayKeyInZone(target, timeZone)}T00:00:00Z`);
  const b = Date.parse(`${dayKeyInZone(base, timeZone)}T00:00:00Z`);
  return Math.round((t - b) / 86_400_000);
}

/** Hour of day (0–23) of an instant, in the app zone. */
export function hourInZone(date: Date, timeZone = APP_TIME_ZONE): number {
  const h = Number(
    date.toLocaleTimeString("en-GB", { hour: "2-digit", hour12: false, timeZone })
  );
  return h === 24 ? 0 : h; // some engines emit 24 for midnight
}

/** "16:00" in the app zone (24h). */
export function formatTimeInZone(date: Date, timeZone = APP_TIME_ZONE): string {
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  });
}

/** Format a date in the app zone with the given Intl options (en-GB locale). */
export function formatDateInZone(
  date: Date,
  options: Intl.DateTimeFormatOptions,
  timeZone = APP_TIME_ZONE
): string {
  return date.toLocaleDateString("en-GB", { ...options, timeZone });
}
