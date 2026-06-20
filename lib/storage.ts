import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export const MATERIALS_BUCKET = "materials";
export const HOMEWORK_BUCKET = "homework-attachments";

// Signed URLs are valid for 8 hours and regenerated on every page load. Long
// enough that a normal session never sees an expired link, short enough that a
// leaked link doesn't stay usable indefinitely.
const SIGNED_URL_TTL = 60 * 60 * 8;

type DbClient = SupabaseClient<Database>;

/**
 * Extract the in-bucket object path from a stored Supabase Storage URL.
 * Handles the public, signed and authenticated URL shapes, and strips any
 * existing query string. Returns null if the URL isn't for this bucket.
 */
export function storagePathFromUrl(url: string, bucket: string): string | null {
  for (const kind of ["public", "sign", "authenticated"]) {
    const marker = `/storage/v1/object/${kind}/${bucket}/`;
    const idx = url.indexOf(marker);
    if (idx !== -1) {
      const rest = url.slice(idx + marker.length).split("?")[0];
      return decodeURIComponent(rest);
    }
  }
  return null;
}

/**
 * Turn a stored URL into a short-lived signed URL. Falls back to the original
 * URL if the path can't be parsed or signing fails — so a public bucket keeps
 * working and one bad path never blanks a whole page.
 */
export async function signStoredUrl(
  supabase: DbClient,
  bucket: string,
  url: string
): Promise<string> {
  const path = storagePathFromUrl(url, bucket);
  if (!path) return url;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL);
  return data?.signedUrl ?? url;
}

/** Sign the `url` of every attachment in a list (returns a new array). */
export async function signAttachments<T extends { url: string }>(
  supabase: DbClient,
  bucket: string,
  attachments: T[]
): Promise<T[]> {
  return Promise.all(
    attachments.map(async (a) => ({
      ...a,
      url: await signStoredUrl(supabase, bucket, a.url),
    }))
  );
}
