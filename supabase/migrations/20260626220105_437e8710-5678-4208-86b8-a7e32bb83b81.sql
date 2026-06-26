
-- Drop FK constraints that block mock orgs / system messages
ALTER TABLE public.chat_rooms DROP CONSTRAINT IF EXISTS chat_rooms_organization_id_fkey;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE public.messages ALTER COLUMN sender_id DROP NOT NULL;

-- Allow system messages (sender_id IS NULL) and keep member auth
DROP POLICY IF EXISTS "Room members can send messages" ON public.messages;
CREATE POLICY "Room members can send messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_chat_room_member(chat_room_id, auth.uid())
    AND (sender_id IS NULL OR sender_id = auth.uid())
  );

-- School admin can join existing chat rooms (set themselves as school_admin_id)
DROP POLICY IF EXISTS "School admin can join chat rooms" ON public.chat_rooms;
CREATE POLICY "School admin can join chat rooms" ON public.chat_rooms
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'school_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'school_admin') AND school_admin_id = auth.uid());

-- School admin can view all student reservations (audit)
DROP POLICY IF EXISTS "School admin can view reservations" ON public.reservations;
CREATE POLICY "School admin can view reservations" ON public.reservations
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'school_admin'));

-- Auto-purge messages older than 12 days
CREATE OR REPLACE FUNCTION public.purge_old_messages()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.messages WHERE created_at < now() - interval '12 days';
$$;

-- Enable realtime for messages
ALTER TABLE public.messages REPLICA IDENTITY FULL;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.messages';
  END IF;
END $$;
