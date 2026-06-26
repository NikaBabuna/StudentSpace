/* =============================================================================
 * features/materials/actions.ts — class materials server actions
 * -----------------------------------------------------------------------------
 * Role: CRUD for material_groups and materials rows. Tutor-only mutations;
 *       soft-deletes materials; supports pin toggle and batch insert after upload.
 * Dependencies: lib/supabase/server.ts
 * Used by: features/materials/components/MaterialsClient.tsx
 * Inputs: classId, group names, material metadata from client uploads
 * Outputs: { error } or { groupId, error } from createMaterialGroup
 * ========================================================================== */
"use server";

import { createClient } from "@/lib/supabase/server";

type Result = { error: string | null };

export type MaterialItem = {
  groupId: string;
  title: string;
  fileUrl: string;
  fileName: string;
  fileSizeBytes: number | null;
  mimeType: string | null;
};

async function requireTutorForClass(classId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in.", supabase, user: null };
  const { data: membership } = await supabase
    .from("class_members").select("role")
    .eq("class_id", classId).eq("user_id", user.id).single();
  if (membership?.role !== "tutor") return { error: "Only tutors can manage materials.", supabase, user: null };
  return { error: null, supabase, user };
}

/** Files are uploaded to storage from the browser; this records the group. */
export async function createMaterialGroup(classId: string, name: string): Promise<{ groupId: string | null; error: string | null }> {
  if (!name.trim()) return { groupId: null, error: "Group name is required." };
  const ctx = await requireTutorForClass(classId);
  if (ctx.error) return { groupId: null, error: ctx.error };

  const { data: group, error } = await ctx.supabase
    .from("material_groups")
    .insert({ class_id: classId, created_by: ctx.user!.id, name: name.trim() })
    .select("id")
    .single();

  if (error) return { groupId: null, error: error.message };
  return { groupId: group.id, error: null };
}

/** Records already-uploaded files as material rows. */
export async function insertMaterials(classId: string, items: MaterialItem[]): Promise<Result> {
  const ctx = await requireTutorForClass(classId);
  if (ctx.error) return { error: ctx.error };

  const rows = items.map(it => ({
    group_id: it.groupId,
    class_id: classId,
    uploaded_by: ctx.user!.id,
    title: it.title,
    file_url: it.fileUrl,
    file_name: it.fileName,
    file_size_bytes: it.fileSizeBytes,
    mime_type: it.mimeType,
    is_pinned: false,
  }));

  const { error } = await ctx.supabase.from("materials").insert(rows);
  return { error: error?.message ?? null };
}

export async function renameMaterialGroup(classId: string, groupId: string, name: string): Promise<Result> {
  if (!name.trim()) return { error: "Group name is required." };
  const ctx = await requireTutorForClass(classId);
  if (ctx.error) return { error: ctx.error };

  const { error } = await ctx.supabase
    .from("material_groups")
    .update({ name: name.trim() })
    .eq("id", groupId);
  return { error: error?.message ?? null };
}

export async function deleteMaterial(classId: string, materialId: string): Promise<Result> {
  const ctx = await requireTutorForClass(classId);
  if (ctx.error) return { error: ctx.error };

  const { error } = await ctx.supabase
    .from("materials")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", materialId);
  return { error: error?.message ?? null };
}

export async function deleteMaterialGroup(classId: string, groupId: string): Promise<Result> {
  const ctx = await requireTutorForClass(classId);
  if (ctx.error) return { error: ctx.error };

  const { error: e1 } = await ctx.supabase
    .from("materials")
    .update({ deleted_at: new Date().toISOString() })
    .eq("group_id", groupId);
  if (e1) return { error: e1.message };

  const { error: e2 } = await ctx.supabase
    .from("material_groups")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", groupId);
  return { error: e2?.message ?? null };
}

export async function toggleMaterialPin(classId: string, materialId: string, pinned: boolean): Promise<Result> {
  const ctx = await requireTutorForClass(classId);
  if (ctx.error) return { error: ctx.error };

  const { error } = await ctx.supabase
    .from("materials")
    .update({ is_pinned: pinned })
    .eq("id", materialId);
  return { error: error?.message ?? null };
}
