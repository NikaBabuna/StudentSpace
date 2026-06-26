/* =============================================================================
 * app/classes/new/page.tsx — create new class wizard route
 * -----------------------------------------------------------------------------
 * Role: Authenticated tutors open the multi-step NewClassForm inside AppShell.
 * Dependencies: lib/auth, AppShell, NewClassForm
 * Used by: Route /classes/new
 * Inputs: Session user profile for shell display
 * Outputs: AppShell + NewClassForm
 * ========================================================================== */
import { getServerClient, requireAuth } from "@/lib/auth";
import { AppShell } from "@/components/shell/app-shell";
import { PageContainer } from "@/components/shell/page-container";
import NewClassForm from "@/features/classes/components/NewClassForm";

export default async function NewClassPage() {
  const user = await requireAuth();
  const supabase = await getServerClient();

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
      breadcrumb={{ root: "Classes", leaf: "New class" }}
    >
      <PageContainer className="max-w-[660px]">
        <NewClassForm />
      </PageContainer>
    </AppShell>
  );
}
