-- =============================================================================
-- 0002_rls_policies.sql — Row Level Security for StudentSpace
-- =============================================================================
-- This is the RLS setup currently APPLIED in production (captured verbatim from
-- what was run in the Supabase SQL Editor). Kept here for version control and
-- so a fresh staging/local database can reproduce the same security model.
-- Safe to re-run (drops existing policies first).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Helper functions (SECURITY DEFINER avoids class_members recursion)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_class_member(p_class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.class_members cm
    WHERE cm.class_id = p_class_id
      AND cm.user_id = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.is_class_tutor(p_class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.class_members cm
    WHERE cm.class_id = p_class_id
      AND cm.user_id = (SELECT auth.uid())
      AND cm.role::text = 'tutor'
  );
$$;

CREATE OR REPLACE FUNCTION public.shares_class_with(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.class_members cm1
    JOIN public.class_members cm2 ON cm1.class_id = cm2.class_id
    WHERE cm1.user_id = (SELECT auth.uid())
      AND cm2.user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.has_pending_invite_to_class(p_class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.invites i
    WHERE i.class_id = p_class_id
      AND i.invited_user_id = (SELECT auth.uid())
      AND i.status::text = 'pending'
  );
$$;

REVOKE ALL ON FUNCTION public.is_class_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_class_tutor(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.shares_class_with(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_pending_invite_to_class(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_class_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_class_tutor(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.shares_class_with(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_pending_invite_to_class(uuid) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 2. Enable RLS on all tables
-- -----------------------------------------------------------------------------

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_requests ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 3. Drop old policies (safe re-run)
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'users', 'classes', 'class_members', 'invites', 'payment_cycles',
        'lessons', 'homework', 'submissions', 'material_groups', 'materials',
        'messages', 'parent_students', 'parent_requests'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 4. users
-- -----------------------------------------------------------------------------

CREATE POLICY users_select ON public.users
  FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND (
      id = (SELECT auth.uid())
      OR deleted_at IS NULL
    )
  );

CREATE POLICY users_update_own ON public.users
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY users_insert_own ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

-- -----------------------------------------------------------------------------
-- 5. classes
-- -----------------------------------------------------------------------------

CREATE POLICY classes_select ON public.classes
  FOR SELECT TO authenticated
  USING (
    public.is_class_member(id)
    OR created_by = (SELECT auth.uid())
    OR public.has_pending_invite_to_class(id)
  );

CREATE POLICY classes_insert ON public.classes
  FOR INSERT TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY classes_update ON public.classes
  FOR UPDATE TO authenticated
  USING (
    public.is_class_tutor(id)
    OR created_by = (SELECT auth.uid())
  )
  WITH CHECK (
    public.is_class_tutor(id)
    OR created_by = (SELECT auth.uid())
  );

-- -----------------------------------------------------------------------------
-- 6. class_members
-- -----------------------------------------------------------------------------

CREATE POLICY class_members_select ON public.class_members
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_class_member(class_id)
  );

CREATE POLICY class_members_insert_creator_tutor ON public.class_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND role::text = 'tutor'
    AND EXISTS (
      SELECT 1
      FROM public.classes c
      WHERE c.id = class_members.class_id
        AND c.created_by = (SELECT auth.uid())
    )
  );

CREATE POLICY class_members_insert_invite_accept ON public.class_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.invites i
      WHERE i.class_id = class_members.class_id
        AND i.invited_user_id = (SELECT auth.uid())
        AND i.status::text = 'pending'
        AND i.role::text = class_members.role::text
    )
  );

CREATE POLICY class_members_delete_self ON public.class_members
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY class_members_delete_tutor ON public.class_members
  FOR DELETE TO authenticated
  USING (public.is_class_tutor(class_id));

-- -----------------------------------------------------------------------------
-- 7. invites
-- -----------------------------------------------------------------------------

CREATE POLICY invites_select ON public.invites
  FOR SELECT TO authenticated
  USING (
    invited_user_id = (SELECT auth.uid())
    OR invited_by = (SELECT auth.uid())
    OR public.is_class_tutor(class_id)
  );

CREATE POLICY invites_insert_tutor ON public.invites
  FOR INSERT TO authenticated
  WITH CHECK (
    invited_by = (SELECT auth.uid())
    AND public.is_class_tutor(class_id)
  );

CREATE POLICY invites_update_invitee ON public.invites
  FOR UPDATE TO authenticated
  USING (invited_user_id = (SELECT auth.uid()))
  WITH CHECK (invited_user_id = (SELECT auth.uid()));

-- -----------------------------------------------------------------------------
-- 8. payment_cycles
-- -----------------------------------------------------------------------------

CREATE POLICY payment_cycles_select ON public.payment_cycles
  FOR SELECT TO authenticated
  USING (public.is_class_member(class_id));

CREATE POLICY payment_cycles_insert ON public.payment_cycles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_class_tutor(class_id));

CREATE POLICY payment_cycles_update ON public.payment_cycles
  FOR UPDATE TO authenticated
  USING (public.is_class_tutor(class_id))
  WITH CHECK (public.is_class_tutor(class_id));

-- -----------------------------------------------------------------------------
-- 9. lessons
-- -----------------------------------------------------------------------------

CREATE POLICY lessons_select ON public.lessons
  FOR SELECT TO authenticated
  USING (public.is_class_member(class_id));

CREATE POLICY lessons_insert ON public.lessons
  FOR INSERT TO authenticated
  WITH CHECK (public.is_class_tutor(class_id));

CREATE POLICY lessons_update ON public.lessons
  FOR UPDATE TO authenticated
  USING (public.is_class_tutor(class_id))
  WITH CHECK (public.is_class_tutor(class_id));

-- -----------------------------------------------------------------------------
-- 10. homework
-- -----------------------------------------------------------------------------

CREATE POLICY homework_select ON public.homework
  FOR SELECT TO authenticated
  USING (public.is_class_member(class_id));

CREATE POLICY homework_insert ON public.homework
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_class_tutor(class_id)
    AND created_by = (SELECT auth.uid())
  );

CREATE POLICY homework_update ON public.homework
  FOR UPDATE TO authenticated
  USING (public.is_class_tutor(class_id))
  WITH CHECK (public.is_class_tutor(class_id));

-- -----------------------------------------------------------------------------
-- 11. submissions
-- -----------------------------------------------------------------------------

CREATE POLICY submissions_select ON public.submissions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.homework h
      WHERE h.id = submissions.homework_id
        AND public.is_class_member(h.class_id)
    )
  );

CREATE POLICY submissions_insert_student ON public.submissions
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.homework h
      JOIN public.class_members cm ON cm.class_id = h.class_id
      WHERE h.id = submissions.homework_id
        AND cm.user_id = (SELECT auth.uid())
        AND cm.role::text = 'student'
        AND h.deleted_at IS NULL
        AND h.deadline > now()
    )
  );

CREATE POLICY submissions_update_tutor_grade ON public.submissions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.homework h
      WHERE h.id = submissions.homework_id
        AND public.is_class_tutor(h.class_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.homework h
      WHERE h.id = submissions.homework_id
        AND public.is_class_tutor(h.class_id)
    )
  );

-- -----------------------------------------------------------------------------
-- 12. material_groups
-- -----------------------------------------------------------------------------

CREATE POLICY material_groups_select ON public.material_groups
  FOR SELECT TO authenticated
  USING (public.is_class_member(class_id));

CREATE POLICY material_groups_insert ON public.material_groups
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_class_tutor(class_id)
    AND created_by = (SELECT auth.uid())
  );

CREATE POLICY material_groups_update ON public.material_groups
  FOR UPDATE TO authenticated
  USING (public.is_class_tutor(class_id))
  WITH CHECK (public.is_class_tutor(class_id));

-- -----------------------------------------------------------------------------
-- 13. materials
-- -----------------------------------------------------------------------------

CREATE POLICY materials_select ON public.materials
  FOR SELECT TO authenticated
  USING (public.is_class_member(class_id));

CREATE POLICY materials_insert ON public.materials
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_class_tutor(class_id)
    AND uploaded_by = (SELECT auth.uid())
  );

CREATE POLICY materials_update ON public.materials
  FOR UPDATE TO authenticated
  USING (public.is_class_tutor(class_id))
  WITH CHECK (public.is_class_tutor(class_id));

-- -----------------------------------------------------------------------------
-- 14. messages (employers: read-only)
-- -----------------------------------------------------------------------------

CREATE POLICY messages_select ON public.messages
  FOR SELECT TO authenticated
  USING (public.is_class_member(class_id));

CREATE POLICY messages_insert ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.class_members cm
      WHERE cm.class_id = messages.class_id
        AND cm.user_id = (SELECT auth.uid())
        AND cm.role::text IN ('tutor', 'student', 'parent')
    )
  );

-- -----------------------------------------------------------------------------
-- 15. parent_students
-- -----------------------------------------------------------------------------

CREATE POLICY parent_students_select ON public.parent_students
  FOR SELECT TO authenticated
  USING (
    parent_id = (SELECT auth.uid())
    OR student_id = (SELECT auth.uid())
  );

CREATE POLICY parent_students_insert ON public.parent_students
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.parent_requests pr
      WHERE pr.parent_id = parent_students.parent_id
        AND pr.student_id = (SELECT auth.uid())
        AND pr.status = 'accepted'
    )
  );

CREATE POLICY parent_students_delete ON public.parent_students
  FOR DELETE TO authenticated
  USING (
    parent_id = (SELECT auth.uid())
    OR student_id = (SELECT auth.uid())
  );

-- -----------------------------------------------------------------------------
-- 16. parent_requests
-- -----------------------------------------------------------------------------

CREATE POLICY parent_requests_select ON public.parent_requests
  FOR SELECT TO authenticated
  USING (
    parent_id = (SELECT auth.uid())
    OR student_id = (SELECT auth.uid())
  );

CREATE POLICY parent_requests_insert ON public.parent_requests
  FOR INSERT TO authenticated
  WITH CHECK (parent_id = (SELECT auth.uid()));

CREATE POLICY parent_requests_update_student ON public.parent_requests
  FOR UPDATE TO authenticated
  USING (student_id = (SELECT auth.uid()))
  WITH CHECK (student_id = (SELECT auth.uid()));
