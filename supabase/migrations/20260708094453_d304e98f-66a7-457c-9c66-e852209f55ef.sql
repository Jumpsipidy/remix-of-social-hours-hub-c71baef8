
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

REVOKE ALL ON FUNCTION public.verify_school_signup_code(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_school_signup_code(uuid, text) TO authenticated;
