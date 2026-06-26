/* =============================================================================
 * app/page.tsx — site root redirect
 * -----------------------------------------------------------------------------
 * Role: Sends authenticated users to /dashboard and everyone else to /login.
 *       No UI is rendered — pure redirect.
 * Dependencies: lib/supabase/server.ts, next/navigation
 * Used by: Route /
 * Inputs: Session from cookies
 * Outputs: HTTP redirect response
 * ========================================================================== */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");
  redirect("/login");
}
