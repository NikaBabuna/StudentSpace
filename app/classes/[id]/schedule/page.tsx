import { getServerClient, requireAuth, getClassMembership, getClassRow } from "@/lib/auth";
import ScheduleClient from "./ScheduleClient";

export default async function SchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAuth();
  const supabase = await getServerClient();

  // membership + class are request-cached (loaded by the layout); lessons +
  // cycles are independent of each other, so fetch them in one batch.
  const [membership, classData, { data: lessons }, { data: cycles }] = await Promise.all([
    getClassMembership(id, user.id),
    getClassRow(id),
    supabase
      .from("lessons")
      .select("id, scheduled_at, duration_hours, status, payment_cycle_id, replaces_lesson_id")
      .eq("class_id", id)
      .is("deleted_at", null)
      .order("scheduled_at", { ascending: true }),
    supabase
      .from("payment_cycles")
      .select("id, cycle_number, closed_at, paid_at")
      .eq("class_id", id)
      .order("cycle_number", { ascending: true }),
  ]);

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