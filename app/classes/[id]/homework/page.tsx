import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import HomeworkClient from "./HomeworkClient";

export default async function HomeworkPage({ params }: { params: Promise<{ id: string }> }) {
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

  const { data: homeworkRows } = await supabase
    .from("homework")
    .select("id, title, description, deadline, attachments, created_at")
    .eq("class_id", id)
    .is("deleted_at", null)
    .order("deadline", { ascending: true });

  const hwIds = (homeworkRows ?? []).map(h => h.id);

  const { data: submissions } = await supabase
    .from("submissions")
    .select("id, homework_id, student_id, attachments, created_at, grade")
    .in("homework_id", hwIds.length > 0 ? hwIds : ["00000000-0000-0000-0000-000000000000"]);

  // Fetch student names for tutor view
  const studentIds = [...new Set((submissions ?? []).map(s => s.student_id))];
  const { data: studentUsers } = await supabase
    .from("users")
    .select("id, full_name")
    .in("id", studentIds.length > 0 ? studentIds : ["00000000-0000-0000-0000-000000000000"]);

  return (
    <HomeworkClient
      classId={id}
      userId={user.id}
      role={membership?.role ?? "student"}
      homework={homeworkRows ?? []}
      submissions={submissions ?? []}
      studentUsers={studentUsers ?? []}
    />
  );
}