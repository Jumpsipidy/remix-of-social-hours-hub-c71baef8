ALTER TABLE public.bug_reports ADD COLUMN IF NOT EXISTS diagnostics jsonb, ADD COLUMN IF NOT EXISTS session_id text;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS class_letter text, ADD COLUMN IF NOT EXISTS assigned_letter text;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'volunteer',
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'student',
  ADD COLUMN IF NOT EXISTS requires_checkin boolean NOT NULL DEFAULT true;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'volunteer';

CREATE OR REPLACE FUNCTION public.tg_validate_class_letter() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.class_letter IS NOT NULL THEN NEW.class_letter := upper(trim(NEW.class_letter)); END IF;
  IF NEW.assigned_letter IS NOT NULL THEN NEW.assigned_letter := upper(trim(NEW.assigned_letter)); END IF;
  IF NEW.class_letter = '' THEN NEW.class_letter := NULL; END IF;
  IF NEW.assigned_letter = '' THEN NEW.assigned_letter := NULL; END IF;
  IF NEW.class_letter IS NOT NULL AND NEW.class_letter NOT IN ('A','B') THEN RAISE EXCEPTION 'Klasės raidė turi būti A arba B'; END IF;
  IF NEW.assigned_letter IS NOT NULL AND NEW.assigned_letter NOT IN ('A','B') THEN RAISE EXCEPTION 'Klasės raidė turi būti A arba B'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS profiles_validate_class_letter ON public.profiles;
CREATE TRIGGER profiles_validate_class_letter BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_validate_class_letter();

CREATE OR REPLACE FUNCTION public.tg_validate_reservation_kind() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.kind NOT IN ('volunteer','consultation','event','other') THEN RAISE EXCEPTION 'Neleistinas veiklos tipas'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS reservations_validate_kind ON public.reservations;
CREATE TRIGGER reservations_validate_kind BEFORE INSERT OR UPDATE ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.tg_validate_reservation_kind();
DROP TRIGGER IF EXISTS tasks_validate_kind ON public.tasks;
CREATE TRIGGER tasks_validate_kind BEFORE INSERT OR UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.tg_validate_reservation_kind();

CREATE OR REPLACE FUNCTION public.tg_profiles_guard_privileged()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  IF current_user NOT IN ('anon','authenticated') OR auth.uid() IS NULL
     OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.role := 'student'; NEW.associated_school_id := NULL; NEW.hours_earned := 0; NEW.assigned_letter := NULL;
    RETURN NEW;
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.associated_school_id IS DISTINCT FROM OLD.associated_school_id
     OR NEW.hours_earned IS DISTINCT FROM OLD.hours_earned
     OR NEW.assigned_classes IS DISTINCT FROM OLD.assigned_classes
     OR NEW.assigned_letter IS DISTINCT FROM OLD.assigned_letter
     OR NEW.auto_year_renewal IS DISTINCT FROM OLD.auto_year_renewal
     OR (OLD.class_letter IS NOT NULL AND NEW.class_letter IS DISTINCT FROM OLD.class_letter) THEN
    RAISE EXCEPTION 'Šių laukų keisti negalima';
  END IF;
  RETURN NEW;
END;
$function$;

-- Can the caller (school admin) manage this student?
CREATE OR REPLACE FUNCTION public.school_admin_can_manage(_student uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles me JOIN public.profiles s ON s.id = _student
    WHERE me.id = auth.uid() AND s.role = 'student'
      AND (me.role = 'admin' OR (me.role = 'school_admin'
        AND COALESCE(me.school_id, me.associated_school_id) IS NOT NULL
        AND s.school_id = COALESCE(me.school_id, me.associated_school_id)
        AND (cardinality(me.assigned_classes) = 0 OR s.class_year = ANY(me.assigned_classes))
        AND (me.assigned_letter IS NULL OR s.class_letter = me.assigned_letter)))
  )
$$;
REVOKE ALL ON FUNCTION public.school_admin_can_manage(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.school_admin_can_manage(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.school_create_reservations(
  _student_ids uuid[], _organization_id uuid, _task_id uuid, _date date, _start time, _end time,
  _hours integer, _kind text, _note text
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sid uuid; n integer := 0; org uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT (public.has_role(auth.uid(),'school_admin') OR public.has_role(auth.uid(),'admin')
          OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('school_admin','admin'))) THEN
    RAISE EXCEPTION 'Prieiga tik mokyklos administratoriams';
  END IF;
  IF _end <= _start THEN RAISE EXCEPTION 'Pabaiga turi būti vėliau nei pradžia'; END IF;
  org := COALESCE(_organization_id, auth.uid());
  FOREACH sid IN ARRAY _student_ids LOOP
    IF NOT public.school_admin_can_manage(sid) THEN RAISE EXCEPTION 'Mokinys nepriklauso jūsų klasei'; END IF;
    INSERT INTO public.reservations (student_id, organization_id, task_id, reservation_date, start_time, end_time,
      hours_to_earn, status, note, kind, source, requires_checkin)
    VALUES (sid, org, _task_id, _date, _start, _end, GREATEST(0, LEAST(8, _hours)), 'approved',
      left(_note, 1000), COALESCE(_kind,'volunteer'), 'school', false);
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.school_create_reservations(uuid[], uuid, uuid, date, time, time, integer, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.school_create_reservations(uuid[], uuid, uuid, date, time, time, integer, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.school_complete_reservation(_reservation_id uuid, _hours integer, _decline boolean DEFAULT false)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.reservations%ROWTYPE; h integer := GREATEST(0, LEAST(8, COALESCE(_hours,0)));
BEGIN
  SELECT * INTO r FROM public.reservations WHERE id = _reservation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Rezervacija nerasta'; END IF;
  IF r.source <> 'school' THEN RAISE EXCEPTION 'Tik mokyklos rezervacijos'; END IF;
  IF NOT public.school_admin_can_manage(r.student_id) THEN RAISE EXCEPTION 'Prieiga uždrausta'; END IF;
  IF r.status IN ('completed','confirmed','declined') THEN RETURN false; END IF;
  IF _decline THEN
    UPDATE public.reservations SET status = 'declined' WHERE id = r.id;
    RETURN true;
  END IF;
  UPDATE public.reservations SET status = 'completed', hours_to_earn = h WHERE id = r.id;
  UPDATE public.profiles SET hours_earned = hours_earned + h WHERE id = r.student_id;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.school_complete_reservation(uuid, integer, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.school_complete_reservation(uuid, integer, boolean) TO authenticated;

-- DMs: friends, or a school admin with one of their own students.
CREATE OR REPLACE FUNCTION public.open_dm_room(_other uuid)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE me UUID := auth.uid(); a UUID; b UUID; rid UUID; ok boolean := false;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF me = _other THEN RAISE EXCEPTION 'Cannot DM yourself'; END IF;
  ok := EXISTS (SELECT 1 FROM public.friendships WHERE status = 'accepted'
      AND ((requester_id = me AND addressee_id = _other) OR (requester_id = _other AND addressee_id = me)))
    OR public.school_admin_can_manage(_other)
    OR EXISTS (SELECT 1 FROM public.profiles me_p JOIN public.profiles t ON t.id = _other
       WHERE me_p.id = me AND me_p.role = 'student' AND t.role = 'school_admin'
         AND COALESCE(t.school_id, t.associated_school_id) = me_p.school_id
         AND (cardinality(t.assigned_classes) = 0 OR me_p.class_year = ANY(t.assigned_classes))
         AND (t.assigned_letter IS NULL OR me_p.class_letter = t.assigned_letter));
  IF NOT ok THEN RAISE EXCEPTION 'You must be friends to DM'; END IF;
  IF me < _other THEN a := me; b := _other; ELSE a := _other; b := me; END IF;
  SELECT id INTO rid FROM public.dm_rooms WHERE user_a = a AND user_b = b;
  IF rid IS NULL THEN INSERT INTO public.dm_rooms(user_a, user_b) VALUES (a, b) RETURNING id INTO rid; END IF;
  RETURN rid;
END; $function$;

NOTIFY pgrst, 'reload schema';