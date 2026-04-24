import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import InboxClient from "./InboxClient";

export default async function InboxPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users").select("full_name").eq("id", user.id).single();

  const { data: invites } = await supabase
    .from("invites")
    .select(`
      id, role, status, created_at,
      classes (id, title, subject, level),
      invited_by_user:users!invites_invited_by_fkey (full_name)
    `)
    .eq("invited_user_id", user.id)
    .order("created_at", { ascending: false });

  const { data: parentRequests } = await supabase
    .from("parent_requests")
    .select(`
      id, status, created_at,
      parent:users!parent_requests_parent_id_fkey (id, full_name)
    `)
    .eq("student_id", user.id)
    .order("created_at", { ascending: false });

  const fullName = profile?.full_name ?? "";
  const userInitials = fullName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <AppLayout mode="dashboard" tutorInitials={userInitials} tutorName={fullName} role="tutor">
      <InboxClient
        invites={invites ?? []}
        parentRequests={parentRequests ?? []}
        userId={user.id}
      />
    </AppLayout>
  );
}