import { getServerClient, requireAuth, getClassMembership } from "@/lib/auth";
import HomeworkClient from "./HomeworkClient";
import { toAttachments } from "@/lib/types";
import { signAttachments, HOMEWORK_BUCKET } from "@/lib/storage";

export default async function HomeworkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAuth();
  const supabase = await getServerClient();
  const FALLBACK = "00000000-0000-0000-0000-000000000000";

  // membership is request-cached (loaded by the layout); homework is independent.
  const [membership, { data: homeworkRows }] = await Promise.all([
    getClassMembership(id, user.id),
    supabase
      .from("homework")
      .select("id, title, description, deadline, attachments, created_at")
      .eq("class_id", id)
      .is("deleted_at", null)
      .order("deadline", { ascending: true }),
  ]);

  const hwIds = (homeworkRows ?? []).map(h => h.id);

  const { data: submissions } = await supabase
    .from("submissions")
    .select("id, homework_id, student_id, attachments, created_at, grade")
    .in("homework_id", hwIds.length > 0 ? hwIds : [FALLBACK]);

  // Fetch student names for tutor view
  const studentIds = [...new Set((submissions ?? []).map(s => s.student_id))];
  const { data: studentUsers } = await supabase
    .from("users")
    .select("id, full_name")
    .in("id", studentIds.length > 0 ? studentIds : [FALLBACK]);

  // Replace stored file URLs with short-lived signed URLs.
  const homework = await Promise.all(
    (homeworkRows ?? []).map(async h => ({
      ...h,
      attachments: await signAttachments(supabase, HOMEWORK_BUCKET, toAttachments(h.attachments)),
    }))
  );
  const signedSubmissions = await Promise.all(
    (submissions ?? []).map(async s => ({
      ...s,
      attachments: await signAttachments(supabase, HOMEWORK_BUCKET, toAttachments(s.attachments)),
    }))
  );

  return (
    <HomeworkClient
      classId={id}
      userId={user.id}
      role={membership?.role ?? "student"}
      homework={homework}
      submissions={signedSubmissions}
      studentUsers={studentUsers ?? []}
    />
  );
}