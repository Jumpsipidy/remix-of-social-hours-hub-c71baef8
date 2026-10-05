CREATE OR REPLACE FUNCTION public.tg_whole_hours() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_TABLE_NAME = 'reservations' THEN
    NEW.hours_to_earn := round(COALESCE(NEW.hours_to_earn,0));
  ELSIF TG_TABLE_NAME = 'tasks' THEN
    NEW.available_hours := round(COALESCE(NEW.available_hours,0));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS a_whole_hours ON public.reservations;
CREATE TRIGGER a_whole_hours BEFORE INSERT OR UPDATE ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.tg_whole_hours();
DROP TRIGGER IF EXISTS a_whole_hours ON public.tasks;
CREATE TRIGGER a_whole_hours BEFORE INSERT OR UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.tg_whole_hours();

CREATE OR REPLACE FUNCTION public.award_reservation_hours(_reservation_id uuid, _hours integer DEFAULT NULL)
RETURNS TABLE(student_id uuid, hours_awarded integer, new_total integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r public.reservations%ROWTYPE;
  award integer;
  owner_new integer;
BEGIN
  SELECT * INTO r FROM public.reservations WHERE id = _reservation_id;
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
DROP FUNCTION IF EXISTS public.award_reservation_hours(uuid);
REVOKE EXECUTE ON FUNCTION public.award_reservation_hours(uuid, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.award_reservation_hours(uuid, integer) TO authenticated;