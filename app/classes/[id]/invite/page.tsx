import { requireTutor } from "@/lib/auth";
import InviteClient from "./InviteClient";

export default async function InvitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireTutor(id);
  return <InviteClient classId={id} />;
}
