
-- 1) schools: hide signup_code from client roles via column grants
REVOKE SELECT ON public.schools FROM anon, authenticated;
GRANT SELECT (id, name, city, is_active, created_at) ON public.schools TO anon, authenticated;

-- 2) site_settings: hide lockdown_code column from client roles; expose via SECURITY DEFINER RPC
REVOKE SELECT ON public.site_settings FROM anon, authenticated;
GRANT SELECT (id, lockdown_enabled, lockdown_message, updated_at) ON public.site_settings TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_lockdown_public()
RETURNS TABLE (
  lockdown_enabled boolean,
  lockdown_message text,
  lockdown_code text,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lockdown_enabled, lockdown_message, lockdown_code, updated_at
  FROM public.site_settings
  WHERE id = true
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_lockdown_public() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_lockdown_public() TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
