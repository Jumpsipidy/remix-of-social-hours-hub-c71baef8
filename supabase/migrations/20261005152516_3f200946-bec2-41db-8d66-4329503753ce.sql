ALTER TABLE public.chat_rooms ALTER COLUMN student_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.open_chat_with(_other uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid(); my_role app_role; other_role app_role; rid uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Neprisijungęs'; END IF;
  SELECT role INTO my_role FROM public.profiles WHERE id = me;
  SELECT role INTO other_role FROM public.profiles WHERE id = _other;
  IF other_role IS NULL THEN RAISE EXCEPTION 'Vartotojas nerastas'; END IF;

  IF my_role = 'student' AND other_role = 'organization' THEN
    RETURN public.open_org_chat(_other);
  ELSIF my_role = 'organization' AND other_role = 'student' THEN
    IF NOT EXISTS (SELECT 1 FROM public.reservations r WHERE r.organization_id = me AND r.student_id = _other)
       AND NOT EXISTS (SELECT 1 FROM public.reservation_participants rp JOIN public.reservations r ON r.id = rp.reservation_id
                       WHERE r.organization_id = me AND rp.student_id = _other) THEN
      RAISE EXCEPTION 'Rašyti galima tik mokiniams, turėjusiems rezervaciją su jūsų organizacija';
    END IF;
    SELECT id INTO rid FROM public.chat_rooms WHERE student_id = _other AND organization_id = me AND reservation_id IS NULL AND school_admin_id IS NULL LIMIT 1;
    IF rid IS NULL THEN INSERT INTO public.chat_rooms (student_id, organization_id) VALUES (_other, me) RETURNING id INTO rid; END IF;
  ELSIF my_role = 'organization' AND other_role = 'school_admin' THEN
    SELECT id INTO rid FROM public.chat_rooms WHERE student_id IS NULL AND organization_id = me AND school_admin_id = _other LIMIT 1;
    IF rid IS NULL THEN INSERT INTO public.chat_rooms (organization_id, school_admin_id) VALUES (me, _other) RETURNING id INTO rid; END IF;
  ELSIF my_role = 'school_admin' AND other_role = 'organization' THEN
    SELECT id INTO rid FROM public.chat_rooms WHERE student_id IS NULL AND organization_id = _other AND school_admin_id = me LIMIT 1;
    IF rid IS NULL THEN INSERT INTO public.chat_rooms (organization_id, school_admin_id) VALUES (_other, me) RETURNING id INTO rid; END IF;
  ELSE
    RAISE EXCEPTION 'Toks pokalbis negalimas';
  END IF;
  RETURN rid;
END $$;
REVOKE EXECUTE ON FUNCTION public.open_chat_with(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.open_chat_with(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_chat_contacts()
RETURNS TABLE(id uuid, name text, role app_role)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH me AS (SELECT id, role FROM public.profiles WHERE id = auth.uid())
  SELECT p.id, COALESCE(p.organization_name, p.full_name, p.email), p.role FROM public.profiles p, me
  WHERE (me.role IN ('student','school_admin') AND p.role = 'organization')
     OR (me.role = 'organization' AND p.role = 'school_admin')
     OR (me.role = 'organization' AND p.role = 'student' AND (
          EXISTS (SELECT 1 FROM public.reservations r WHERE r.organization_id = me.id AND r.student_id = p.id)
          OR EXISTS (SELECT 1 FROM public.reservation_participants rp JOIN public.reservations r ON r.id = rp.reservation_id WHERE r.organization_id = me.id AND rp.student_id = p.id)))
  ORDER BY 2 LIMIT 300
$$;
REVOKE EXECUTE ON FUNCTION public.list_chat_contacts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_chat_contacts() TO authenticated;