import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import type { ClassRole } from "@/lib/types";

export type { ClassRole };

/**
 * Shared server-side auth guards.
 *
 * These centralise the `getUser()` + membership/role checks that were
 * previously copy-pasted into every server page. Call them at the top of a
 * Server Component (or Server Action) — they redirect on failure and return
 * the verified data on success, so the rest of the function can assume a
 * valid, authorised user.
 *
 * NOTE: until RLS is enabled these are app-layer guards only. They protect
 * the rendered pages, not the database. The database-level equivalent is the
 * RLS work tracked in PRODUCTION-TASKS-BY-DIFFICULTY.md.
 */

/** Returns the authenticated user, or redirects to /login. */
export async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Ensures the current user is a member of the given class.
 * Redirects unauthenticated users to /login and non-members to /dashboard.
 * Returns the user and their role within the class.
 */
export async function requireClassMember(classId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("class_members")
    .select("role")
    .eq("class_id", classId)
    .eq("user_id", user.id)
    .single();

  if (!membership) redirect("/dashboard");
  return { user, role: membership.role as ClassRole };
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
