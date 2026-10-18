DROP POLICY IF EXISTS "rp insert inviter" ON public.reservation_participants;

CREATE OR REPLACE FUNCTION public.tg_participants_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE r_owner uuid; r_org uuid;
BEGIN
  -- Trusted paths (SECURITY DEFINER functions, service role) run as the table owner.
  IF current_user NOT IN ('authenticated', 'anon') THEN RETURN NEW; END IF;
  IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;

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
CREATE TRIGGER participants_guard BEFORE UPDATE ON public.reservation_participants
FOR EACH ROW EXECUTE FUNCTION public.tg_participants_guard();