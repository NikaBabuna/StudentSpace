/* =============================================================================
 * app/classes/[id]/invite/page.tsx — invite members route (tutor only)
 * -----------------------------------------------------------------------------
 * Role: Guards tutor role then renders InviteClient for the class.
 * Dependencies: lib/auth (requireTutor), InviteClient
 * Used by: Route /classes/[id]/invite
 * Inputs: params.id
 * Outputs: InviteClient with classId
 * ========================================================================== */
import { requireTutor } from "@/lib/auth";
import InviteClient from "@/features/classes/components/InviteClient";

export default async function InvitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireTutor(id);
  return <InviteClient classId={id} />;
}
