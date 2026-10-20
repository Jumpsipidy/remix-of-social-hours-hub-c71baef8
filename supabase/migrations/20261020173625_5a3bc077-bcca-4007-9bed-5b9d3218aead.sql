CREATE OR REPLACE FUNCTION public.school_update_reservation(
  _caller uuid, _reservation_id uuid, _date date, _start time, _end time, _hours integer, _kind text, _note text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.reservations%ROWTYPE;
BEGIN
  IF _caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _caller AND role IN ('school_admin','admin')) THEN
    RAISE EXCEPTION 'Prieiga tik mokyklos administratoriams';
  END IF;
  SELECT * INTO r FROM public.reservations WHERE id = _reservation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Rezervacija nerasta'; END IF;
  IF r.source <> 'school' THEN RAISE EXCEPTION 'Tik mokyklos rezervacijos'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles me JOIN public.profiles s ON s.id = r.student_id
    WHERE me.id = _caller AND s.role = 'student'
      AND (me.role = 'admin' OR (me.role = 'school_admin'
        AND COALESCE(me.school_id, me.associated_school_id) IS NOT NULL
        AND s.school_id = COALESCE(me.school_id, me.associated_school_id)
        AND (cardinality(me.assigned_classes) = 0 OR s.class_year = ANY(me.assigned_classes))
        AND (me.assigned_letter IS NULL OR s.class_letter = me.assigned_letter)))
  ) THEN RAISE EXCEPTION 'Prieiga uždrausta'; END IF;
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
REVOKE ALL ON FUNCTION public.school_update_reservation(uuid, uuid, date, time, time, integer, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.school_update_reservation(uuid, uuid, date, time, time, integer, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.school_delete_reservation(_caller uuid, _reservation_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.reservations%ROWTYPE;
BEGIN
  IF _caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _caller AND role IN ('school_admin','admin')) THEN
    RAISE EXCEPTION 'Prieiga tik mokyklos administratoriams';
  END IF;
  SELECT * INTO r FROM public.reservations WHERE id = _reservation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Rezervacija nerasta'; END IF;
  IF r.source <> 'school' THEN RAISE EXCEPTION 'Tik mokyklos rezervacijos'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles me JOIN public.profiles s ON s.id = r.student_id
    WHERE me.id = _caller AND s.role = 'student'
      AND (me.role = 'admin' OR (me.role = 'school_admin'
        AND COALESCE(me.school_id, me.associated_school_id) IS NOT NULL
        AND s.school_id = COALESCE(me.school_id, me.associated_school_id)
        AND (cardinality(me.assigned_classes) = 0 OR s.class_year = ANY(me.assigned_classes))
        AND (me.assigned_letter IS NULL OR s.class_letter = me.assigned_letter)))
  ) THEN RAISE EXCEPTION 'Prieiga uždrausta'; END IF;
  IF r.status IN ('completed','confirmed') THEN RAISE EXCEPTION 'Užbaigtos rezervacijos trinti negalima'; END IF;
  DELETE FROM public.reservations WHERE id = r.id;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.school_delete_reservation(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.school_delete_reservation(uuid, uuid) TO service_role;

-- Remove the earlier authenticated-callable signatures from this session's first migration.
REVOKE ALL ON FUNCTION public.school_update_reservation(uuid, date, time, time, integer, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.school_delete_reservation(uuid) FROM PUBLIC, anon, authenticated;
DROP FUNCTION IF EXISTS public.school_update_reservation(uuid, date, time, time, integer, text, text);
DROP FUNCTION IF EXISTS public.school_delete_reservation(uuid);