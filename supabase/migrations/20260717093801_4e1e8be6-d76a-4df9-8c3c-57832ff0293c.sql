DROP POLICY IF EXISTS "Participants can create chat rooms" ON public.chat_rooms;
CREATE POLICY "Participants can create chat rooms" ON public.chat_rooms
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = student_id
    OR auth.uid() = organization_id
    OR (public.has_role(auth.uid(), 'school_admin') AND auth.uid() = school_admin_id)
    OR public.has_role(auth.uid(), 'admin')
  );