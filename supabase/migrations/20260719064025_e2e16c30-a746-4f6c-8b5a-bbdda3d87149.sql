
-- Grant table privileges to authenticated + service_role on every public table
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT c.relname FROM pg_class c
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE c.relkind='r' AND n.nspname='public'
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', r.relname);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', r.relname);
  END LOOP;
END $$;

-- Public-readable tables also need anon SELECT
GRANT SELECT ON public.schools TO anon;
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT ON public.tasks TO anon;
GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT ON public.certificates TO anon;

-- Sequences (for any serial columns)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- RPC/function execute privileges
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_school_signup_code(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO anon;

-- Default privileges for anything created later
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO authenticated, service_role;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
