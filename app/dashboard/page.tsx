import AppLayout from "@/components/layout/AppLayout";
import Link from "next/link";
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
    .from("users")
    .select("full_name, is_employer")
    .eq("id", user.id)
    .single();

  if (profile?.is_employer) redirect("/employer");

  const { data: memberships } = await supabase
    .from("class_members")
    .select(`role, classes (id, title, subject, level, cycle_hours, deleted_at)`)
    .eq("user_id", user.id);

  const classIds = (memberships ?? []).map((m: any) => m.classes?.id).filter(Boolean);
  const fallback = ["00000000-0000-0000-0000-000000000000"];

  const { data: memberCounts } = await supabase
    .from("class_members")
    .select("class_id")
    .in("class_id", classIds.length > 0 ? classIds : fallback);

  const countMap: Record<string, number> = {};
  for (const row of memberCounts ?? []) {
    countMap[row.class_id] = (countMap[row.class_id] ?? 0) + 1;
  }

  const { count: pendingInvites } = await supabase
    .from("invites")
    .select("*", { count: "exact", head: true })
    .eq("invited_user_id", user.id)
    .eq("status", "pending");

  // Analytics data — lessons across all classes
  const { data: allLessons } = await supabase
    .from("lessons")
    .select("id, class_id, duration_hours, status, scheduled_at")
    .in("class_id", classIds.length > 0 ? classIds : fallback)
    .is("deleted_at", null);

  // Analytics data — homework + submissions
  const { data: allHomework } = await supabase
    .from("homework")
    .select("id, class_id, deadline")
    .in("class_id", classIds.length > 0 ? classIds : fallback)
    .is("deleted_at", null);

  const hwIds = (allHomework ?? []).map(h => h.id);
  const { data: allSubmissions } = await supabase
    .from("submissions")
    .select("id, homework_id, student_id, grade, created_at")
    .in("homework_id", hwIds.length > 0 ? hwIds : fallback);

  const allClasses = (memberships ?? [])
    .filter((m: any) => m.classes && !m.classes.deleted_at)
    .map((m: any) => ({
      ...m.classes,
      role: m.role,
      member_count: countMap[m.classes.id] ?? 1,
    }));

  const teaching  = allClasses.filter(c => c.role === "tutor");
  const attending = allClasses.filter(c => c.role === "student");
  const observing = allClasses.filter(c => c.role === "parent" || c.role === "employer");

const firstName = profile?.full_name?.trim().split(" ")[0] ?? "";
  const fullName  = profile?.full_name ?? "";
  const userInitials = fullName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  // Pre-compute analytics
  const lessons = allLessons ?? [];
  const homework = allHomework ?? [];
  const submissions = allSubmissions ?? [];
  const now = new Date();

  const totalHours = lessons.filter(l => l.status === "completed").reduce((s, l) => s + (l.duration_hours ?? 0), 0);
  const totalMissed = lessons.filter(l => l.status === "missed").length;
  const totalCompleted = lessons.filter(l => l.status === "completed").length;
  const totalScheduled = lessons.filter(l => l.status === "scheduled").length;
  const pendingFeedback = submissions.filter(s => !s.grade).length;

  // Per-class analytics for tutor
  const classAnalytics = teaching.map(cls => {
    const clsLessons = lessons.filter(l => l.class_id === cls.id);
    const clsHw = homework.filter(h => h.class_id === cls.id);
    const clsHwIds = clsHw.map(h => h.id);
    const clsSubs = submissions.filter(s => clsHwIds.includes(s.homework_id));
    return {
      id: cls.id,
      title: cls.title,
      hours: clsLessons.filter(l => l.status === "completed").reduce((s, l) => s + (l.duration_hours ?? 0), 0),
      missed: clsLessons.filter(l => l.status === "missed").length,
      upcoming: clsLessons.filter(l => l.status === "scheduled").length,
      hwCount: clsHw.length,
      subCount: clsSubs.length,
      pendingFeedback: clsSubs.filter(s => !s.grade).length,
    };
  });

  return (
    <AppLayout mode="dashboard" tutorInitials={userInitials} tutorName={fullName} role="tutor">
      <DashboardClient
        firstName={firstName}
        fullName={fullName}
        allClasses={allClasses}
        teaching={teaching}
        attending={attending}
        observing={observing}
        pendingInvites={pendingInvites ?? 0}
        avatarColors={avatarColors}
        roleConfig={roleConfig}
        analytics={{
          totalHours,
          totalMissed,
          totalCompleted,
          totalScheduled,
          pendingFeedback,
          classAnalytics,
        }}
      />
    </AppLayout>
  );
}