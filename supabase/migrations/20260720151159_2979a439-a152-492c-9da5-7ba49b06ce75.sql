ALTER TABLE public.activity_log
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS entity_id uuid,
  ADD COLUMN IF NOT EXISTS is_admin_event boolean NOT NULL DEFAULT false;

ALTER TABLE public.activity_log
  ALTER COLUMN meta SET DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS activity_log_created_at_idx
  ON public.activity_log (created_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_action_created_idx
  ON public.activity_log (action, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_user_id_idx
  ON public.activity_log (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS activity_log_session_idx
  ON public.activity_log ((meta->>'session_id'));
CREATE INDEX IF NOT EXISTS activity_log_path_idx
  ON public.activity_log ((meta->>'path'));
CREATE INDEX IF NOT EXISTS activity_log_admin_event_idx
  ON public.activity_log (is_admin_event, created_at DESC);

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT INSERT ON public.activity_log TO anon;
GRANT SELECT, INSERT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_log anon insert page views" ON public.activity_log;
CREATE POLICY "activity_log anon insert page views"
  ON public.activity_log
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL AND action = 'page.view');

DROP POLICY IF EXISTS "activity_log authenticated insert own" ON public.activity_log;
CREATE POLICY "activity_log authenticated insert own"
  ON public.activity_log
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "activity_log select own or admin" ON public.activity_log;
CREATE POLICY "activity_log select own or admin"
  ON public.activity_log
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.tg_activity_log_flag_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_path text := coalesce(new.meta->>'path','');
  v_is_admin boolean := false;
BEGIN
  IF v_path LIKE '/admin%' THEN
    v_is_admin := true;
  ELSIF new.user_id IS NOT NULL AND public.has_role(new.user_id, 'admin') THEN
    v_is_admin := true;
  END IF;
  new.is_admin_event := v_is_admin;
  RETURN new;
END $$;

DROP TRIGGER IF EXISTS tg_activity_log_flag_admin ON public.activity_log;
CREATE TRIGGER tg_activity_log_flag_admin
  BEFORE INSERT ON public.activity_log
  FOR EACH ROW EXECUTE FUNCTION public.tg_activity_log_flag_admin();

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
SET search_path = public
AS $$
  SELECT s.lockdown_enabled, s.lockdown_message, s.lockdown_code, s.updated_at
  FROM public.site_settings s
  WHERE s.id = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_lockdown_public() TO anon, authenticated, service_role;
GRANT ALL ON public.site_settings TO service_role;

NOTIFY pgrst, 'reload schema';