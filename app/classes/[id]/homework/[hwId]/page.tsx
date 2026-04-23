import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import SubmissionsClient from "./SubmissionsClient";

export default async function SubmissionsPage({
  params,
}: {
  params: Promise<{ id: string; hwId: string }>;
}) {
  const { id: classId, hwId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Only tutors can see this page
  const { data: membership } = await supabase
    .from("class_members")
    .select("role")
    .eq("class_id", classId)
    .eq("user_id", user.id)
    .single();

  if (membership?.role !== "tutor") redirect(`/classes/${classId}/homework`);

  // Fetch homework
  const { data: hw } = await supabase
    .from("homework")
    .select("id, title, description, deadline, attachments")
    .eq("id", hwId)
    .single();

  if (!hw) redirect(`/classes/${classId}/homework`);

  // Fetch all students in this class
  const { data: members } = await supabase
    .from("class_members")
    .select("user_id, role")
    .eq("class_id", classId)
    .eq("role", "student");

  const studentIds = (members ?? []).map(m => m.user_id);

  const { data: studentUsers } = await supabase
    .from("users")
    .select("id, full_name")
    .in("id", studentIds.length > 0 ? studentIds : ["00000000-0000-0000-0000-000000000000"]);

  // Fetch submissions
  const { data: submissions } = await supabase
    .from("submissions")
    .select("id, student_id, attachments, created_at, grade")
    .eq("homework_id", hwId)
    .order("created_at", { ascending: true });

  return (
    <SubmissionsClient
      classId={classId}
      hw={hw}
      studentUsers={studentUsers ?? []}
      submissions={submissions ?? []}
      tutorId={user.id}
    />
  );
}