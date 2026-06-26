/* =============================================================================
 * app/dashboard/page.tsx — tutor dashboard home route
 * -----------------------------------------------------------------------------
 * Role: Loads batched dashboard data and renders AppShell + DashboardHomeClient.
 * Dependencies: lib/dashboard-data, components/shell/app-shell, DashboardHomeClient
 * Used by: Route /dashboard
 * Inputs: Current session (via loadDashboardData)
 * Outputs: Server-rendered dashboard home with serializable props
 * ========================================================================== */
import { AppShell } from "@/components/shell/app-shell";
import { loadDashboardData } from "@/lib/dashboard-data";
import DashboardHomeClient from "@/features/dashboard/components/DashboardHomeClient";

export default async function DashboardPage() {
  const data = await loadDashboardData();

  return (
    <AppShell
      mode="dashboard"
      tutorInitials={data.userInitials}
      tutorName={data.fullName}
      role="tutor"
      breadcrumb={{ root: "Dashboard" }}
    >
      <DashboardHomeClient
        greeting={data.greeting}
        greetingSub={data.greetingSub}
        stats={data.stats}
        allClasses={data.allClasses}
        todaySessions={data.todaySessions}
        homeworkAttention={data.homeworkAttention}
        classesHeading={data.classesHeading}
        homeworkHeading={data.homeworkHeading}
      />
    </AppShell>
  );
}
