-- lovable-cron-fallback-reviewed: Physical twelve-day deletion is time-based; consolidate existing fifteen-minute and hourly jobs into one fifteen-minute job, 96 runs/day with at most fifteen minutes delay, explained to user.
ALTER TABLE public.chat_rooms ADD COLUMN merged_into uuid REFERENCES public.chat_rooms(id);
WITH ranked AS (SELECT id,first_value(id) OVER (PARTITION BY student_id,organization_id,school_admin_id ORDER BY created_at,id) AS canonical FROM public.chat_rooms)
UPDATE public.chat_rooms r SET merged_into=x.canonical FROM ranked x WHERE r.id=x.id AND x.id<>x.canonical;
UPDATE public.messages m SET chat_room_id=r.merged_into FROM public.chat_rooms r WHERE m.chat_room_id=r.id AND r.merged_into IS NOT NULL;
INSERT INTO public.chat_reads(room_id,user_id,last_read_at)
SELECT r.merged_into,c.user_id,max(c.last_read_at) FROM public.chat_reads c JOIN public.chat_rooms r ON r.id=c.room_id WHERE r.merged_into IS NOT NULL GROUP BY 1,2
ON CONFLICT(room_id,user_id) DO UPDATE SET last_read_at=greatest(chat_reads.last_read_at,excluded.last_read_at);
CREATE UNIQUE INDEX chat_rooms_canonical_participants ON public.chat_rooms(student_id,organization_id,school_admin_id) NULLS NOT DISTINCT WHERE merged_into IS NULL;
CREATE OR REPLACE FUNCTION public.resolve_chat_room(_room uuid) RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.chat_rooms;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_chat_room_member(_room,auth.uid()) THEN RAISE EXCEPTION 'Pokalbis neprieinamas'; END IF;
 SELECT * INTO r FROM public.chat_rooms WHERE id=_room;
 RETURN coalesce(r.merged_into,r.id);
END $$;
REVOKE ALL ON FUNCTION public.resolve_chat_room(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.resolve_chat_room(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.ensure_chat_participants(_student uuid,_org uuid,_teacher uuid,_reservation uuid DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE rid uuid;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(coalesce(_student::text,'')||':'||coalesce(_org::text,'')||':'||coalesce(_teacher::text,''),0));
 SELECT id INTO rid FROM public.chat_rooms WHERE merged_into IS NULL AND student_id IS NOT DISTINCT FROM _student AND organization_id IS NOT DISTINCT FROM _org AND school_admin_id IS NOT DISTINCT FROM _teacher LIMIT 1;
 IF rid IS NULL THEN INSERT INTO public.chat_rooms(student_id,organization_id,school_admin_id,reservation_id) VALUES(_student,_org,_teacher,_reservation) RETURNING id INTO rid; END IF;
 RETURN rid;
END $$;
REVOKE ALL ON FUNCTION public.ensure_chat_participants(uuid,uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.open_org_chat(_org uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'student') OR NOT public.has_role(_org,'organization') THEN RAISE EXCEPTION 'Pokalbis neprieinamas'; END IF;
 RETURN public.ensure_chat_participants(auth.uid(),_org,NULL);
END $$;
CREATE OR REPLACE FUNCTION public.open_chat_with(_other uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
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
 ELSIF mr='school_admin' AND ot='student' THEN
  IF NOT public.school_admin_can_manage(_other) THEN RAISE EXCEPTION 'Mokinys nepriklauso jūsų klasei'; END IF;
  sid:=_other; teacher:=me;
 ELSIF mr='student' AND ot='school_admin' THEN
  IF NOT EXISTS(SELECT 1 FROM public.list_my_teachers() t WHERE t.id=_other) THEN RAISE EXCEPTION 'Auklėtojas nepriskirtas tavo klasei'; END IF;
  sid:=me; teacher:=_other;
 ELSE RAISE EXCEPTION 'Toks pokalbis negalimas'; END IF;
 RETURN public.ensure_chat_participants(sid,org,teacher);
END $$;
CREATE OR REPLACE FUNCTION public.open_school_student_chat(_student uuid,_org uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'school_admin') OR NOT public.school_admin_can_manage(_student) THEN RAISE EXCEPTION 'Mokinys nepriklauso jūsų klasei'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.reservations WHERE student_id=_student AND organization_id=_org) THEN RAISE EXCEPTION 'Rezervacija nerasta'; END IF;
 RETURN public.ensure_chat_participants(_student,_org,auth.uid());
END $$;
CREATE OR REPLACE FUNCTION public.open_reservation_chat(_reservation uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.reservations; teacher uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Neprisijungęs'; END IF;
 SELECT * INTO r FROM public.reservations WHERE id=_reservation;
 IF NOT FOUND THEN RAISE EXCEPTION 'Rezervacija nerasta'; END IF;
 IF auth.uid() NOT IN(r.student_id,r.organization_id) THEN
  IF public.has_role(auth.uid(),'school_admin') AND public.school_admin_can_manage(r.student_id) THEN teacher:=auth.uid();
  ELSIF NOT public.has_role(auth.uid(),'admin') AND NOT EXISTS(SELECT 1 FROM public.reservation_participants WHERE reservation_id=r.id AND student_id=auth.uid() AND status='accepted') THEN RAISE EXCEPTION 'Pokalbis neprieinamas'; END IF;
 END IF;
 RETURN public.ensure_chat_participants(r.student_id,r.organization_id,teacher,r.id);
END $$;
REVOKE ALL ON FUNCTION public.open_reservation_chat(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.open_reservation_chat(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.tg_route_chat_message() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 SELECT coalesce(merged_into,id) INTO NEW.chat_room_id FROM public.chat_rooms WHERE id=NEW.chat_room_id;
 RETURN NEW;
END $$;
CREATE TRIGGER route_chat_message BEFORE INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.tg_route_chat_message();
DO $$ DECLARE d text; BEGIN
 SELECT pg_get_functiondef(oid) INTO d FROM pg_proc WHERE proname='list_my_conversations' AND pronamespace='public'::regnamespace;
 d:=replace(d,'WHERE auth.uid() IS NOT NULL AND public.is_chat_room_member','WHERE r.merged_into IS NULL AND auth.uid() IS NOT NULL AND public.is_chat_room_member');
 EXECUTE d;
END $$;
CREATE OR REPLACE FUNCTION public.purge_dm_messages() RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$ DELETE FROM public.dm_messages WHERE created_at < now()-interval '12 days'; $$;
REVOKE ALL ON FUNCTION public.purge_dm_messages() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.purge_dm_messages() TO service_role;
SELECT cron.unschedule(jobid) FROM cron.job WHERE command ILIKE '%purge_old_messages%' OR command ILIKE '%purge_dm_messages%';
SELECT cron.schedule('chat-retention-12-days','*/15 * * * *','SELECT public.purge_old_messages(); SELECT public.purge_dm_messages();');
SELECT public.purge_old_messages(); SELECT public.purge_dm_messages();