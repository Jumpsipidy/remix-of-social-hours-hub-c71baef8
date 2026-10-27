CREATE OR REPLACE FUNCTION public.open_chat_with(_other uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE me uuid:=auth.uid(); mr public.app_role; ot public.app_role; sid uuid; org uuid; teacher uuid;
BEGIN
 IF me IS NULL THEN RAISE EXCEPTION 'Neprisijungęs'; END IF;
 SELECT role INTO mr FROM public.profiles WHERE id=me; SELECT role INTO ot FROM public.profiles WHERE id=_other;
 IF mr='student' AND ot='organization' THEN RETURN public.open_org_chat(_other);
 ELSIF mr='organization' AND ot='student' THEN
  IF NOT EXISTS(SELECT 1 FROM public.reservations r WHERE r.organization_id=me AND (r.student_id=_other OR EXISTS(SELECT 1 FROM public.reservation_participants p WHERE p.reservation_id=r.id AND p.student_id=_other))) THEN RAISE EXCEPTION 'Mokinys neturi rezervacijos su jūsų organizacija'; END IF;
  sid:=_other; org:=me;
 ELSIF mr='organization' AND ot='school_admin' THEN org:=me; teacher:=_other;
 ELSIF mr='school_admin' AND ot='organization' THEN org:=_other; teacher:=me;
 ELSE RAISE EXCEPTION 'Toks pokalbis negalimas'; END IF;
 RETURN public.ensure_chat_participants(sid,org,teacher);
END $function$;

CREATE OR REPLACE FUNCTION public.list_chat_contacts()
 RETURNS TABLE(id uuid, name text, role app_role, class_year text, org_id uuid, org_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  LIMIT 500
$function$;

CREATE OR REPLACE FUNCTION public.list_my_teachers()
 RETURNS TABLE(id uuid, full_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT t.id, t.full_name FROM public.profiles t WHERE false
$function$;

CREATE OR REPLACE FUNCTION public.list_my_conversations()
 RETURNS TABLE(room_id uuid, reservation_id uuid, student_id uuid, organization_id uuid, school_admin_id uuid, student_name text, organization_name text, school_admin_name text, reservation_date date, last_message text, last_at timestamp with time zone, unread integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT r.id, r.reservation_id, r.student_id, r.organization_id, r.school_admin_id,
    s.full_name, COALESCE(o.organization_name, o.full_name), sa.full_name,
    res.reservation_date,
    lm.content, COALESCE(lm.created_at, r.created_at),
    (SELECT count(*)::int FROM public.messages m
      WHERE m.chat_room_id = r.id AND m.sender_id IS DISTINCT FROM auth.uid()
        AND m.created_at > COALESCE((SELECT cr.last_read_at FROM public.chat_reads cr WHERE cr.room_id = r.id AND cr.user_id = auth.uid()), 'epoch'))
  FROM public.chat_rooms r
  LEFT JOIN public.profiles s ON s.id = r.student_id
  LEFT JOIN public.profiles o ON o.id = r.organization_id
  LEFT JOIN public.profiles sa ON sa.id = r.school_admin_id
  LEFT JOIN public.reservations res ON res.id = r.reservation_id
  LEFT JOIN LATERAL (SELECT m.content, m.created_at FROM public.messages m WHERE m.chat_room_id = r.id ORDER BY m.created_at DESC LIMIT 1) lm ON true
  WHERE r.merged_into IS NULL AND auth.uid() IS NOT NULL AND public.is_chat_room_member(r.id, auth.uid())
    AND NOT (r.organization_id IS NULL AND r.student_id IS NOT NULL AND r.school_admin_id IS NOT NULL)
  ORDER BY COALESCE(lm.created_at, r.created_at) DESC
  LIMIT 200
$function$;