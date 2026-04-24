import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import EmployerLayout from "../EmployerLayout";
import InboxClient from "@/app/inbox/InboxClient";

export default async function EmployerInboxPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users").select("full_name, is_employer").eq("id", user.id).single();
  if (!profile?.is_employer) redirect("/dashboard");

  const { data: invites } = await supabase
    .from("invites")
    .select(`
      id, role, status, created_at,
      classes (id, title, subject, level),
      invited_by_user:users!invites_invited_by_fkey (full_name)
    `)
    .eq("invited_user_id", user.id)
    .order("created_at", { ascending: false });

  const fullName = profile.full_name ?? "";
  const userInitials = fullName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <EmployerLayout fullName={fullName} userInitials={userInitials} userId={user.id}>
      <InboxClient
        invites={invites ?? []}
        parentRequests={[]}
        userId={user.id}
      />
    </EmployerLayout>
  );
}