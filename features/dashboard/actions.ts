/* =============================================================================
 * features/dashboard/actions.ts — class settings mutations
 * -----------------------------------------------------------------------------
 * Role: Updates class metadata (title, subject, payment on open cycle) and
 *       deletes a class (soft-delete rows + purge its storage files). Only the
 *       class creator may call these.
 * Dependencies: lib/supabase/server, lib/storage, next/cache
 * Used by: components/shell/class-settings-modal.tsx, dashboard class cards
 * Inputs: classId + editable fields, or classId for delete
 * Outputs: { error: string | null }; revalidates dashboard and class routes
 * ========================================================================== */
"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { actionFail } from "@/lib/log";
import { userMessage } from "@/lib/errors";
import {
  HOMEWORK_BUCKET,
  MATERIALS_BUCKET,
  storagePathFromUrl,
} from "@/lib/storage";

type Result = { error: string | null };

async function requireClassCreator(classId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: userMessage("SS-AUTH-01"), supabase, user: null };

  const { data: cls } = await supabase
    .from("classes")
    .select("created_by")
    .eq("id", classId)
    .single();
  if (!cls) return { error: userMessage("SS-NF-01"), supabase, user: null };
  if (cls.created_by !== user.id) return { error: userMessage("SS-AUTH-04"), supabase, user: null };

  return { error: null, supabase, user };
}

export async function updateClass(input: {
  classId: string;
  title: string;
  subject?: string;
  level?: string;
  description?: string;
  tutorNotes?: string;
  cycleHours: number;
  paymentAmount?: number | null;
  paymentCurrency?: string;
}): Promise<Result> {
  if (!input.title.trim()) return { error: "Title is required." };

  const ctx = await requireClassCreator(input.classId);
  if (ctx.error) return { error: ctx.error };

  const { error } = await ctx.supabase.from("classes").update({
    title: input.title.trim(),
    subject: input.subject?.trim() || null,
    level: input.level?.trim() || null,
    description: input.description?.trim() || null,
    tutor_notes: input.tutorNotes?.trim() || null,
    cycle_hours: input.cycleHours,
  }).eq("id", input.classId);
  if (error) return actionFail("SS-CLASS-04", error.message, { classId: input.classId });

  // Per-cycle payment lives on the open cycle. Both edit surfaces send these
  // fields, so persist them (null clears the amount). Surface a failure instead
  // of silently "saving" — the previous version ignored this result, so an
  // empty match looked like success while nothing changed.
  if (input.paymentCurrency !== undefined || input.paymentAmount !== undefined) {
    const { data: openCycle } = await ctx.supabase
      .from("payment_cycles")
      .select("id")
      .eq("class_id", input.classId)
      .is("closed_at", null)
      .order("cycle_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (openCycle) {
      const { error: payErr } = await ctx.supabase
        .from("payment_cycles")
        .update({
          payment_amount: input.paymentAmount ?? null,
          payment_currency: input.paymentCurrency ?? "GEL",
        })
        .eq("id", openCycle.id);
      if (payErr) return actionFail("SS-CLASS-05", payErr.message, { classId: input.classId });
    } else {
      // Every class normally keeps one open cycle, but if none exists, open one
      // rather than dropping the payment the tutor just set.
      const { data: last } = await ctx.supabase
        .from("payment_cycles")
        .select("cycle_number")
        .eq("class_id", input.classId)
        .order("cycle_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      const { error: cycleErr } = await ctx.supabase.from("payment_cycles").insert({
        class_id: input.classId,
        cycle_number: (last?.cycle_number ?? 0) + 1,
        payment_amount: input.paymentAmount ?? null,
        payment_currency: input.paymentCurrency ?? "GEL",
      });
      if (cycleErr) return actionFail("SS-CLASS-05", cycleErr.message, { classId: input.classId });
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/classes");
  revalidatePath(`/classes/${input.classId}`);
  return { error: null };
}

/** Collect in-bucket object paths from a list of stored file URLs. */
function pathsFromUrls(urls: (string | null | undefined)[], bucket: string): string[] {
  const paths: string[] = [];
  for (const url of urls) {
    if (!url) continue;
    const path = storagePathFromUrl(url, bucket);
    if (path) paths.push(path);
  }
  return paths;
}

type AttachmentRow = { attachments: { url?: string }[] | null };

/**
 * Delete a class: soft-delete the class and all its content rows, remove its
 * files from storage so the buckets don't accumulate orphans, and drop
 * memberships. Storage removal happens *before* class_members is cleared,
 * because the storage RLS delete policy checks tutor membership on the class.
 */
export async function deleteClass(classId: string): Promise<Result> {
  const ctx = await requireClassCreator(classId);
  if (ctx.error) return { error: ctx.error };
  const { supabase } = ctx;

  // --- Gather every stored file linked to this class -----------------------
  const { data: homeworkRows } = await supabase
    .from("homework")
    .select("id, attachments")
    .eq("class_id", classId);
  const hwIds = (homeworkRows ?? []).map((h) => h.id);

  const { data: submissionRows } = hwIds.length
    ? await supabase.from("submissions").select("attachments").in("homework_id", hwIds)
    : { data: [] as AttachmentRow[] };

  const { data: materialRows } = await supabase
    .from("materials")
    .select("file_url")
    .eq("class_id", classId);

  const homeworkFilePaths = pathsFromUrls(
    [
      ...(homeworkRows ?? []).flatMap((h) => ((h.attachments as { url?: string }[]) ?? []).map((a) => a.url)),
      ...((submissionRows ?? []) as AttachmentRow[]).flatMap((s) =>
        (s.attachments ?? []).map((a) => a.url)
      ),
    ],
    HOMEWORK_BUCKET
  );
  const materialFilePaths = pathsFromUrls(
    (materialRows ?? []).map((m) => m.file_url),
    MATERIALS_BUCKET
  );

  if (homeworkFilePaths.length) {
    await supabase.storage.from(HOMEWORK_BUCKET).remove(homeworkFilePaths);
  }
  if (materialFilePaths.length) {
    await supabase.storage.from(MATERIALS_BUCKET).remove(materialFilePaths);
  }

  // --- Soft-delete the content rows (keeps history filtered everywhere) -----
  const now = new Date().toISOString();
  await supabase.from("lessons").update({ deleted_at: now }).eq("class_id", classId);
  await supabase.from("homework").update({ deleted_at: now }).eq("class_id", classId);
  await supabase.from("materials").update({ deleted_at: now }).eq("class_id", classId);
  await supabase.from("material_groups").update({ deleted_at: now }).eq("class_id", classId);

  // Memberships last: removing our own tutor row would revoke the RLS access
  // the steps above rely on. The class row's own update still passes via
  // created_by, so it can follow.
  await supabase.from("class_members").delete().eq("class_id", classId);
  const { error } = await supabase.from("classes").update({ deleted_at: now }).eq("id", classId);
  if (error) return actionFail("SS-CLASS-06", error.message, { classId });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/classes");
  return { error: null };
}
