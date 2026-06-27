/* =============================================================================
 * app/(shell)/layout.tsx — persistent dashboard shell
 * -----------------------------------------------------------------------------
 * Wraps all dashboard-mode routes (dashboard, inbox, settings, calendar, new
 * class). The sidebar and topbar render once here and stay mounted during
 * client navigation — only the main content area suspends (see each route's
 * loading.tsx). Class session routes use their own layout under classes/[id].
 * ========================================================================== */
import { AppShell } from "@/components/shell/app-shell";
import { getShellUser } from "@/lib/auth";

export default async function DashboardShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { fullName, initials } = await getShellUser();

  return (
    <AppShell
      mode="dashboard"
      tutorInitials={initials}
      tutorName={fullName}
      role="tutor"
      autoBreadcrumb
    >
      {children}
    </AppShell>
  );
}
