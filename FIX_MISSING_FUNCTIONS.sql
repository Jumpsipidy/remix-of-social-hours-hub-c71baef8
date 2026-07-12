-- Run this in your Supabase SQL Editor if you get:
--   "Could not find the function public.verify_school_signup_code in the schema cache"
-- It re-creates the signup-code helpers, ensures grants, and reloads PostgREST.

-- 1) Column
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS signup_code TEXT;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- 2) Seed a code for Šeduvos gimnazija if present
UPDATE public.schools SET signup_code = 'SEDUVOS2026'
  WHERE signup_code IS NULL AND name ILIKE '%šeduv%';

-- 3) Function
CREATE OR REPLACE FUNCTION public.verify_school_signup_code(_school_id uuid, _code text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.schools
    WHERE id = _school_id
      AND upper(signup_code) = upper(_code)
      AND is_active = true
  );
$$;

-- 4) Grants
REVOKE ALL ON FUNCTION public.verify_school_signup_code(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_school_signup_code(uuid, text) TO anon, authenticated, service_role;

-- 5) Force PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
