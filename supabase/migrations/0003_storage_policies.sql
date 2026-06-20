-- =============================================================================
-- 0003_storage_policies.sql — private bucket access control
-- =============================================================================
-- Run this in the Supabase SQL Editor BEFORE flipping the buckets to private.
-- It is harmless to run while the buckets are still public (the policies just
-- sit unused until a bucket is private).
--
-- Object paths are `<classId>/...` for materials and homework attachments, and
-- `<classId>/submissions/<hwId>/...` for submissions — so the first folder is
-- always the class id, which is what these policies check.
--
-- After running this AND deploying the signed-URL app code, flip both buckets
-- to private in Dashboard → Storage → bucket → Settings.
-- =============================================================================

-- Clean slate: drop any existing policies on storage.objects (this project has
-- only the `materials` and `homework-attachments` buckets, so this is safe).
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
  END LOOP;
END $$;

-- ---------- materials: class members read, tutors write ----------
CREATE POLICY materials_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'materials'
    AND public.is_class_member(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY materials_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'materials'
    AND public.is_class_tutor(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY materials_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'materials'
    AND public.is_class_tutor(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY materials_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'materials'
    AND public.is_class_tutor(((storage.foldername(name))[1])::uuid)
  );

-- ---------- homework-attachments: members read, members write ----------
-- (tutors upload homework files; students upload submissions — both members)
CREATE POLICY homework_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'homework-attachments'
    AND public.is_class_member(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY homework_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'homework-attachments'
    AND public.is_class_member(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY homework_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'homework-attachments'
    AND public.is_class_member(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY homework_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'homework-attachments'
    AND public.is_class_tutor(((storage.foldername(name))[1])::uuid)
  );
