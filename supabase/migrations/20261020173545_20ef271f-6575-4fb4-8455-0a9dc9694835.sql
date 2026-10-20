CREATE OR REPLACE FUNCTION public.school_update_reservation(
  _reservation_id uuid, _date date, _start time, _end time, _hours integer, _kind text, _note text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.reservations%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO r FROM public.reservations WHERE id = _reservation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Rezervacija nerasta'; END IF;
  IF r.source <> 'school' THEN RAISE EXCEPTION 'Tik mokyklos rezervacijos'; END IF;
  IF NOT public.school_admin_can_manage(r.student_id) THEN RAISE EXCEPTION 'Prieiga uždrausta'; END IF;
  IF r.status IN ('completed','confirmed') THEN RAISE EXCEPTION 'Užbaigtos rezervacijos keisti negalima'; END IF;
  IF _end <= _start THEN RAISE EXCEPTION 'Pabaiga turi būti vėliau nei pradžia'; END IF;
  UPDATE public.reservations SET
    reservation_date = _date,
    start_time = _start,
    end_time = _end,
    hours_to_earn = GREATEST(0, LEAST(8, _hours)),
    kind = COALESCE(_kind, kind),
    note = left(_note, 1000)
  WHERE id = r.id;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.school_update_reservation(uuid, date, time, time, integer, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.school_update_reservation(uuid, date, time, time, integer, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.school_delete_reservation(_reservation_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.reservations%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO r FROM public.reservations WHERE id = _reservation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Rezervacija nerasta'; END IF;
  IF r.source <> 'school' THEN RAISE EXCEPTION 'Tik mokyklos rezervacijos'; END IF;
  IF NOT public.school_admin_can_manage(r.student_id) THEN RAISE EXCEPTION 'Prieiga uždrausta'; END IF;
  IF r.status IN ('completed','confirmed') THEN RAISE EXCEPTION 'Užbaigtos rezervacijos trinti negalima'; END IF;
  DELETE FROM public.reservations WHERE id = r.id;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.school_delete_reservation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.school_delete_reservation(uuid) TO authenticated;