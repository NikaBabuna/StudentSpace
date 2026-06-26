/* =============================================================================
 * app/classes/[id]/materials/page.tsx — class materials tab loader
 * -----------------------------------------------------------------------------
 * Role: Verifies membership, loads material_groups + materials, signs file
 *       URLs, renders MaterialsClient.
 * Dependencies: lib/supabase/server, lib/storage, MaterialsClient
 * Used by: Route /classes/[id]/materials
 * Inputs: params.id
 * Outputs: MaterialsClient with groups and role
 * ========================================================================== */
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MaterialsClient from "@/features/materials/components/MaterialsClient";
import { signStoredUrl, MATERIALS_BUCKET } from "@/lib/storage";

export default async function MaterialsPage({ params }: { params: Promise<{ id: string }> }) {
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

  const { data: groups } = await supabase
    .from("material_groups")
    .select("id, name, created_at")
    .eq("class_id", id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  const groupIds = (groups ?? []).map(g => g.id);

  const { data: materials } = await supabase
    .from("materials")
    .select("id, group_id, title, file_url, file_name, file_size_bytes, mime_type, is_pinned, created_at")
    .in("group_id", groupIds.length > 0 ? groupIds : ["00000000-0000-0000-0000-000000000000"])
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  // Swap stored file URLs for short-lived signed URLs (works whether the
  // bucket is public or private).
  const signedMaterials = await Promise.all(
    (materials ?? []).map(async (m) => ({
      ...m,
      file_url: await signStoredUrl(supabase, MATERIALS_BUCKET, m.file_url),
    }))
  );

  return (
    <MaterialsClient
      classId={id}
      userId={user.id}
      role={membership?.role ?? "student"}
      groups={groups ?? []}
      materials={signedMaterials}
    />
  );
}