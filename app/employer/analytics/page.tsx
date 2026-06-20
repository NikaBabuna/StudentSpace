import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import EmployerLayout from "../EmployerLayout";
import EmployerAnalyticsClient, {
  type EmployerClassStat,
  type EmployerCurrencyTotal,
} from "./EmployerAnalyticsClient";

export default async function EmployerAnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users").select("full_name, is_employer").eq("id", user.id).single();
  if (!profile?.is_employer) redirect("/dashboard");

  const fullName = profile.full_name ?? "";
  const userInitials = fullName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  // Classes this employer oversees.
  const { data: memberships } = await supabase
    .from("class_members")
    .select("classes (id, title, subject, deleted_at)")
    .eq("user_id", user.id)
    .eq("role", "employer");

  const classes = (memberships ?? [])
    .map((m) => m.classes)
    .filter((c): c is NonNullable<typeof c> => !!c && !c.deleted_at);

  const classIds = classes.map((c) => c.id);
  const fallback = ["00000000-0000-0000-0000-000000000000"];
  const idFilter = classIds.length > 0 ? classIds : fallback;

  // Lessons, cycles and members across those classes.
  const [{ data: lessons }, { data: cycles }, { data: members }] = await Promise.all([
    supabase
      .from("lessons")
      .select("class_id, status, duration_hours")
      .in("class_id", idFilter)
      .is("deleted_at", null),
    supabase
      .from("payment_cycles")
      .select("class_id, payment_amount, payment_currency, paid_at")
      .in("class_id", idFilter),
    supabase
      .from("class_members")
      .select("class_id, user_id, role")
      .in("class_id", idFilter)
      .eq("role", "tutor"),
  ]);

  const tutorIds = [...new Set((members ?? []).map((m) => m.user_id))];
  const { data: tutorProfiles } = await supabase
    .from("users")
    .select("id, full_name")
    .in("id", tutorIds.length > 0 ? tutorIds : fallback);

  const tutorNameById = new Map((tutorProfiles ?? []).map((t) => [t.id, t.full_name]));
  const tutorByClass = new Map((members ?? []).map((m) => [m.class_id, m.user_id]));

  // Per-class aggregation.
  const classStats: EmployerClassStat[] = classes.map((c) => {
    const classLessons = (lessons ?? []).filter((l) => l.class_id === c.id);
    const tutorId = tutorByClass.get(c.id);
    return {
      id: c.id,
      title: c.title,
      subject: c.subject,
      tutorName: (tutorId && tutorNameById.get(tutorId)) || "—",
      completedHours: classLessons
        .filter((l) => l.status === "completed")
        .reduce((sum, l) => sum + (l.duration_hours ?? 0), 0),
      completed: classLessons.filter((l) => l.status === "completed").length,
      missed: classLessons.filter((l) => l.status === "missed").length,
      scheduled: classLessons.filter((l) => l.status === "scheduled").length,
    };
  });

  // Earnings grouped by currency.
  const earningsMap = new Map<string, EmployerCurrencyTotal>();
  for (const cycle of cycles ?? []) {
    if (!cycle.payment_amount) continue;
    const currency = cycle.payment_currency ?? "GEL";
    const entry = earningsMap.get(currency) ?? { currency, total: 0, paid: 0, unpaid: 0 };
    entry.total += cycle.payment_amount;
    if (cycle.paid_at) entry.paid += cycle.payment_amount;
    else entry.unpaid += cycle.payment_amount;
    earningsMap.set(currency, entry);
  }

  const totalCompletedHours = classStats.reduce((s, c) => s + c.completedHours, 0);
  const totalLessons = (lessons ?? []).filter((l) => l.status !== "scheduled").length;
  const totalMissed = (lessons ?? []).filter((l) => l.status === "missed").length;

  return (
    <EmployerLayout fullName={fullName} userInitials={userInitials} userId={user.id}>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-4 shrink-0" style={{ borderBottom: "0.5px solid var(--color-ss-border)" }}>
          <h1 className="text-[16px] font-medium" style={{ color: "var(--color-ss-text-primary)" }}>Analytics</h1>
          <p className="text-[11px] mt-0.5" style={{ color: "#5a5248" }}>
            Across the {classes.length} class{classes.length === 1 ? "" : "es"} you oversee
          </p>
        </div>
        <EmployerAnalyticsClient
          classStats={classStats}
          earnings={[...earningsMap.values()]}
          totalCompletedHours={totalCompletedHours}
          totalLessons={totalLessons}
          totalMissed={totalMissed}
        />
      </div>
    </EmployerLayout>
  );
}
