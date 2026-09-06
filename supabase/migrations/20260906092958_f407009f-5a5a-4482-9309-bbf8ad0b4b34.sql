-- 1) Break the recursive RLS loop between reservations and reservation_participants
CREATE OR REPLACE FUNCTION public.is_reservation_participant(_reservation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.reservation_participants rp
    WHERE rp.reservation_id = _reservation_id
      AND rp.student_id = _user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_reservation_participant(uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Participants of group can view reservation" ON public.reservations;
CREATE POLICY "Participants of group can view reservation"
ON public.reservations
FOR SELECT
TO authenticated
USING (public.is_reservation_participant(id, auth.uid()));

-- 2) Allow school admins to create chat rooms
DROP POLICY IF EXISTS "Participants can create chat rooms" ON public.chat_rooms;
CREATE POLICY "Participants can create chat rooms"
ON public.chat_rooms
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = student_id
  OR auth.uid() = organization_id
  OR auth.uid() = school_admin_id
  OR public.has_role(auth.uid(), 'admin')
);