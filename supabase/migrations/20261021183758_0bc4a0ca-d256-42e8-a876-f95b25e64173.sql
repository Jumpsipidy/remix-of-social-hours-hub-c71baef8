CREATE OR REPLACE FUNCTION public.expire_stale_reservations()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE n integer;
BEGIN
  UPDATE public.reservations SET status = 'declined', updated_at = now()
  WHERE status IN ('pending', 'approved')
    AND source <> 'school'
    AND (reservation_date + end_time) < (now() AT TIME ZONE 'Europe/Vilnius') - interval '12 hours';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$function$;