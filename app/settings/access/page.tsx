import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import AccessClient from "./AccessClient";

export default async function AccessPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users").select("full_name").eq("id", user.id).single();

  // Children this user has linked
  const { data: children } = await supabase
    .from("parent_students")
    .select(`student:users!parent_students_student_id_fkey (id, full_name)`)
    .eq("parent_id", user.id);

  // Parents linked to this user
  const { data: parents } = await supabase
    .from("parent_students")
    .select(`parent:users!parent_students_parent_id_fkey (id, full_name)`)
    .eq("student_id", user.id);

  // Pending requests this user sent (as parent)
  const { data: sentRequests } = await supabase
    .from("parent_requests")
    .select(`
      id, status, created_at,
      student:users!parent_requests_student_id_fkey (id, full_name)
    `)
    .eq("parent_id", user.id)
    .eq("status", "pending");

  const fullName = profile?.full_name ?? "";
  const userInitials = fullName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <AppLayout mode="dashboard" tutorInitials={userInitials} tutorName={fullName} role="tutor">
      <AccessClient
        userId={user.id}
        children={children ?? []}
        parents={parents ?? []}
        sentRequests={sentRequests ?? []}
      />
    </AppLayout>
  );
}