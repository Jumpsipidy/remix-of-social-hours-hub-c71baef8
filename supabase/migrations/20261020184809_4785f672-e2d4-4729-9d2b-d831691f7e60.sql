ALTER TABLE public.chat_rooms ALTER COLUMN organization_id DROP NOT NULL;

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
  ELSIF my_role = 'school_admin' AND other_role = 'student' THEN
    IF NOT public.school_admin_can_manage(_other) THEN RAISE EXCEPTION 'Rašyti galima tik savo priskirtų klasių mokiniams'; END IF;
    SELECT id INTO rid FROM public.chat_rooms WHERE student_id = _other AND school_admin_id = me AND organization_id IS NULL AND reservation_id IS NULL LIMIT 1;
    IF rid IS NULL THEN INSERT INTO public.chat_rooms (student_id, school_admin_id) VALUES (_other, me) RETURNING id INTO rid; END IF;
  ELSIF my_role = 'student' AND other_role = 'school_admin' THEN
    IF NOT public.school_admin_can_manage(me) THEN RAISE EXCEPTION 'Šis auklėtojas nėra priskirtas tavo klasei'; END IF;
    SELECT id INTO rid FROM public.chat_rooms WHERE student_id = me AND school_admin_id = _other AND organization_id IS NULL AND reservation_id IS NULL LIMIT 1;
    IF rid IS NULL THEN INSERT INTO public.chat_rooms (student_id, school_admin_id) VALUES (me, _other) RETURNING id INTO rid; END IF;
  ELSE
    RAISE EXCEPTION 'Toks pokalbis negalimas';
  END IF;
  RETURN rid;
END $$;
REVOKE EXECUTE ON FUNCTION public.open_chat_with(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.open_chat_with(uuid) TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.school_class_codes
    WHERE is_active
    GROUP BY school_id, class_year, class_letter
    HAVING count(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS school_class_codes_one_active_per_class
      ON public.school_class_codes (school_id, class_year, class_letter) WHERE is_active;
  ELSE
    RAISE NOTICE 'Yra pasikartojančių aktyvių kodų — unikalus indeksas nesukurtas';
  END IF;
END $$;