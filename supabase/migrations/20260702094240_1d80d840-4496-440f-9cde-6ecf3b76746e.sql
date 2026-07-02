
-- 1) Profiles: replace the "true" SELECT policy with a relationship-scoped one
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;

CREATE OR REPLACE FUNCTION public.can_view_profile(_target uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() = _target
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'school_admin')
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

REVOKE EXECUTE ON FUNCTION public.can_view_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_profile(uuid) TO authenticated, service_role;

CREATE POLICY "profiles_scoped_select"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.can_view_profile(id));

-- 2) Lock down SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_chat_room_member(uuid, uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_chat_room_member(uuid, uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.purge_old_messages() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.purge_old_messages() TO service_role;
