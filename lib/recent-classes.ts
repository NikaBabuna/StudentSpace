/* =============================================================================
 * lib/recent-classes.ts — recently visited class helpers
 * -----------------------------------------------------------------------------
 * Persists class visit timestamps in localStorage so the dashboard can surface
 * the classes the user actually opens most often.
 * ========================================================================== */

import type { DashboardClassRow } from "@/lib/dashboard-data";

export const RECENT_CLASSES_STORAGE_KEY = "recent-classes";

const MAX_RECENT = 20;

export type RecentClassVisit = {
  classId: string;
  visitedAt: number;
};

export function readRecentClassVisits(): RecentClassVisit[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_CLASSES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is RecentClassVisit =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as RecentClassVisit).classId === "string" &&
          typeof (item as RecentClassVisit).visitedAt === "number"
      )
      .slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

export function recordClassVisit(classId: string): void {
  if (typeof window === "undefined" || !classId) return;
  try {
    const visits = readRecentClassVisits().filter((v) => v.classId !== classId);
    visits.unshift({ classId, visitedAt: Date.now() });
    localStorage.setItem(RECENT_CLASSES_STORAGE_KEY, JSON.stringify(visits.slice(0, MAX_RECENT)));
  } catch {
    /* private mode / storage disabled */
  }
}

export function sortClassesByRecency(
  classes: DashboardClassRow[],
  visits: RecentClassVisit[]
): DashboardClassRow[] {
  const visitMap = new Map(visits.map((v) => [v.classId, v.visitedAt]));

  return [...classes].sort((a, b) => {
    const aTs = visitMap.get(a.id);
    const bTs = visitMap.get(b.id);
    if (aTs != null && bTs != null) return bTs - aTs;
    if (aTs != null) return -1;
    if (bTs != null) return 1;

    if (a.nextSession && !b.nextSession) return -1;
    if (!a.nextSession && b.nextSession) return 1;
    return a.title.localeCompare(b.title);
  });
}

/** Sort when visit history is unavailable (SSR / first paint). */
export function sortClassesForPreview(classes: DashboardClassRow[]): DashboardClassRow[] {
  return sortClassesByRecency(classes, []);
}

export function sortItemsByClassRecency<T extends { classId: string }>(
  items: T[],
  visits: RecentClassVisit[]
): T[] {
  const visitMap = new Map(visits.map((v) => [v.classId, v.visitedAt]));

  return [...items].sort((a, b) => {
    const aTs = visitMap.get(a.classId);
    const bTs = visitMap.get(b.classId);
    if (aTs != null && bTs != null) return bTs - aTs;
    if (aTs != null) return -1;
    if (bTs != null) return 1;
    return 0;
  });
}
