REVOKE ALL ON FUNCTION public.verify_school_signup_code(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_school_signup_code(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.verify_school_signup_code(uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.verify_school_signup_code(uuid, text) TO service_role;

-- Ensure the checker has the intended argument names and simple, case-insensitive behavior.
CREATE OR REPLACE FUNCTION public.verify_school_signup_code(_school_id uuid, _code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.schools
    WHERE id = _school_id
      AND is_active = true
      AND upper(trim(signup_code)) = upper(trim(_code))
  );
$$;

REVOKE ALL ON FUNCTION public.verify_school_signup_code(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_school_signup_code(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.verify_school_signup_code(uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.verify_school_signup_code(uuid, text) TO service_role;