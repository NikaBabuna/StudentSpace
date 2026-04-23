import AppLayout from "@/components/layout/AppLayout";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

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

function ClassCard({ cls, index }: { cls: any; index: number }) {
  const colors = avatarColors[index % avatarColors.length];
  const initials = cls.title.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
  const role = roleConfig[cls.role as keyof typeof roleConfig];

  return (
    <Link
      href={`/classes/${cls.id}/overview`}
      className="rounded-xl p-4 block transition-colors"
      style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-medium shrink-0"
          style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-medium truncate" style={{ color: "#d8c8a0" }}>{cls.title}</div>
          <div className="text-[11px] mt-0.5" style={{ color: "var(--color-ss-text-faint)" }}>
            {[cls.subject, cls.level].filter(Boolean).join(" · ") || "No subject set"}
          </div>
        </div>
        <span
          className="text-[10px] font-medium px-2 py-0.5 rounded shrink-0"
          style={{ background: "#2a2318", color: role.color, border: "0.5px solid #4a3a18" }}
        >
          {role.label}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span
          className="text-[10px] font-medium px-2 py-0.5 rounded"
          style={{ background: "#17150f", color: "var(--color-ss-text-ghost)", border: "0.5px solid var(--color-ss-border)" }}
        >
          {cls.cycle_hours}h cycle
        </span>
        {cls.member_count > 1 && (
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded"
            style={{ background: "#17150f", color: "var(--color-ss-text-ghost)", border: "0.5px solid var(--color-ss-border)" }}
          >
            {cls.member_count} members
          </span>
        )}
      </div>
    </Link>
  );
}

function ClassGroup({ title, classes }: { title: string; classes: any[] }) {
  if (classes.length === 0) return null;
  return (
    <div className="mb-8">
      <div className="text-[12px] uppercase tracking-wider mb-3" style={{ color: "var(--color-ss-text-faint)" }}>
        {title}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {classes.map((cls, i) => (
          <ClassCard key={cls.id} cls={cls} index={i} />
        ))}
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch user profile
  const { data: profile } = await supabase
    .from("users")
    .select("full_name, is_employer")
    .eq("id", user.id)
    .single();

  if (profile?.is_employer) redirect("/employer");

  // Fetch all classes the user is a member of
  const { data: memberships, error } = await supabase
    .from("class_members")
    .select(`
      role,
      classes (
        id,
        title,
        subject,
        level,
        cycle_hours,
        deleted_at
      )
    `)
    .eq("user_id", user.id);

  if (error) console.error("Memberships error:", JSON.stringify(error));

  // Fetch member counts per class
  const classIds = (memberships ?? [])
    .map((m: any) => m.classes?.id)
    .filter(Boolean);

  const { data: memberCounts } = await supabase
    .from("class_members")
    .select("class_id")
    .in("class_id", classIds.length > 0 ? classIds : ["00000000-0000-0000-0000-000000000000"]);

  const countMap: Record<string, number> = {};
  for (const row of memberCounts ?? []) {
    countMap[row.class_id] = (countMap[row.class_id] ?? 0) + 1;
  }

  // Fetch pending invites count
  const { count: pendingInvites } = await supabase
    .from("invites")
    .select("*", { count: "exact", head: true })
    .eq("invited_user_id", user.id)
    .eq("status", "pending");

  const allClasses = (memberships ?? [])
    .filter((m: any) => m.classes && !m.classes.deleted_at)
    .map((m: any) => ({
      ...m.classes,
      role: m.role,
      member_count: countMap[m.classes.id] ?? 1,
    }));

  const teaching  = allClasses.filter((c) => c.role === "tutor");
  const attending = allClasses.filter((c) => c.role === "student");
  const observing = allClasses.filter((c) => c.role === "parent" || c.role === "employer");

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  return (
    <AppLayout mode="dashboard" tutorInitials={firstName.slice(0, 2).toUpperCase()} tutorName={profile?.full_name ?? ""} role="tutor">
      <div className="flex-1 p-6 overflow-auto">

        {/* Top bar */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-[18px] font-medium" style={{ color: "var(--color-ss-text-primary)" }}>
              Hello, {firstName}
            </h1>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--color-ss-text-faint)" }}>
              {allClasses.length === 0 ? "No classes yet" : `${allClasses.length} ${allClasses.length === 1 ? "class" : "classes"}`}
            </p>
          </div>
          <div className="flex gap-2">
            {(pendingInvites ?? 0) > 0 && (
              <Link
                href="/inbox"
                className="text-[12px] font-medium px-3 py-1.5 rounded-md flex items-center gap-1.5"
                style={{ background: "#2a2040", color: "var(--color-ss-purple)", border: "0.5px solid #4a3a70" }}
              >
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-medium"
                  style={{ background: "var(--color-ss-purple)", color: "#1c1a17" }}
                >
                  {pendingInvites}
                </span>
                Invites
              </Link>
            )}
            <Link
              href="/classes/new"
              className="text-[13px] font-medium px-3.5 py-[7px] rounded-md"
              style={{ background: "var(--color-ss-amber-light)", color: "#1c1a17" }}
            >
              + Create class
            </Link>
          </div>
        </div>

        {/* Empty state */}
        {allClasses.length === 0 && (
          <div
            className="rounded-xl p-10 text-center"
            style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}
          >
            <div className="text-[14px] font-medium mb-2" style={{ color: "var(--color-ss-text-muted)" }}>
              No classes yet
            </div>
            <div className="text-[12px] mb-5" style={{ color: "var(--color-ss-text-faint)" }}>
              Create your first class or wait for an invite from a tutor.
            </div>
            <Link
              href="/classes/new"
              className="inline-block text-[13px] font-medium px-4 py-2 rounded-lg"
              style={{ background: "var(--color-ss-amber-light)", color: "#1c1a17" }}
            >
              + Create class
            </Link>
          </div>
        )}

        {/* Class groups */}
        <ClassGroup title="Classes I teach" classes={teaching} />
        <ClassGroup title="Classes I attend" classes={attending} />
        <ClassGroup title="Classes I observe" classes={observing} />

      </div>
    </AppLayout>
  );
}