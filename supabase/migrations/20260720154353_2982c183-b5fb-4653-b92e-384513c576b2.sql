-- 1) Drop duplicate trigger (both did same job)
DROP TRIGGER IF EXISTS activity_log_flag_admin ON public.activity_log;

-- 2) Allow anon + authenticated to log client/supabase errors (in addition to page.view)
DROP POLICY IF EXISTS "activity_log anon insert page views" ON public.activity_log;
CREATE POLICY "activity_log anon insert allowed"
  ON public.activity_log FOR INSERT
  TO anon
  WITH CHECK (
    user_id IS NULL
    AND action IN ('page.view','client.error','supabase.error')
  );

-- 3) Ensure get_lockdown_public is callable by anon and reload PostgREST schema cache
GRANT EXECUTE ON FUNCTION public.get_lockdown_public() TO anon, authenticated;
NOTIFY pgrst, 'reload schema';