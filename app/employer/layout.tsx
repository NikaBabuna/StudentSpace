/* =============================================================================
 * app/employer/layout.tsx — employer portal gate and shell
 * -----------------------------------------------------------------------------
 * Role: Ensures user is logged in and users.is_employer; wraps children in
 *       EmployerShell. Non-employers redirect to /dashboard.
 * Dependencies: lib/auth, EmployerShell
 * Used by: All /employer/* routes
 * Inputs: children from nested pages
 * Outputs: EmployerShell with profile props + page content
 * ========================================================================== */
import { redirect } from "next/navigation";
import { getCurrentUser, getServerClient } from "@/lib/auth";
import EmployerShell from "@/features/employer/components/EmployerShell";

export default async function EmployerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await getServerClient();
  const { data: profile } = await supabase
    .from("users")
    .select("full_name, is_employer")
    .eq("id", user.id)
    .single();

  if (!profile?.is_employer) redirect("/dashboard");

  const fullName = profile.full_name ?? "";
  const userInitials = fullName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <EmployerShell fullName={fullName} userInitials={userInitials}>
      {children}
    </EmployerShell>
  );
}
