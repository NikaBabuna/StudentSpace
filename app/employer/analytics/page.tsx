/* =============================================================================
 * app/employer/analytics/page.tsx — employer analytics (placeholder)
 * -----------------------------------------------------------------------------
 * Role: Organisation-wide analytics are still being built; this tab shows a
 *       "coming in the next update" placeholder. Gated by the employer layout.
 * Dependencies: EmployerComingSoon, components/icons
 * Used by: Route /employer/analytics
 * Inputs/outputs: Static placeholder UI only
 * ========================================================================== */
import { AnalyticsIcon } from "@/components/icons";
import { EmployerComingSoon } from "@/features/employer/components/EmployerComingSoon";

export default function EmployerAnalyticsPage() {
  return (
    <EmployerComingSoon
      title="Analytics"
      icon={<AnalyticsIcon size={22} />}
      description="Analytics across your tutors and classes — hours, completion and earnings — are coming in a future update."
    />
  );
}
