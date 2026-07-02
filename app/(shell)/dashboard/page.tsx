/* =============================================================================
 * app/(shell)/dashboard/page.tsx — tutor dashboard home route
 * -----------------------------------------------------------------------------
 * Role: Loads batched dashboard data and renders DashboardHomeClient.
 * Shell (sidebar + topbar) lives in app/(shell)/layout.tsx.
 * ========================================================================== */
import { loadDashboardData } from "@/lib/dashboard-data";
import DashboardHomeClient from "@/features/dashboard/components/DashboardHomeClient";

export default async function DashboardPage() {
  const data = await loadDashboardData();

  return (
    <DashboardHomeClient
      dateLabel={data.dateLabel}
      greeting={data.greeting}
      greetingSub={data.greetingSub}
      stats={data.stats}
      allClasses={data.allClasses}
      todaySessions={data.todaySessions}
      upcomingSessions={data.upcomingSessions}
      homeworkAttention={data.homeworkAttention}
      classesHeading={data.classesHeading}
      homeworkHeading={data.homeworkHeading}
    />
  );
}
