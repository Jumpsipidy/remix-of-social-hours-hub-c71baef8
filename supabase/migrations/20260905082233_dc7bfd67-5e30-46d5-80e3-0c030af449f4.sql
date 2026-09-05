-- 1) Group participants must be able to read the reservation they joined
CREATE POLICY "Participants of group can view reservation"
ON public.reservations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.reservation_participants rp
    WHERE rp.reservation_id = reservations.id
      AND rp.student_id = auth.uid()
  )
);

-- 2) Auto-expire stale reservations
CREATE OR REPLACE FUNCTION public.expire_stale_reservations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  UPDATE public.reservations
     SET status = 'declined',
         updated_at = now()
   WHERE status IN ('pending', 'approved')
     AND (reservation_date + end_time) < (now() AT TIME ZONE 'Europe/Vilnius') - interval '12 hours';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

GRANT EXECUTE ON FUNCTION public.expire_stale_reservations() TO authenticated, service_role;