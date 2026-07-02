/* =============================================================================
 * app/classes/[id]/schedule/page.tsx — class schedule tab loader
 * -----------------------------------------------------------------------------
 * Role: Fetches lessons, payment cycles, recurring schedules; passes to
 *       ScheduleClient. May materialise recurring lessons into the horizon.
 * Dependencies: lib/auth, features/schedule/ScheduleClient, schedule-utils
 * Used by: Route /classes/[id]/schedule (inside class layout)
 * Inputs: params.id (class UUID)
 * Outputs: ScheduleClient with role, timezone, lessons, cycles, schedules
 * ========================================================================== */
import { getServerClient, requireAuth, getClassMembership } from "@/lib/auth";
import ScheduleClient from "@/features/schedule/components/ScheduleClient";
import type { RecurringSchedule } from "@/features/schedule/lib/schedule-utils";

const RECURRENCE_HORIZON_WEEKS = 12;

export default async function SchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAuth();
  const supabase = await getServerClient();

  // membership is request-cached (loaded by the layout). Schedules are
  // needed before lessons so tutors can roll the materialisation horizon forward.
  const [membership, { data: schedules }] = await Promise.all([
    getClassMembership(id, user.id),
    supabase
      .from("recurring_schedules")
      .select(
        "id, weekday, start_time, duration_hours, interval_weeks, anchor_date, until_date, active, generated_until"
      )
      .eq("class_id", id)
      .is("deleted_at", null)
      .order("weekday", { ascending: true }),
  ]);

  const role = membership?.role ?? "student";

  // Tutor visit = keep open-ended schedules topped up. Only regenerate the ones
  // whose materialised window is running low (or never generated). Idempotent.
  if (role === "tutor" && schedules && schedules.length > 0) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + 21);
    const stale = schedules.filter(
      (s) => s.active && (!s.generated_until || new Date(s.generated_until) < cutoff)
    );
    if (stale.length > 0) {
      await Promise.all(
        stale.map((s) =>
          supabase.rpc("generate_recurring_lessons", {
            p_schedule_id: s.id,
            p_horizon_weeks: RECURRENCE_HORIZON_WEEKS,
          })
        )
      );
    }
  }

  const [{ data: lessons }, { data: cycles }] = await Promise.all([
    supabase
      .from("lessons")
      .select(
        "id, scheduled_at, duration_hours, status, payment_cycle_id, replaces_lesson_id, recurring_schedule_id"
      )
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
      role={role}
      lessons={lessons ?? []}
      cycles={cycles ?? []}
      schedules={(schedules ?? []) as RecurringSchedule[]}
    />
  );
}
