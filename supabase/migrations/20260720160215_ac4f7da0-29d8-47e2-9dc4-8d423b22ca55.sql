GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_log TO authenticated;
GRANT INSERT ON public.activity_log TO anon;
GRANT ALL ON public.activity_log TO service_role;

DROP POLICY IF EXISTS "activity_log anon insert allowed" ON public.activity_log;
CREATE POLICY "activity_log anon insert allowed"
ON public.activity_log
FOR INSERT
TO anon
WITH CHECK (
  user_id IS NULL
  AND action IN ('page.view', 'client.error', 'supabase.error')
);

DROP POLICY IF EXISTS "activity_log authenticated insert own" ON public.activity_log;
CREATE POLICY "activity_log authenticated insert own"
ON public.activity_log
FOR INSERT
TO authenticated
WITH CHECK (
  user_id IS NULL OR user_id = auth.uid()
);

DROP POLICY IF EXISTS "activity_log select own or admin" ON public.activity_log;
CREATE POLICY "activity_log select own or admin"
ON public.activity_log
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

NOTIFY pgrst, 'reload schema';