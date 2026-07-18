
-- 1) Hide school signup codes from public reads (keep RLS open for other columns)
REVOKE SELECT (signup_code) ON public.schools FROM anon, authenticated;

-- 2) Lock down storage bucket 'database_export_06_07_26' to admins only
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='db_export_admin_only_select') THEN
    CREATE POLICY "db_export_admin_only_select" ON storage.objects FOR SELECT TO authenticated
      USING (bucket_id = 'database_export_06_07_26' AND public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='db_export_admin_only_insert') THEN
    CREATE POLICY "db_export_admin_only_insert" ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'database_export_06_07_26' AND public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='db_export_admin_only_update') THEN
    CREATE POLICY "db_export_admin_only_update" ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = 'database_export_06_07_26' AND public.has_role(auth.uid(), 'admin'))
      WITH CHECK (bucket_id = 'database_export_06_07_26' AND public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='db_export_admin_only_delete') THEN
    CREATE POLICY "db_export_admin_only_delete" ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'database_export_06_07_26' AND public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- 3) Scope school admins to their own school for reservations
DROP POLICY IF EXISTS "School admin can view reservations" ON public.reservations;
CREATE POLICY "School admin can view reservations in their school"
ON public.reservations FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'school_admin') AND EXISTS (
    SELECT 1 FROM public.profiles sa
    JOIN public.profiles st ON st.id = reservations.student_id
    WHERE sa.id = auth.uid()
      AND sa.associated_school_id IS NOT NULL
      AND st.school_id = sa.associated_school_id
  )
);

-- 4) Scope can_view_profile so school_admins only see their own school students
CREATE OR REPLACE FUNCTION public.can_view_profile(_target uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    auth.uid() = _target
    OR public.has_role(auth.uid(), 'admin')
    OR (
      public.has_role(auth.uid(), 'school_admin')
      AND EXISTS (
        SELECT 1 FROM public.profiles sa, public.profiles t
        WHERE sa.id = auth.uid() AND t.id = _target
          AND sa.associated_school_id IS NOT NULL
          AND t.school_id = sa.associated_school_id
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.chat_rooms r
      WHERE (r.student_id = auth.uid() OR r.organization_id = auth.uid() OR r.school_admin_id = auth.uid())
        AND (r.student_id = _target OR r.organization_id = _target OR r.school_admin_id = _target)
    )
    OR EXISTS (
      SELECT 1 FROM public.reservations res
      WHERE (res.student_id = auth.uid() OR res.organization_id = auth.uid())
        AND (res.student_id = _target OR res.organization_id = _target)
    );
$$;
