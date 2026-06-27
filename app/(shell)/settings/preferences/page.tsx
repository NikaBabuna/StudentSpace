/* =============================================================================
 * app/(shell)/settings/preferences/page.tsx
 * -----------------------------------------------------------------------------
 * Placeholder settings screen. Shell lives in app/(shell)/layout.tsx.
 * ========================================================================== */
import { PageContainer, PageHeader } from "@/components/shell/page-container";
import { EmptyState } from "@/components/ui/empty-state";
import { SettingsIcon } from "@/components/icons";

export default function PreferencesPage() {
  return (
    <PageContainer>
      <PageHeader title="Preferences" sub="Customise how StudentSpace works for you." />
      <EmptyState
        icon={<SettingsIcon size={20} />}
        title="Not yet available"
        description="Preferences and customisation options are coming in a future update."
      />
    </PageContainer>
  );
}
