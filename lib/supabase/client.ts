/* =============================================================================
 * lib/supabase/client.ts — browser Supabase client
 * -----------------------------------------------------------------------------
 * Role: Creates the Supabase client used in Client Components (login, signup,
 *       Realtime chat, direct storage uploads). Runs only in the browser.
 * Dependencies: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 *               lib/database.types.ts (Database generic)
 * Used by: app/login, app/signup, features/*Client.tsx, ChatPage
 * Inputs: None (reads env at call time)
 * Outputs: Typed SupabaseClient<Database>
 * ========================================================================== */
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}