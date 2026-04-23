import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function EmployerDashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verify this user is actually an employer
  const { data: profile } = await supabase
    .from("users")
    .select("full_name, is_employer")
    .eq("id", user.id)
    .single();

  if (!profile?.is_employer) redirect("/dashboard");

  // Fetch all classes this employer is a member of
  const { data: memberships } = await supabase
    .from("class_members")
    .select(`
      role,
      classes (
        id,
        title,
        subject,
        level,
        cycle_hours,
        deleted_at,
        created_by
      )
    `)
    .eq("user_id", user.id)
    .eq("role", "employer");

  // Fetch tutor names for those classes
  const creatorIds = (memberships ?? [])
    .map((m: any) => m.classes?.created_by)
    .filter(Boolean);

  const { data: tutors } = await supabase
    .from("users")
    .select("id, full_name")
    .in("id", creatorIds.length > 0 ? creatorIds : ["00000000-0000-0000-0000-000000000000"]);

  const classes = (memberships ?? [])
    .filter((m: any) => m.classes && !m.classes.deleted_at)
    .map((m: any) => {
      const tutor = (tutors ?? []).find((t) => t.id === m.classes.created_by);
      return {
        ...m.classes,
        tutorName: tutor?.full_name ?? "Unknown tutor",
      };
    });

  // Group by tutor
  const byTutor: Record<string, { tutorName: string; classes: any[] }> = {};
  for (const cls of classes) {
    if (!byTutor[cls.created_by]) {
      byTutor[cls.created_by] = { tutorName: cls.tutorName, classes: [] };
    }
    byTutor[cls.created_by].classes.push(cls);
  }

  const firstName = profile.full_name?.split(" ")[0] ?? "there";

  return (
    <div className="min-h-screen" style={{ background: "var(--color-ss-bg)" }}>

      {/* Top bar */}
      <div
        className="px-8 py-5 flex items-center justify-between"
        style={{ borderBottom: "0.5px solid var(--color-ss-border)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="text-[15px] font-medium"
            style={{ color: "var(--color-ss-text-primary)" }}
          >
            StudentSpace
          </div>
          <span style={{ color: "var(--color-ss-border)" }}>·</span>
          <div className="text-[13px]" style={{ color: "var(--color-ss-text-faint)" }}>
            Employer dashboard
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/inbox"
            className="text-[12px] px-3 py-1.5 rounded-md"
            style={{ color: "var(--color-ss-text-muted)", background: "#2a2820", border: "0.5px solid var(--color-ss-border)" }}
          >
            Inbox
          </Link>
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium"
            style={{ background: "#3a2e1a", border: "1px solid #6a5530", color: "var(--color-ss-amber-light)" }}
          >
            {firstName.slice(0, 2).toUpperCase()}
          </div>
        </div>
      </div>

      <div className="px-8 py-6">

        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-[22px] font-medium mb-1" style={{ color: "var(--color-ss-text-primary)" }}>
            Hello, {firstName}
          </h1>
          <p className="text-[13px]" style={{ color: "var(--color-ss-text-faint)" }}>
            {classes.length === 0
              ? "You haven't been added to any classes yet."
              : `Overseeing ${classes.length} ${classes.length === 1 ? "class" : "classes"} across ${Object.keys(byTutor).length} ${Object.keys(byTutor).length === 1 ? "tutor" : "tutors"}.`}
          </p>
        </div>

        {/* Empty state */}
        {classes.length === 0 && (
          <div
            className="rounded-xl p-10 text-center max-w-lg"
            style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}
          >
            <div className="text-[14px] font-medium mb-2" style={{ color: "var(--color-ss-text-muted)" }}>
              No classes yet
            </div>
            <div className="text-[12px]" style={{ color: "var(--color-ss-text-faint)" }}>
              Ask a tutor to invite you to their classes as an employer.
            </div>
          </div>
        )}

        {/* Classes grouped by tutor */}
        {Object.entries(byTutor).map(([tutorId, group]) => (
          <div key={tutorId} className="mb-8">
            <div
              className="text-[12px] uppercase tracking-wider mb-3"
              style={{ color: "var(--color-ss-text-faint)" }}
            >
              {group.tutorName}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {group.classes.map((cls, i) => (
                <Link
                  key={cls.id}
                  href={`/classes/${cls.id}/overview`}
                  className="rounded-xl p-4 block"
                  style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}
                >
                  <div className="text-[14px] font-medium mb-1" style={{ color: "#d8c8a0" }}>
                    {cls.title}
                  </div>
                  <div className="text-[11px] mb-3" style={{ color: "var(--color-ss-text-faint)" }}>
                    {[cls.subject, cls.level].filter(Boolean).join(" · ") || "No subject set"}
                  </div>
                  <span
                    className="text-[10px] font-medium px-2 py-0.5 rounded"
                    style={{ background: "#17150f", color: "var(--color-ss-text-ghost)", border: "0.5px solid var(--color-ss-border)" }}
                  >
                    {cls.cycle_hours}h cycle
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}