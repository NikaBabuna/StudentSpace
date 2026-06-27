/* =============================================================================
 * app/(shell)/calendar/page.tsx — all-classes calendar route
 * -----------------------------------------------------------------------------
 * Role: Loads every lesson across the user's classes and renders CalendarClient.
 * Shell lives in app/(shell)/layout.tsx.
 * ========================================================================== */
import { loadCalendarData } from "@/lib/calendar-data";
import CalendarClient from "@/features/calendar/components/CalendarClient";

export default async function CalendarPage() {
  const data = await loadCalendarData();

  return (
    <CalendarClient userId={data.userId} classes={data.classes} lessons={data.lessons} />
  );
}
