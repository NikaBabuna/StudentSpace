import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import InboxClient from "./InboxClient";

export default async function InboxPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch all invites for this user
  const { data: invites, error } = await supabase
    .from("invites")
    .select(`
      id,
      role,
      status,
      created_at,
      classes (
        id,
        title,
        subject,
        level
      ),
      invited_by_user:users!invites_invited_by_fkey (
        full_name
      )
    `)
    .eq("invited_user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) console.error("Inbox error:", JSON.stringify(error));

  return <InboxClient invites={invites ?? []} />;
}