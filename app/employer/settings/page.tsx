/* =============================================================================
 * app/employer/settings/page.tsx — employer settings placeholder
 * -----------------------------------------------------------------------------
 * Role: Static “coming soon” page inside employer portal.
 * Dependencies: None
 * Used by: Route /employer/settings
 * Inputs/outputs: Placeholder UI only
 * ========================================================================== */
export default function EmployerSettingsPage() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-line px-6 py-4">
        <h1 className="text-base font-medium text-ink">Settings</h1>
        <p className="mt-0.5 text-[11px] text-muted">Coming soon</p>
      </div>
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <div className="mb-2 text-sm font-medium text-ink-2">Not yet available</div>
          <div className="text-xs text-muted">
            Organisation settings are coming in a future update.
          </div>
        </div>
      </div>
    </div>
  );
}
