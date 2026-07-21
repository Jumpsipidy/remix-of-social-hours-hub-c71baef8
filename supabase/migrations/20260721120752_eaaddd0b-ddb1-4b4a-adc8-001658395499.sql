
-- 1) Hide schools.signup_code from anon/authenticated (RPC still works)
REVOKE SELECT ON public.schools FROM anon, authenticated;
GRANT SELECT (id, name, city, is_active, created_at) ON public.schools TO anon, authenticated;

-- 2) Hide site_settings.lockdown_code from anon/authenticated (RPC get_lockdown_public still works)
REVOKE SELECT ON public.site_settings FROM anon, authenticated;
GRANT SELECT (id, lockdown_enabled, lockdown_message, updated_at, updated_by) ON public.site_settings TO anon, authenticated;

-- 3) Narrow can_view_profile: drop same-school student branch (email leak).
--    Students no longer see arbitrary classmates' profiles via the profiles table;
--    they use the search_classmates RPC (below) which returns non-sensitive columns.
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
      SELECT 1 FROM public.chat_rooms r
      WHERE (r.student_id = auth.uid() OR r.organization_id = auth.uid() OR r.school_admin_id = auth.uid())
        AND (r.student_id = _target OR r.organization_id = _target OR r.school_admin_id = _target)
    )
    OR EXISTS (
      SELECT 1 FROM public.reservations res
      WHERE (res.student_id = auth.uid() OR res.organization_id = auth.uid())
        AND (res.student_id = _target OR res.organization_id = _target)
    )
    OR EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.status = 'accepted'
        AND ((f.requester_id = auth.uid() AND f.addressee_id = _target)
          OR (f.addressee_id = auth.uid() AND f.requester_id = _target))
    );
$function$;

-- 4) Safe classmate search RPC — returns only non-sensitive columns; public_email if student opted in.
CREATE OR REPLACE FUNCTION public.search_classmates(_q text DEFAULT '')
 RETURNS TABLE(id uuid, full_name text, class_year text, hours_earned integer, school_id uuid, public_email text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  me_school uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT p.school_id INTO me_school FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'student';
  IF me_school IS NULL THEN
    RETURN;
  END IF;
  RETURN QUERY
    SELECT p.id, p.full_name, p.class_year, p.hours_earned, p.school_id, p.public_email
    FROM public.profiles p
    WHERE p.school_id = me_school
      AND p.role = 'student'
      AND p.id <> auth.uid()
      AND (coalesce(_q,'') = '' OR p.full_name ILIKE '%' || _q || '%')
    ORDER BY p.full_name
    LIMIT 20;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.search_classmates(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_classmates(text) TO authenticated, service_role;
