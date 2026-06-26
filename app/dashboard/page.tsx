import { AppShell } from "@/components/shell/app-shell";
import { loadDashboardData } from "@/lib/dashboard-data";
import DashboardHomeClient from "./DashboardHomeClient";

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
