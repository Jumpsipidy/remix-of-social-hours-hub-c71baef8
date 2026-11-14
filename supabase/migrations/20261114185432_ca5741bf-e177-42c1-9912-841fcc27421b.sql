CREATE OR REPLACE FUNCTION public.award_reservation_hours(_reservation_id uuid, _hours integer DEFAULT NULL::integer)
 RETURNS TABLE(student_id uuid, hours_awarded integer, new_total integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r public.reservations%ROWTYPE;
  award integer;
  owner_award integer;
  owner_new integer;
  needs_qr boolean;
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

  -- Real organizations: every person must scan their own QR / code to earn hours.
  needs_qr := r.requires_checkin AND r.source <> 'school'
    AND EXISTS (SELECT 1 FROM public.profiles o WHERE o.id = r.organization_id AND o.role = 'organization');

  IF needs_qr AND r.checked_in_at IS NULL AND NOT EXISTS (
    SELECT 1 FROM public.reservation_participants rp
     WHERE rp.reservation_id = _reservation_id AND rp.status = 'accepted' AND rp.checked_in_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Niekas dar nenuskenavo QR kodo — valandos skiriamos tik atvykusiems mokiniams';
  END IF;

  award := COALESCE(_hours, round(COALESCE(r.hours_to_earn, 0))::int);
  owner_award := CASE WHEN needs_qr AND r.checked_in_at IS NULL THEN 0 ELSE award END;

  PERFORM set_config('sv.awarding_hours', '1', true);
  UPDATE public.reservations SET status = 'completed', hours_to_earn = owner_award WHERE id = _reservation_id;

  UPDATE public.profiles SET hours_earned = COALESCE(hours_earned,0) + owner_award
   WHERE id = r.student_id RETURNING hours_earned INTO owner_new;
  RETURN QUERY SELECT r.student_id, owner_award, COALESCE(owner_new,0);

  RETURN QUERY
  WITH updated AS (
    UPDATE public.profiles p SET hours_earned = COALESCE(p.hours_earned,0) + award
      FROM public.reservation_participants rp
     WHERE rp.reservation_id = _reservation_id AND rp.status = 'accepted' AND rp.student_id = p.id AND p.id <> r.student_id
       AND (NOT needs_qr OR rp.checked_in_at IS NOT NULL)
    RETURNING p.id, p.hours_earned
  ), stamped AS (
    UPDATE public.reservation_participants rp
       SET hours_awarded = CASE WHEN NOT needs_qr OR rp.checked_in_at IS NOT NULL THEN award ELSE 0 END
     WHERE rp.reservation_id = _reservation_id AND rp.status = 'accepted' AND rp.student_id <> r.student_id
    RETURNING rp.student_id
  )
  SELECT u.id, award, u.hours_earned FROM updated u;
END $function$;

CREATE OR REPLACE FUNCTION public.tg_stamp_hours_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
 IF TG_OP = 'INSERT' THEN
  NEW.hours_approved_by := NULL; NEW.hours_approved_at := NULL;
  IF NEW.status = 'completed' AND auth.uid() IS NOT NULL AND NEW.source <> 'school'
     AND COALESCE(current_setting('sv.awarding_hours', true), '') <> '1' THEN
   RAISE EXCEPTION 'Užbaigti rezervaciją galima tik patvirtinus valandas';
  END IF;
 ELSIF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
  IF auth.uid() IS NOT NULL AND NOT (auth.uid() = NEW.organization_id OR public.has_role(auth.uid(), 'admin') OR (NEW.source = 'school' AND public.school_admin_can_manage(NEW.student_id))) THEN
   RAISE EXCEPTION 'Prieiga patvirtinti valandas uždrausta';
  END IF;
  -- Organization visits may only be completed through award_reservation_hours,
  -- which enforces the per-person QR check-in rule.
  IF auth.uid() IS NOT NULL AND NEW.source <> 'school' AND NEW.requires_checkin
     AND COALESCE(current_setting('sv.awarding_hours', true), '') <> '1' THEN
   RAISE EXCEPTION 'Valandos skiriamos tik per patvirtinimą po QR nuskenavimo';
  END IF;
  NEW.hours_approved_by := auth.uid(); NEW.hours_approved_at := now();
 ELSE
  NEW.hours_approved_by := OLD.hours_approved_by; NEW.hours_approved_at := OLD.hours_approved_at;
 END IF;
 RETURN NEW;
END $function$;