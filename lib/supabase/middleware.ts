/* =============================================================================
 * lib/supabase/middleware.ts — session refresh and route protection
 * -----------------------------------------------------------------------------
 * Role: (1) Refresh Supabase auth cookies so Server Components stay logged in.
 *       (2) Redirect guests away from /dashboard, /classes, /inbox, /settings,
 *           /employer to /login.
 * Dependencies: @supabase/ssr, env vars, database.types
 * Used by: proxy.ts
 * Inputs: NextRequest (path, cookies)
 * Outputs: NextResponse with updated session cookies or login redirect
 * ========================================================================== */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";

// Route prefixes that require an authenticated session. Public routes
// (`/`, `/login`, `/signup`, `/auth/*`) are intentionally absent so the
// login and email-confirmation flows stay reachable while logged out.
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/classes",
  "/inbox",
  "/settings",
  "/employer",
];

/**
 * Refreshes the Supabase auth session on every request and gates protected
 * routes. Two responsibilities:
 *
 * 1. Keep the session cookie fresh. Server Components cannot write cookies, so
 *    without a middleware refresh the access token can silently expire and
 *    users get logged out mid-session. This is the canonical @supabase/ssr
 *    pattern and the main reason this file exists.
 * 2. Redirect unauthenticated requests for protected routes to /login, so auth
 *    is enforced in one place instead of being copy-pasted onto every page.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: do not run code between createServerClient and getUser().
  // getUser() revalidates the token and refreshes the cookie above.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Always return supabaseResponse so refreshed cookies are persisted.
  return supabaseResponse;
}
