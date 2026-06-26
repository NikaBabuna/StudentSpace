import { redirect } from "next/navigation";
import { getServerClient, requireAuth, getClassMembership } from "@/lib/auth";
import SubmissionsClient from "./SubmissionsClient";
import { toAttachments } from "@/lib/types";
import { signAttachments, HOMEWORK_BUCKET } from "@/lib/storage";

export default async function SubmissionsPage({
  params,
}: {
  params: Promise<{ id: string; hwId: string }>;
}) {
  const { id: classId, hwId } = await params;
  const user = await requireAuth();
  const supabase = await getServerClient();
  const FALLBACK = "00000000-0000-0000-0000-000000000000";

  // membership is request-cached (loaded by the layout). Gate on role before
  // fetching, so non-tutors are bounced without doing the heavy reads.
  const membership = await getClassMembership(classId, user.id);
  if (membership?.role !== "tutor") redirect(`/classes/${classId}/homework`);

  // homework / students / submissions are independent — one batch.
  const [{ data: hw }, { data: members }, { data: submissions }] = await Promise.all([
    supabase.from("homework").select("id, title, description, deadline, attachments").eq("id", hwId).single(),
    supabase.from("class_members").select("user_id, role").eq("class_id", classId).eq("role", "student"),
    supabase
      .from("submissions")
      .select("id, student_id, attachments, created_at, grade")
      .eq("homework_id", hwId)
      .order("created_at", { ascending: true }),
  ]);

  if (!hw) redirect(`/classes/${classId}/homework`);

  const studentIds = (members ?? []).map(m => m.user_id);
  const { data: studentUsers } = await supabase
    .from("users")
    .select("id, full_name")
    .in("id", studentIds.length > 0 ? studentIds : [FALLBACK]);

  const signedHw = {
    ...hw,
    attachments: await signAttachments(supabase, HOMEWORK_BUCKET, toAttachments(hw.attachments)),
  };
  const signedSubmissions = await Promise.all(
    (submissions ?? []).map(async s => ({
      ...s,
      attachments: await signAttachments(supabase, HOMEWORK_BUCKET, toAttachments(s.attachments)),
    }))
  );

  return (
    <SubmissionsClient
      classId={classId}
      hw={signedHw}
      studentUsers={studentUsers ?? []}
      submissions={signedSubmissions}
      tutorId={user.id}
    />
  );
}