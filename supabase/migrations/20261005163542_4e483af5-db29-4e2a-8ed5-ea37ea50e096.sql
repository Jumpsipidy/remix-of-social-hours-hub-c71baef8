CREATE OR REPLACE FUNCTION public.has_reservation_for_task(_task_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.reservations r WHERE r.task_id = _task_id AND r.student_id = _user_id)
$$;
REVOKE ALL ON FUNCTION public.has_reservation_for_task(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_reservation_for_task(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Tasks visible when open or related" ON public.tasks;
CREATE POLICY "Tasks visible when open or related" ON public.tasks FOR SELECT TO authenticated
USING (
  is_open = true
  OR auth.uid() = organization_id
  OR auth.uid() = created_by
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'school_admin'::app_role)
  OR public.has_reservation_for_task(id, auth.uid())
);