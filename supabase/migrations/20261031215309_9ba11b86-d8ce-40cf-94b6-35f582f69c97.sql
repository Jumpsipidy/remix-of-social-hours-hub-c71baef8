-- 1) Profiles guard: protect school_id and class_year, sanitize INSERT defaults
CREATE OR REPLACE FUNCTION public.tg_profiles_guard_privileged()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('anon','authenticated') OR auth.uid() IS NULL
     OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.role := 'student';
    NEW.school_id := NULL;
    NEW.associated_school_id := NULL;
    NEW.hours_earned := 0;
    NEW.hours_needed := GREATEST(COALESCE(NEW.hours_needed, 20), 20);
    NEW.assigned_classes := '{}'::text[];
    NEW.assigned_letter := NULL;
    NEW.class_year := NULL;
    NEW.class_letter := NULL;
    NEW.auto_year_renewal := false;
    RETURN NEW;
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.school_id IS DISTINCT FROM OLD.school_id
     OR NEW.associated_school_id IS DISTINCT FROM OLD.associated_school_id
     OR NEW.hours_earned IS DISTINCT FROM OLD.hours_earned
     OR NEW.hours_needed IS DISTINCT FROM OLD.hours_needed
     OR NEW.class_year IS DISTINCT FROM OLD.class_year
     OR (OLD.class_letter IS NOT NULL AND NEW.class_letter IS DISTINCT FROM OLD.class_letter)
     OR NEW.assigned_classes IS DISTINCT FROM OLD.assigned_classes
     OR NEW.assigned_letter IS DISTINCT FROM OLD.assigned_letter
     OR NEW.auto_year_renewal IS DISTINCT FROM OLD.auto_year_renewal THEN
    RAISE EXCEPTION 'Šių laukų keisti negalima' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_privileged ON public.profiles;
CREATE TRIGGER profiles_guard_privileged
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_profiles_guard_privileged();

-- 2) award_reservation_hours: row lock prevents concurrent double-award
CREATE OR REPLACE FUNCTION public.award_reservation_hours(_reservation_id uuid, _hours integer DEFAULT NULL::integer)
RETURNS TABLE(student_id uuid, hours_awarded integer, new_total integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.reservations%ROWTYPE;
  award integer;
  owner_new integer;
BEGIN
  SELECT * INTO r FROM public.reservations WHERE id = _reservation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reservation not found'; END IF;
  IF NOT (auth.uid() = r.organization_id OR public.has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'Not authorized to complete this reservation';
  END IF;
  IF _hours IS NOT NULL AND (_hours < 0 OR _hours > 8) THEN
    RAISE EXCEPTION 'Valandos turi būti sveikas skaičius nuo 0 iki 8';
  END IF;
  IF r.status = 'completed' THEN
    RETURN QUERY SELECT p.id, 0, COALESCE(p.hours_earned,0) FROM public.profiles p
      WHERE p.id = r.student_id OR p.id IN (SELECT rp.student_id FROM public.reservation_participants rp WHERE rp.reservation_id = _reservation_id AND rp.status = 'accepted');
    RETURN;
  END IF;

  award := COALESCE(_hours, round(COALESCE(r.hours_to_earn, 0))::int);
  UPDATE public.reservations SET status = 'completed', hours_to_earn = award WHERE id = _reservation_id;

  UPDATE public.profiles SET hours_earned = COALESCE(hours_earned,0) + award
   WHERE id = r.student_id RETURNING hours_earned INTO owner_new;
  RETURN QUERY SELECT r.student_id, award, COALESCE(owner_new,0);

  RETURN QUERY
  WITH updated AS (
    UPDATE public.profiles p SET hours_earned = COALESCE(p.hours_earned,0) + award
      FROM public.reservation_participants rp
     WHERE rp.reservation_id = _reservation_id AND rp.status = 'accepted' AND rp.student_id = p.id AND p.id <> r.student_id
    RETURNING p.id, p.hours_earned
  ), stamped AS (
    UPDATE public.reservation_participants rp SET hours_awarded = award
     WHERE rp.reservation_id = _reservation_id AND rp.status = 'accepted' AND rp.student_id <> r.student_id
    RETURNING rp.student_id
  )
  SELECT u.id, award, u.hours_earned FROM updated u;
END $$;

REVOKE ALL ON FUNCTION public.award_reservation_hours(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_reservation_hours(uuid, integer) TO authenticated, service_role;

-- 3) Participants guard: also fire on INSERT and sanitize privileged fields.
-- NOTE: check_in_code is left untouched because participants_assign_checkin_code
-- fires before this trigger (alphabetical order) and assigns the code.
CREATE OR REPLACE FUNCTION public.tg_participants_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE r_owner uuid; r_org uuid;
BEGIN
  -- Trusted paths (SECURITY DEFINER functions, service role) run as the table owner.
  IF current_user NOT IN ('authenticated', 'anon') THEN RETURN NEW; END IF;
  IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.status := 'pending';
    NEW.hours_awarded := 0;
    NEW.checked_in_at := NULL;
    NEW.checked_in_by := NULL;
    RETURN NEW;
  END IF;

  IF NEW.reservation_id IS DISTINCT FROM OLD.reservation_id
     OR NEW.student_id IS DISTINCT FROM OLD.student_id
     OR NEW.invited_by IS DISTINCT FROM OLD.invited_by
     OR NEW.hours_awarded IS DISTINCT FROM OLD.hours_awarded
     OR NEW.check_in_code IS DISTINCT FROM OLD.check_in_code
     OR NEW.checked_in_at IS DISTINCT FROM OLD.checked_in_at
     OR NEW.checked_in_by IS DISTINCT FROM OLD.checked_in_by THEN
    RAISE EXCEPTION 'Šių dalyvio laukų keisti negalima' USING ERRCODE = '42501';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT student_id, organization_id INTO r_owner, r_org FROM public.reservations WHERE id = NEW.reservation_id;
    IF auth.uid() = NEW.student_id AND NEW.status IN ('accepted', 'declined') THEN RETURN NEW; END IF;
    IF auth.uid() IN (r_owner, r_org, OLD.invited_by) AND NEW.status = 'removed' THEN RETURN NEW; END IF;
    IF auth.uid() = r_org THEN RETURN NEW; END IF;
    RAISE EXCEPTION 'Negalima pakeisti kvietimo būsenos' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS participants_guard ON public.reservation_participants;
CREATE TRIGGER participants_guard
  BEFORE INSERT OR UPDATE ON public.reservation_participants
  FOR EACH ROW EXECUTE FUNCTION public.tg_participants_guard();

NOTIFY pgrst, 'reload schema';