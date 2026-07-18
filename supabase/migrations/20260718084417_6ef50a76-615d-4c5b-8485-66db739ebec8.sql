
CREATE OR REPLACE FUNCTION public.award_reservation_hours(_reservation_id uuid)
RETURNS TABLE(student_id uuid, hours_awarded integer, new_total integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.reservations%ROWTYPE;
  new_hours integer;
BEGIN
  SELECT * INTO r FROM public.reservations WHERE id = _reservation_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservation not found';
  END IF;
  -- Only the reservation's organization, or an admin, may finalize
  IF NOT (auth.uid() = r.organization_id OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Not authorized to complete this reservation';
  END IF;
  IF r.status = 'completed' THEN
    -- Idempotent no-op
    SELECT p.hours_earned INTO new_hours FROM public.profiles p WHERE p.id = r.student_id;
    RETURN QUERY SELECT r.student_id, 0, COALESCE(new_hours, 0);
    RETURN;
  END IF;

  UPDATE public.reservations SET status = 'completed' WHERE id = _reservation_id;
  UPDATE public.profiles
     SET hours_earned = COALESCE(hours_earned, 0) + COALESCE(r.hours_to_earn, 0)
   WHERE id = r.student_id
   RETURNING hours_earned INTO new_hours;

  RETURN QUERY SELECT r.student_id, COALESCE(r.hours_to_earn, 0), COALESCE(new_hours, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.award_reservation_hours(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_reservation_hours(uuid) TO authenticated;
