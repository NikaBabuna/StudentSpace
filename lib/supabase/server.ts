/* =============================================================================
 * lib/supabase/server.ts — server Supabase client (SSR)
 * -----------------------------------------------------------------------------
 * Role: Creates a cookie-aware Supabase client for Server Components and
 *       server actions. Reads/writes auth cookies via next/headers.
 * Dependencies: next/headers, @supabase/ssr, env vars, database.types
 * Used by: lib/auth.ts, app route loaders, features server actions
 * Inputs: None (reads cookies from the current request)
 * Outputs: Async SupabaseClient<Database> bound to the user session
 * ========================================================================== */
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/database.types'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — safe to ignore.
          }
        },
      },
    }
  )
}