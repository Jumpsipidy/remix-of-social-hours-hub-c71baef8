
REVOKE SELECT ON public.schools FROM anon, authenticated;
GRANT SELECT (id, name, city, is_active, created_at) ON public.schools TO anon, authenticated;
GRANT ALL ON public.schools TO service_role;
