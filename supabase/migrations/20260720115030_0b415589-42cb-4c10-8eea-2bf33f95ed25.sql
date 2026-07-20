CREATE OR REPLACE FUNCTION public.can_view_profile(_target uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    auth.uid() = _target
    OR public.has_role(auth.uid(), 'admin')
    OR (
      public.has_role(auth.uid(), 'school_admin')
      AND EXISTS (
        SELECT 1
        FROM public.profiles sa
        JOIN public.profiles t ON t.id = _target
        WHERE sa.id = auth.uid()
          AND sa.associated_school_id IS NOT NULL
          AND t.school_id = sa.associated_school_id
          AND (
            COALESCE(cardinality(sa.assigned_classes), 0) = 0
            OR t.class_year = ANY(sa.assigned_classes)
          )
      )
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles me
      JOIN public.profiles t ON t.id = _target
      WHERE me.id = auth.uid()
        AND me.role = 'student'
        AND t.role = 'student'
        AND me.school_id IS NOT NULL
        AND me.school_id = t.school_id
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
$function$;