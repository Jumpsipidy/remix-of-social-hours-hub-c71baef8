CREATE OR REPLACE FUNCTION public.list_my_teachers()
RETURNS TABLE(id uuid, full_name text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.id, t.full_name FROM public.profiles me JOIN public.profiles t
    ON t.role = 'school_admin' AND COALESCE(t.school_id, t.associated_school_id) = me.school_id
   AND (cardinality(t.assigned_classes) = 0 OR me.class_year = ANY(t.assigned_classes))
   AND (t.assigned_letter IS NULL OR me.class_letter = t.assigned_letter)
  WHERE me.id = auth.uid() AND me.role = 'student' AND me.school_id IS NOT NULL
  ORDER BY t.full_name
$$;
REVOKE ALL ON FUNCTION public.list_my_teachers() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_my_teachers() TO authenticated;