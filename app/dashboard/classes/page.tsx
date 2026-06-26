import { AppShell } from "@/components/shell/app-shell";
import { loadDashboardData } from "@/lib/dashboard-data";
import ClassesClient from "../ClassesClient";

export default async function MyClassesPage() {
  const data = await loadDashboardData();

  return (
    <AppShell
      mode="dashboard"
      tutorInitials={data.userInitials}
      tutorName={data.fullName}
      role="tutor"
      breadcrumb={{ root: "My classes" }}
    >
      <ClassesClient
        allClasses={data.allClasses}
        teaching={data.teaching}
        attending={data.attending}
        observing={data.observing}
      />
    </AppShell>
  );
}
