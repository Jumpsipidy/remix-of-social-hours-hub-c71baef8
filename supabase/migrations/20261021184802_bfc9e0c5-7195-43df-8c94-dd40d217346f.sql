ALTER FUNCTION public.resolve_chat_room(uuid) SECURITY INVOKER;
CREATE OR REPLACE FUNCTION public.open_reservation_chat(_reservation uuid) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE r public.reservations; me uuid:=auth.uid(); mr public.app_role;
BEGIN
 IF me IS NULL THEN RAISE EXCEPTION 'Neprisijungęs'; END IF;
 SELECT * INTO r FROM public.reservations WHERE id=_reservation;
 IF NOT FOUND THEN RAISE EXCEPTION 'Rezervacija nerasta'; END IF;
 IF me=r.organization_id THEN RETURN public.open_chat_with(r.student_id); END IF;
 IF me=r.student_id THEN RETURN public.open_chat_with(r.organization_id); END IF;
 IF public.has_role(me,'school_admin') AND public.school_admin_can_manage(r.student_id) THEN RETURN public.open_school_student_chat(r.student_id,r.organization_id); END IF;
 IF EXISTS(SELECT 1 FROM public.reservation_participants WHERE reservation_id=r.id AND student_id=me AND status='accepted') THEN RETURN public.open_org_chat(r.organization_id); END IF;
 RAISE EXCEPTION 'Pokalbis neprieinamas';
END $$;