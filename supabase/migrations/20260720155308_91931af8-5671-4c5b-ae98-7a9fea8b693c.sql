CREATE OR REPLACE FUNCTION public.get_lockdown_public()
RETURNS TABLE(
  lockdown_enabled boolean,
  lockdown_message text,
  lockdown_code text,
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    COALESCE(s.lockdown_enabled, false) AS lockdown_enabled,
    s.lockdown_message,
    s.lockdown_code,
    s.updated_at
  FROM public.site_settings s
  WHERE s.id = true
  LIMIT 1;
$$;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_lockdown_public() TO anon, authenticated, service_role;

GRANT INSERT ON public.activity_log TO anon;
GRANT SELECT, INSERT ON public.activity_log TO authenticated;
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