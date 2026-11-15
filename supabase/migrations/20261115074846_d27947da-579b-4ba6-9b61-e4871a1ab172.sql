CREATE OR REPLACE FUNCTION public.invite_friends_to_reservation(_reservation_id uuid, _friend_ids uuid[])
RETURNS TABLE(invited integer, skipped integer, spots_left integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  me uuid := auth.uid();
  r record;
  cap integer;
  taken integer := 0;
  fid uuid;
  existing record;
  n_inv integer := 0;
  n_skip integer := 0;
  wanted uuid[];
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Reikia prisijungti' USING ERRCODE = '42501'; END IF;
  SELECT id, student_id, task_id, status::text AS status, source INTO r
    FROM public.reservations WHERE id = _reservation_id FOR UPDATE;
  IF r.id IS NULL OR r.student_id IS DISTINCT FROM me THEN
    RAISE EXCEPTION 'Kviesti gali tik rezervacijos savininkas' USING ERRCODE = '42501';
  END IF;
  IF r.source = 'school' THEN RAISE EXCEPTION 'Į auklėtojo rezervacijas draugų kviesti negalima' USING ERRCODE = '42501'; END IF;
  IF r.status NOT IN ('pending', 'approved') THEN RAISE EXCEPTION 'Į užbaigtą ar atmestą rezervaciją kviesti negalima' USING ERRCODE = '42501'; END IF;

  SELECT array_agg(DISTINCT x) INTO wanted FROM unnest(COALESCE(_friend_ids, ARRAY[]::uuid[])) x WHERE x IS NOT NULL AND x <> me;
  IF wanted IS NULL OR array_length(wanted, 1) IS NULL THEN
    RETURN QUERY SELECT 0, 0, NULL::integer; RETURN;
  END IF;
  IF array_length(wanted, 1) > 30 THEN RAISE EXCEPTION 'Per daug kvietimų vienu metu' USING ERRCODE = '22023'; END IF;

  IF r.task_id IS NOT NULL THEN
    SELECT t.spots_total INTO cap FROM public.tasks t WHERE t.id = r.task_id;
    SELECT
      (SELECT count(*) FROM public.reservations x WHERE x.task_id = r.task_id AND x.status::text IN ('pending','approved','completed','confirmed'))
      + (SELECT count(*) FROM public.reservation_participants p JOIN public.reservations x ON x.id = p.reservation_id
          WHERE x.task_id = r.task_id AND x.status::text IN ('pending','approved','completed','confirmed') AND p.status IN ('pending','accepted'))
      INTO taken;
  END IF;

  FOREACH fid IN ARRAY wanted LOOP
    IF NOT public.are_friends(me, fid) THEN n_skip := n_skip + 1; CONTINUE; END IF;
    IF r.task_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.reservations x WHERE x.task_id = r.task_id AND x.student_id = fid
        AND x.status::text IN ('pending','approved','completed','confirmed')
    ) THEN n_skip := n_skip + 1; CONTINUE; END IF;

    SELECT id, status INTO existing FROM public.reservation_participants
      WHERE reservation_id = _reservation_id AND student_id = fid;
    IF existing.id IS NOT NULL AND existing.status IN ('pending','accepted') THEN n_skip := n_skip + 1; CONTINUE; END IF;

    IF cap IS NOT NULL AND taken >= cap THEN
      RAISE EXCEPTION 'Laisvų vietų nebeužtenka visiems pakviestiems' USING ERRCODE = '23514';
    END IF;

    IF existing.id IS NOT NULL THEN
      UPDATE public.reservation_participants
        SET status = 'pending', invited_by = me, hours_awarded = 0, checked_in_at = NULL, checked_in_by = NULL, updated_at = now()
        WHERE id = existing.id;
    ELSE
      INSERT INTO public.reservation_participants (reservation_id, student_id, invited_by, status)
        VALUES (_reservation_id, fid, me, 'pending');
    END IF;
    n_inv := n_inv + 1;
    taken := taken + 1;
  END LOOP;

  RETURN QUERY SELECT n_inv, n_skip, CASE WHEN cap IS NULL THEN NULL ELSE GREATEST(0, cap - taken) END;
END $$;

REVOKE ALL ON FUNCTION public.invite_friends_to_reservation(uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.invite_friends_to_reservation(uuid, uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_dm_latest(_room_ids uuid[])
RETURNS TABLE(room_id uuid, sender_id uuid, content text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT ON (m.room_id) m.room_id, m.sender_id, m.content, m.created_at
  FROM public.dm_messages m
  WHERE m.room_id = ANY(COALESCE(_room_ids, ARRAY[]::uuid[]))
  ORDER BY m.room_id, m.created_at DESC
$$;

REVOKE ALL ON FUNCTION public.list_dm_latest(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_dm_latest(uuid[]) TO authenticated;