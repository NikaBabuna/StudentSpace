/* =============================================================================
 * lib/auth.ts — server-side auth guards and cached loaders
 * -----------------------------------------------------------------------------
 * Role: Centralises getUser(), membership, and class row checks for Server
 *       Components and actions. Redirects on failure; returns verified data on
 *       success. React.cache() dedupes reads within one request.
 * Dependencies: lib/supabase/server.ts, lib/types (ClassRole)
 * Used by: Protected app route pages and layouts (not server actions)
 * Inputs: classId, userId where applicable
 * Outputs: User, membership row, class row; or redirect to /login
 * Note: App-layer guards until RLS is fully verified in production.
 * ========================================================================== */
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ClassRole } from "@/lib/types";

export type { ClassRole };

/**
 * Shared server-side auth guards + request-scoped data loaders.
 *
 * These centralise the `getUser()` + membership/role checks that were
 * previously copy-pasted into every server page. Call them at the top of a
 * Server Component (or Server Action) — they redirect on failure and return
 * the verified data on success, so the rest of the function can assume a
 * valid, authorised user.
 *
 * The read helpers are wrapped in React `cache()`, which memoises by arguments
 * for the duration of a single request. Because a layout and the page it wraps
 * render in the same request, calling e.g. `getCurrentUser()` or
 * `getClassMembership(id, uid)` in both does the network round-trip *once* and
 * reuses the result — eliminating the duplicate auth/membership/class fetches
 * that used to run in the layout and then again in every page.
 *
 * NOTE: until RLS is enabled these are app-layer guards only. They protect
 * the rendered pages, not the database. The database-level equivalent is the
 * RLS work tracked in docs/ROADMAP.md.
 */

/** One Supabase server client per request (cookies read once, client reused). */
export const getServerClient = cache(() => createClient());

/** The authenticated user for this request, or null. Deduped per request. */
export const getCurrentUser = cache(async () => {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** Returns the authenticated user, or redirects to /login. */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Profile fields for the persistent dashboard shell. Deduped per request. */
export const getShellUser = cache(async () => {
  const user = await requireAuth();
  const supabase = await getServerClient();
  const { data: profile } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const fullName = profile?.full_name ?? "";
  const initials = fullName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return { user, fullName, initials };
});

/** The current user's membership row for a class, or null. Deduped per request. */
export const getClassMembership = cache(async (classId: string, userId: string) => {
  const supabase = await getServerClient();
  const { data } = await supabase
    .from("class_members")
    .select("role")
    .eq("class_id", classId)
    .eq("user_id", userId)
    .single();
  return data ? { role: data.role as ClassRole } : null;
});

/** Full class row (the columns the app needs), or null. Deduped per request. */
export const getClassRow = cache(async (classId: string) => {
  const supabase = await getServerClient();
  const { data } = await supabase
    .from("classes")
    .select(
      "id, title, subject, level, cycle_hours, description, tutor_notes, created_by, deleted_at"
    )
    .eq("id", classId)
    .single();
  return data;
});

/**
 * Ensures the current user is a member of the given class.
 * Redirects unauthenticated users to /login and non-members to /dashboard.
 * Returns the user and their role within the class.
 */
export async function requireClassMember(classId: string) {
  const user = await requireAuth();
  const membership = await getClassMembership(classId, user.id);
  if (!membership) redirect("/dashboard");
  return { user, role: membership.role };
}

/**
 * Ensures the current user is the tutor of the given class.
 * Non-tutor members are sent to the class overview instead of being
 * dropped to the dashboard, so they land somewhere they can actually see.
 */
export async function requireTutor(classId: string) {
  const { user, role } = await requireClassMember(classId);
  if (role !== "tutor") redirect(`/classes/${classId}/overview`);
  return { user, role };
}
