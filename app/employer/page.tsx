/* =============================================================================
 * app/employer/page.tsx — employer portal home (placeholder)
 * -----------------------------------------------------------------------------
 * Role: Organisation overview is still being built; this tab shows a
 *       "coming in the next update" placeholder. Access is gated by the
 *       employer layout (requires users.is_employer).
 * Dependencies: EmployerComingSoon, components/icons
 * Used by: Route /employer
 * Inputs/outputs: Static placeholder UI only
 * ========================================================================== */
import { ClassesIcon } from "@/components/icons";
import { EmployerComingSoon } from "@/features/employer/components/EmployerComingSoon";

export default function EmployerOverviewPage() {
  return (
    <EmployerComingSoon
      title="Overview"
      icon={<ClassesIcon size={22} />}
      description="A cross-tutor view of your organisation’s classes and people is being built. It’ll arrive in a future update."
    />
  );
}
