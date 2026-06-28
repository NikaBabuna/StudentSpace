/* =============================================================================
 * app/employer/settings/page.tsx — employer settings (placeholder)
 * -----------------------------------------------------------------------------
 * Role: Organisation settings are still being built; this tab shows a
 *       "coming in the next update" placeholder. Gated by the employer layout.
 * Dependencies: EmployerComingSoon, components/icons
 * Used by: Route /employer/settings
 * Inputs/outputs: Static placeholder UI only
 * ========================================================================== */
import { SettingsIcon } from "@/components/icons";
import { EmployerComingSoon } from "@/features/employer/components/EmployerComingSoon";

export default function EmployerSettingsPage() {
  return (
    <EmployerComingSoon
      title="Settings"
      icon={<SettingsIcon size={22} />}
      description="Organisation settings — members, billing and access — are coming in a future update."
    />
  );
}
