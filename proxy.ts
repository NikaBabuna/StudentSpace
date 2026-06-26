/* =============================================================================
 * proxy.ts — request gate (Next.js 16 “proxy”, formerly middleware)
 * -----------------------------------------------------------------------------
 * Role: Runs before every matched request. Keeps the Supabase session cookie
 *       fresh and blocks unauthenticated access to protected route prefixes.
 * Dependencies: lib/supabase/middleware.ts (updateSession)
 * Used by: Next.js runtime on each HTTP request
 * Inputs: NextRequest from the incoming browser/API call
 * Outputs: NextResponse — either next() with refreshed cookies or redirect
 *          to /login for protected paths without a session
 * ========================================================================== */
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on all request paths except:
     * - _next/static, _next/image (build assets)
     * - favicon and common image/font file extensions
     * Auth routes (/auth/*) are intentionally matched so the session cookie
     * stays fresh during the email-confirmation redirect.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
