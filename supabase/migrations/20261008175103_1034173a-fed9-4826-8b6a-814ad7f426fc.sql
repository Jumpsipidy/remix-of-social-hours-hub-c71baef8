CREATE OR REPLACE FUNCTION public.set_my_assigned_classes(_classes text[]) RETURNS text[]
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_clean text[];
BEGIN
  -- Only the Super Admin may change class assignments (school admins are locked).
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Klases keisti gali tik sistemos administratorius';
  END IF;
  SELECT COALESCE(array_agg(DISTINCT c), '{}'::text[]) INTO v_clean
  FROM (SELECT trim(x) AS c FROM unnest(COALESCE(_classes, '{}'::text[])) x
        WHERE trim(x) <> '' AND length(trim(x)) <= 24) s;
  UPDATE public.profiles SET assigned_classes = v_clean, updated_at = now() WHERE id = auth.uid();
  RETURN v_clean;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_school_streak_leaderboard()
RETURNS TABLE(id uuid, full_name text, class_year text, login_streak integer, longest_login_streak integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.full_name, p.class_year::text, p.login_streak, p.longest_login_streak
    FROM public.profiles p
    JOIN public.profiles me ON me.id = auth.uid()
   WHERE p.role = 'student'
     AND COALESCE(p.login_streak, 0) > 0
     AND (
       -- students: only their own class (e.g. 7A, not 7B)
       (me.role = 'student' AND me.school_id IS NOT NULL AND p.school_id = me.school_id
         AND p.class_year IS NOT DISTINCT FROM me.class_year
         AND p.class_letter IS NOT DISTINCT FROM me.class_letter)
       -- teachers: their assigned classes/letter
       OR (me.role = 'school_admin' AND public.school_admin_can_manage(p.id))
       OR me.role = 'admin'
     )
   ORDER BY p.login_streak DESC, p.longest_login_streak DESC
   LIMIT 10;
$$;