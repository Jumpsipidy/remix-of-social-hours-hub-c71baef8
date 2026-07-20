GRANT INSERT ON public.activity_log TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon can log public analytics events" ON public.activity_log;
DROP POLICY IF EXISTS "Authenticated users can log their own activity" ON public.activity_log;
DROP POLICY IF EXISTS "Users can view their own activity" ON public.activity_log;
DROP POLICY IF EXISTS "Admins can view all activity" ON public.activity_log;
DROP POLICY IF EXISTS "Admins can manage activity log" ON public.activity_log;
DROP POLICY IF EXISTS "Anyone can insert safe activity events" ON public.activity_log;
DROP POLICY IF EXISTS "Admins can read activity log" ON public.activity_log;

CREATE POLICY "Anon can log public analytics events"
ON public.activity_log
FOR INSERT
TO anon
WITH CHECK (
  user_id IS NULL
  AND action IN ('page.view', 'client.error', 'supabase.error')
);

CREATE POLICY "Authenticated users can log their own activity"
ON public.activity_log
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND action IN (
    'reservation.created', 'reservation.proposed', 'reservation.approved',
    'reservation.declined', 'reservation.completed', 'reservation.confirmed',
    'task.created', 'task.deleted',
    'friend.request_sent', 'friend.request_accepted', 'friend.request_declined', 'friend.unfriended',
    'group.invited', 'group.invite_accepted', 'group.invite_declined',
    'profile.updated', 'certificate.generated',
    'auth.signed_in', 'auth.signed_out', 'page.view', 'client.error', 'supabase.error'
  )
);

CREATE POLICY "Users can view their own activity"
ON public.activity_log
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all activity"
ON public.activity_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage activity log"
ON public.activity_log
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

NOTIFY pgrst, 'reload schema';