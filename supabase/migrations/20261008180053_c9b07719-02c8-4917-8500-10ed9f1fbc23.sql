CREATE POLICY "Members see own chat rooms directly" ON public.chat_rooms FOR SELECT TO authenticated
USING (auth.uid() = student_id OR auth.uid() = organization_id OR auth.uid() = school_admin_id);