import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import ScheduleClient from "./ScheduleClient";

export default async function SchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("class_members")
    .select("role")
    .eq("class_id", id)
    .eq("user_id", user.id)
    .single();

  const { data: classData } = await supabase
  .from("classes")
  .select("cycle_hours")
  .eq("id", id)
  .single();

  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, scheduled_at, duration_hours, status, payment_cycle_id, replaces_lesson_id")
    .eq("class_id", id)
    .is("deleted_at", null)
    .order("scheduled_at", { ascending: true });

  const { data: cycles } = await supabase
    .from("payment_cycles")
    .select("id, cycle_number, closed_at")
    .eq("class_id", id)
    .order("cycle_number", { ascending: false });

return (
  <ScheduleClient
    classId={id}
    userId={user.id}
    role={membership?.role ?? "student"}
    lessons={lessons ?? []}
    cycles={cycles ?? []}
    cycleHours={classData?.cycle_hours ?? 8}
  />
);
}