CREATE OR REPLACE FUNCTION public.get_reservation_groups(_ids uuid[])
RETURNS TABLE(reservation_id uuid, member_id uuid, full_name text, class_year text, status text, is_owner boolean, checked_in boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  WITH allowed AS (
    SELECT r.id, r.student_id, r.checked_in_at
    FROM public.reservations r
    WHERE r.id = ANY(COALESCE(_ids, ARRAY[]::uuid[]))
      AND auth.uid() IS NOT NULL
      AND (
        r.student_id = auth.uid()
        OR r.organization_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin')
        OR EXISTS (SELECT 1 FROM public.reservation_participants x
                   WHERE x.reservation_id = r.id AND x.student_id = auth.uid() AND x.status IN ('pending','accepted'))
      )
      AND EXISTS (SELECT 1 FROM public.reservation_participants y WHERE y.reservation_id = r.id AND y.status <> 'removed')
  )
  SELECT a.id, a.student_id, p.full_name, p.class_year, 'owner'::text, true, a.checked_in_at IS NOT NULL
  FROM allowed a LEFT JOIN public.profiles p ON p.id = a.student_id
  UNION ALL
  SELECT a.id, rp.student_id, p.full_name, p.class_year, rp.status, false, rp.checked_in_at IS NOT NULL
  FROM allowed a
  JOIN public.reservation_participants rp ON rp.reservation_id = a.id AND rp.status IN ('pending','accepted')
  LEFT JOIN public.profiles p ON p.id = rp.student_id;
$$;

CREATE OR REPLACE FUNCTION public.list_my_group_invites()
RETURNS TABLE(participant_id uuid, reservation_id uuid, inviter_name text, org_name text, task_title text, reservation_date date, start_time time, end_time time, hours_to_earn numeric, going integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT rp.id, r.id,
         COALESCE(inv.full_name, 'Draugas'),
         COALESCE(org.organization_name, org.full_name, 'Organizacija'),
         t.title, r.reservation_date, r.start_time, r.end_time, r.hours_to_earn,
         1 + (SELECT count(*)::int FROM public.reservation_participants o WHERE o.reservation_id = r.id AND o.status = 'accepted')
  FROM public.reservation_participants rp
  JOIN public.reservations r ON r.id = rp.reservation_id
  LEFT JOIN public.profiles inv ON inv.id = COALESCE(rp.invited_by, r.student_id)
  LEFT JOIN public.profiles org ON org.id = r.organization_id
  LEFT JOIN public.tasks t ON t.id = r.task_id
  WHERE rp.student_id = auth.uid()
    AND rp.status = 'pending'
    AND r.status::text NOT IN ('declined','completed')
  ORDER BY r.reservation_date ASC;
$$;

REVOKE ALL ON FUNCTION public.get_reservation_groups(uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_my_group_invites() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_reservation_groups(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_group_invites() TO authenticated;

CREATE OR REPLACE FUNCTION public.tg_participants_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
DECLARE r_owner uuid; r_org uuid; r_status text; r_source text;
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN RETURN NEW; END IF;
  IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    SELECT student_id, organization_id, status::text, source INTO r_owner, r_org, r_status, r_source
      FROM public.reservations WHERE id = NEW.reservation_id;
    IF r_source = 'school' THEN
      RAISE EXCEPTION 'Į auklėtojo rezervacijas draugų kviesti negalima' USING ERRCODE = '42501';
    END IF;
    IF r_status IN ('declined', 'completed') THEN
      RAISE EXCEPTION 'Į užbaigtą ar atmestą rezervaciją kviesti negalima' USING ERRCODE = '42501';
    END IF;
    IF NEW.student_id = r_owner THEN
      RAISE EXCEPTION 'Savęs pakviesti negalima' USING ERRCODE = '42501';
    END IF;
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
END $function$;