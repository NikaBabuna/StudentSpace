/* =============================================================================
 * app/dashboard/classes/page.tsx — all classes list route
 * -----------------------------------------------------------------------------
 * Role: Reuses loadDashboardData() and renders ClassesClient in AppShell.
 * Dependencies: lib/dashboard-data, AppShell, ClassesClient
 * Used by: Route /dashboard/classes
 * Inputs: Session + class membership queries
 * Outputs: Grouped class list UI
 * ========================================================================== */
import { AppShell } from "@/components/shell/app-shell";
import { loadDashboardData } from "@/lib/dashboard-data";
import ClassesClient from "@/features/dashboard/components/ClassesClient";

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
