import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import Link from "next/link";

export default async function AnalyticsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users").select("full_name").eq("id", user.id).single();

  const { data: memberships } = await supabase
    .from("class_members")
    .select(`role, classes (id, title, subject, level, cycle_hours, deleted_at)`)
    .eq("user_id", user.id)
    .eq("role", "tutor");

  const classIds = (memberships ?? []).map((m: any) => m.classes?.id).filter(Boolean);
  const fallback = ["00000000-0000-0000-0000-000000000000"];

  const { data: allLessons } = await supabase
    .from("lessons").select("id, class_id, duration_hours, status")
    .in("class_id", classIds.length > 0 ? classIds : fallback)
    .is("deleted_at", null);

  const { data: allHomework } = await supabase
    .from("homework").select("id, class_id, deadline")
    .in("class_id", classIds.length > 0 ? classIds : fallback)
    .is("deleted_at", null);

  const hwIds = (allHomework ?? []).map(h => h.id);
  const { data: allSubmissions } = await supabase
    .from("submissions").select("id, homework_id, grade")
    .in("homework_id", hwIds.length > 0 ? hwIds : fallback);

  const lessons = allLessons ?? [];
  const homework = allHomework ?? [];
  const submissions = allSubmissions ?? [];
  const now = new Date();

  const totalHours     = lessons.filter(l => l.status === "completed").reduce((s, l) => s + (l.duration_hours ?? 0), 0);
  const totalCompleted = lessons.filter(l => l.status === "completed").length;
  const totalMissed    = lessons.filter(l => l.status === "missed").length;
  const totalScheduled = lessons.filter(l => l.status === "scheduled").length;
  const pendingFeedback = submissions.filter(s => !s.grade).length;

  const allClasses = (memberships ?? [])
    .filter((m: any) => m.classes && !m.classes.deleted_at)
    .map((m: any) => m.classes);

  const classAnalytics = allClasses.map((cls: any) => {
    const cl = lessons.filter(l => l.class_id === cls.id);
    const ch = homework.filter(h => h.class_id === cls.id);
    const chIds = ch.map(h => h.id);
    const cs = submissions.filter(s => chIds.includes(s.homework_id));
    return {
      id: cls.id,
      title: cls.title,
      hours: cl.filter(l => l.status === "completed").reduce((s, l) => s + (l.duration_hours ?? 0), 0),
      completed: cl.filter(l => l.status === "completed").length,
      missed: cl.filter(l => l.status === "missed").length,
      upcoming: cl.filter(l => l.status === "scheduled").length,
      hwCount: ch.length,
      subCount: cs.length,
      pendingFeedback: cs.filter(s => !s.grade).length,
    };
  });

  const fullName = profile?.full_name ?? "";
  const userInitials = fullName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <AppLayout mode="dashboard" tutorInitials={userInitials} tutorName={fullName} role="tutor">
      <div className="flex-1 flex flex-col overflow-hidden">

        <div className="px-6 py-4 shrink-0" style={{ borderBottom: "0.5px solid var(--color-ss-border)" }}>
          <h1 className="text-[18px] font-medium" style={{ color: "var(--color-ss-text-primary)" }}>Analytics</h1>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--color-ss-text-faint)" }}>
            Across all classes you teach
          </p>
        </div>

        <div className="flex-1 overflow-auto p-6 flex flex-col gap-5">

          {/* Summary stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total hours",       value: totalHours,     sub: "completed",  color: undefined },
              { label: "Lessons completed", value: totalCompleted, sub: `${totalMissed} missed`, color: undefined },
              { label: "Upcoming lessons",  value: totalScheduled, sub: "scheduled",  color: undefined },
              { label: "Pending feedback",  value: pendingFeedback, sub: "submissions", color: pendingFeedback > 0 ? "#c8a050" : "#40a870" },
            ].map(s => (
              <div key={s.label} className="rounded-lg p-4"
                style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}>
                <div className="text-[11px] mb-1" style={{ color: "var(--color-ss-text-faint)" }}>{s.label}</div>
                <div className="text-[22px] font-medium" style={{ color: s.color ?? "var(--color-ss-text-primary)" }}>{s.value}</div>
                <div className="text-[10px] mt-1" style={{ color: "var(--color-ss-text-ghost)" }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Per-class table */}
          {classAnalytics.length === 0 ? (
            <div className="text-[13px] text-center py-8" style={{ color: "var(--color-ss-text-ghost)" }}>
              No data yet.
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden"
              style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}>
              <div className="px-4 py-3" style={{ borderBottom: "0.5px solid #2a2820" }}>
                <div className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--color-ss-text-muted)" }}>
                  Per class
                </div>
              </div>
              <div className="grid px-4 py-2"
                style={{ gridTemplateColumns: "1fr 72px 72px 72px 72px 100px", borderBottom: "0.5px solid #2a2820" }}>
                {["Class", "Hours", "Done", "Missed", "Soon", "Feedback"].map(h => (
                  <div key={h} className="text-[10px] uppercase tracking-wider" style={{ color: "#5a5248" }}>{h}</div>
                ))}
              </div>
              {classAnalytics.map((cls, i) => (
                <div key={cls.id} className="grid items-center px-4 py-3"
                  style={{
                    gridTemplateColumns: "1fr 72px 72px 72px 72px 100px",
                    borderBottom: i < classAnalytics.length - 1 ? "0.5px solid #252320" : "none",
                  }}>
                  <Link href={`/classes/${cls.id}/overview`}
                    className="text-[13px] font-medium truncate hover:underline"
                    style={{ color: "#c8b890" }}>
                    {cls.title}
                  </Link>
                  <div className="text-[13px]" style={{ color: "#d8c8a0" }}>{cls.hours}h</div>
                  <div className="text-[13px]" style={{ color: "#40a870" }}>{cls.completed || "—"}</div>
                  <div className="text-[13px]" style={{ color: cls.missed > 0 ? "#c04040" : "#5a5248" }}>
                    {cls.missed > 0 ? cls.missed : "—"}
                  </div>
                  <div className="text-[13px]" style={{ color: "#c8a050" }}>{cls.upcoming || "—"}</div>
                  <div className="text-[13px]" style={{ color: cls.pendingFeedback > 0 ? "#c8a050" : "#5a5248" }}>
                    {cls.pendingFeedback > 0 ? `${cls.pendingFeedback} pending` : "All reviewed"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}