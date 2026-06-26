/* =============================================================================
 * app/settings/preferences/page.tsx
 * -----------------------------------------------------------------------------
 * Placeholder settings screen. Data/auth flow unchanged; presentation moved to
 * the AppShell + primitives (PageHeader, EmptyState) instead of inline styles.
 * ========================================================================== */
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/shell/app-shell";
import { PageContainer, PageHeader } from "@/components/shell/page-container";
import { EmptyState } from "@/components/ui/empty-state";
import { SettingsIcon } from "@/components/icons";

export default async function PreferencesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const fullName = profile?.full_name ?? "";
  const userInitials = fullName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <AppShell
      mode="dashboard"
      tutorInitials={userInitials}
      tutorName={fullName}
      role="tutor"
      breadcrumb={{ root: "Settings", leaf: "Preferences" }}
    >
      <PageContainer>
        <PageHeader title="Preferences" sub="Customise how StudentSpace works for you." />
        <EmptyState
          icon={<SettingsIcon size={20} />}
          title="Not yet available"
          description="Preferences and customisation options are coming in a future update."
        />
      </PageContainer>
    </AppShell>
  );
}
