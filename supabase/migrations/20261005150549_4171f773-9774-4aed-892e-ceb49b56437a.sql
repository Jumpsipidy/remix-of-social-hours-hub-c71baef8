CREATE TABLE IF NOT EXISTS public.chat_reads (
  room_id uuid NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_reads TO authenticated;
GRANT ALL ON public.chat_reads TO service_role;
ALTER TABLE public.chat_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own read markers" ON public.chat_reads FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- School admins are members of rooms whose student belongs to their school.
CREATE OR REPLACE FUNCTION public.is_chat_room_member(_room_id uuid, _user_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_rooms r
    WHERE r.id = _room_id
      AND (_user_id IN (r.student_id, r.organization_id) OR _user_id = r.school_admin_id
        OR EXISTS (SELECT 1 FROM public.profiles a JOIN public.profiles s ON s.id = r.student_id
                   WHERE a.id = _user_id AND a.role = 'school_admin'
                     AND s.role = 'student'
                     AND COALESCE(a.associated_school_id, a.school_id) IS NOT NULL
                     AND s.school_id = COALESCE(a.associated_school_id, a.school_id)))
  )
$$;

DROP POLICY IF EXISTS "Participants can view chat rooms" ON public.chat_rooms;
CREATE POLICY "Participants can view chat rooms" ON public.chat_rooms FOR SELECT TO authenticated
  USING (public.is_chat_room_member(id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "School admin can join chat rooms" ON public.chat_rooms;
CREATE POLICY "School admin can join chat rooms" ON public.chat_rooms FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'school_admin') AND public.is_chat_room_member(id, auth.uid()))
  WITH CHECK (school_admin_id = auth.uid());

-- Student opens (or reuses) a direct conversation with an organization.
CREATE OR REPLACE FUNCTION public.open_org_chat(_org uuid)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE me uuid := auth.uid(); rid uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Neprisijungęs'; END IF;
  IF NOT public.has_role(me, 'student') THEN RAISE EXCEPTION 'Tik mokiniams'; END IF;
  IF NOT public.has_role(_org, 'organization') THEN RAISE EXCEPTION 'Organizacija nerasta'; END IF;
  SELECT id INTO rid FROM public.chat_rooms
   WHERE student_id = me AND organization_id = _org AND reservation_id IS NULL AND school_admin_id IS NULL
   LIMIT 1;
  IF rid IS NULL THEN
    INSERT INTO public.chat_rooms (student_id, organization_id) VALUES (me, _org) RETURNING id INTO rid;
  END IF;
  RETURN rid;
END $$;
REVOKE EXECUTE ON FUNCTION public.open_org_chat(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.open_org_chat(uuid) TO authenticated;

-- Conversation list for the current user.
CREATE OR REPLACE FUNCTION public.list_my_conversations()
 RETURNS TABLE(room_id uuid, reservation_id uuid, student_id uuid, organization_id uuid, school_admin_id uuid,
   student_name text, organization_name text, school_admin_name text,
   reservation_date date, last_message text, last_at timestamptz, unread integer)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
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
  WHERE auth.uid() IS NOT NULL AND public.is_chat_room_member(r.id, auth.uid())
  ORDER BY COALESCE(lm.created_at, r.created_at) DESC
  LIMIT 200
$$;
REVOKE EXECUTE ON FUNCTION public.list_my_conversations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_my_conversations() TO authenticated;