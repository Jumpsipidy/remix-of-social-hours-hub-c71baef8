
-- Lock down signup_code so it's no longer publicly readable.
-- Public/anon/authenticated can still SELECT school id/name/city/is_active
-- (needed for registration dropdowns), but signup_code is only reachable
-- via the SECURITY DEFINER RPC verify_school_signup_code or via
-- service_role (admin dashboard).
REVOKE SELECT ON public.schools FROM anon, authenticated, PUBLIC;
GRANT SELECT (id, name, city, is_active, created_at) ON public.schools TO anon, authenticated;
GRANT ALL ON public.schools TO service_role;
