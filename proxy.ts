import { type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

// Next.js 16 renamed the "middleware" convention to "proxy". This runs before
// every matched request: it refreshes the Supabase session cookie and gates
// protected routes (see utils/supabase/middleware.ts).
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
