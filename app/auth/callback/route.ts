/* =============================================================================
 * app/auth/callback/route.ts — OAuth / magic-link PKCE callback
 * -----------------------------------------------------------------------------
 * Role: Exchanges ?code= from Supabase email links for a session cookie, then
 *       redirects to the app (default /dashboard).
 * Dependencies: lib/supabase/server.ts
 * Used by: Supabase Auth redirect URL /auth/callback
 * Inputs: GET with code, optional next path
 * Outputs: Redirect with session set, or /login?error=auth on failure
 * ========================================================================== */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}?verified=1`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
}
