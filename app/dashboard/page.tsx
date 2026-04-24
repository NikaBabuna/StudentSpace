import AppLayout from "@/components/layout/AppLayout";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

const avatarColors = [
  { bg: "#2a1e10", border: "#5a3a1a", text: "#e8a060" },
  { bg: "#101e2a", border: "#1a3a5a", text: "#60a0e8" },
  { bg: "#1a2a10", border: "#3a5a1a", text: "#80c040" },
  { bg: "#2a102a", border: "#5a1a5a", text: "#c060c0" },
  { bg: "#1a1a2a", border: "#2a2a5a", text: "#9090d8" },
  { bg: "#10201a", border: "#1a4030", text: "#40a870" },
];

const roleConfig = {
  tutor:    { label: "Tutor",    color: "#c8a050" },
  student:  { label: "Student",  color: "#e8a060" },
  parent:   { label: "Parent",   color: "#60a8e8" },
  employer: { label: "Employer", color: "#80c060" },
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users").select("full_name, is_employer").eq("id", user.id).single();

  if (profile?.is_employer) redirect("/employer");

  const { data: memberships } = await supabase
    .from("class_members")
    .select(`role, classes (id, title, subject, level, cycle_hours, description, tutor_notes, created_by, deleted_at)`)
    .eq("user_id", user.id);

  const classIds = (memberships ?? []).map((m: any) => m.classes?.id).filter(Boolean);
  const fallback = ["00000000-0000-0000-0000-000000000000"];

  const { data: memberCounts } = await supabase
    .from("class_members").select("class_id")
    .in("class_id", classIds.length > 0 ? classIds : fallback);

  const countMap: Record<string, number> = {};
  for (const row of memberCounts ?? []) {
    countMap[row.class_id] = (countMap[row.class_id] ?? 0) + 1;
  }

  const { count: pendingInvites } = await supabase
    .from("invites").select("*", { count: "exact", head: true })
    .eq("invited_user_id", user.id).eq("status", "pending");

  // Fetch open payment cycles for payment amount/currency
  const { data: openCycles } = await supabase
    .from("payment_cycles")
    .select("id, class_id, payment_amount, payment_currency")
    .in("class_id", classIds.length > 0 ? classIds : fallback)
    .is("closed_at", null);

  const cycleMap: Record<string, { amount: number | null; currency: string }> = {};
  for (const c of openCycles ?? []) {
    cycleMap[c.class_id] = { amount: c.payment_amount, currency: c.payment_currency ?? "GEL" };
  }

  const allClasses = (memberships ?? [])
    .filter((m: any) => m.classes && !m.classes.deleted_at)
    .map((m: any) => ({
      ...m.classes,
      role: m.role,
      member_count: countMap[m.classes.id] ?? 1,
      isCreator: m.classes.created_by === user.id,
      paymentAmount: cycleMap[m.classes.id]?.amount ?? null,
      paymentCurrency: cycleMap[m.classes.id]?.currency ?? "GEL",
    }));

  const teaching  = allClasses.filter(c => c.role === "tutor");
  const attending = allClasses.filter(c => c.role === "student");
  const observing = allClasses.filter(c => c.role === "parent" || c.role === "employer");

  const firstName = profile?.full_name?.trim().split(" ")[0] ?? "";
  const fullName  = profile?.full_name ?? "";
  const userInitials = fullName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <AppLayout mode="dashboard" tutorInitials={userInitials} tutorName={fullName} role="tutor">
      <DashboardClient
        userId={user.id}
        firstName={firstName}
        fullName={fullName}
        allClasses={allClasses}
        teaching={teaching}
        attending={attending}
        observing={observing}
        pendingInvites={pendingInvites ?? 0}
        avatarColors={avatarColors}
        roleConfig={roleConfig}
      />
    </AppLayout>
  );
}