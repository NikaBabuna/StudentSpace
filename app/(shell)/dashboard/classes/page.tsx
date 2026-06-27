/* =============================================================================
 * app/(shell)/dashboard/classes/page.tsx — all classes list route
 * -----------------------------------------------------------------------------
 * Role: Reuses loadDashboardData() and renders ClassesClient.
 * Shell lives in app/(shell)/layout.tsx.
 * ========================================================================== */
import { loadDashboardData } from "@/lib/dashboard-data";
import ClassesClient from "@/features/dashboard/components/ClassesClient";

export default async function MyClassesPage() {
  const data = await loadDashboardData();

  return (
    <ClassesClient
      allClasses={data.allClasses}
      teaching={data.teaching}
      attending={data.attending}
      observing={data.observing}
    />
  );
}
