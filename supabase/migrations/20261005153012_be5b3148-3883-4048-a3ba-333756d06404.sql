DROP FUNCTION IF EXISTS public.list_chat_contacts();
CREATE FUNCTION public.list_chat_contacts()
RETURNS TABLE(id uuid, name text, role app_role, class_year text, org_id uuid, org_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH me AS (SELECT id, role, COALESCE(associated_school_id, school_id) AS sch FROM public.profiles WHERE id = auth.uid())
  SELECT p.id, COALESCE(p.organization_name, p.full_name, p.email), p.role, NULL::text, NULL::uuid, NULL::text
    FROM public.profiles p, me
   WHERE (me.role IN ('student','school_admin') AND p.role = 'organization')
      OR (me.role = 'organization' AND p.role = 'school_admin')
  UNION ALL
  SELECT DISTINCT p.id, COALESCE(p.full_name, p.email), p.role, p.class_year, NULL::uuid, NULL::text
    FROM public.profiles p, me, public.reservations r
   WHERE me.role = 'organization' AND p.role = 'student' AND r.organization_id = me.id
     AND (r.student_id = p.id OR EXISTS (SELECT 1 FROM public.reservation_participants rp WHERE rp.reservation_id = r.id AND rp.student_id = p.id))
  UNION ALL
  SELECT DISTINCT p.id, COALESCE(p.full_name, p.email), p.role, p.class_year, o.id, COALESCE(o.organization_name, o.full_name)
    FROM me, public.reservations r
    JOIN public.profiles p ON p.id = r.student_id
    JOIN public.profiles o ON o.id = r.organization_id
   WHERE me.role = 'school_admin' AND me.sch IS NOT NULL AND p.school_id = me.sch AND p.role = 'student'
  LIMIT 500
$$;
REVOKE EXECUTE ON FUNCTION public.list_chat_contacts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_chat_contacts() TO authenticated;

CREATE OR REPLACE FUNCTION public.open_school_student_chat(_student uuid, _org uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid(); sch uuid; rid uuid;
BEGIN
  SELECT COALESCE(associated_school_id, school_id) INTO sch FROM public.profiles WHERE id = me AND role = 'school_admin';
  IF sch IS NULL THEN RAISE EXCEPTION 'Tik mokyklos administratoriams'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _student AND role = 'student' AND school_id = sch) THEN
    RAISE EXCEPTION 'Mokinys ne iš jūsų mokyklos'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.reservations WHERE student_id = _student AND organization_id = _org) THEN
    RAISE EXCEPTION 'Mokinys neturi rezervacijos su šia organizacija'; END IF;
  SELECT id INTO rid FROM public.chat_rooms WHERE student_id = _student AND organization_id = _org AND school_admin_id = me AND reservation_id IS NULL LIMIT 1;
  IF rid IS NULL THEN INSERT INTO public.chat_rooms (student_id, organization_id, school_admin_id) VALUES (_student, _org, me) RETURNING id INTO rid; END IF;
  RETURN rid;
END $$;
REVOKE EXECUTE ON FUNCTION public.open_school_student_chat(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.open_school_student_chat(uuid, uuid) TO authenticated;