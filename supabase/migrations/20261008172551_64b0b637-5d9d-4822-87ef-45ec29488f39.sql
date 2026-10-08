CREATE OR REPLACE FUNCTION public.complete_student_setup(
  _school_id uuid, _code text, _full_name text, _class_year text, _class_letter text, _hours_needed integer
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _p public.profiles%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Reikia prisijungti'; END IF;
  SELECT * INTO _p FROM public.profiles WHERE id = _uid;
  IF NOT FOUND OR _p.role <> 'student' THEN RAISE EXCEPTION 'Tik mokiniai gali užbaigti registraciją'; END IF;
  IF COALESCE(_p.associated_school_id, _p.school_id) IS NOT NULL
     AND COALESCE(_p.associated_school_id, _p.school_id) <> _school_id THEN
    RAISE EXCEPTION 'Mokykla jau priskirta. Kreipkis į administratorių.';
  END IF;
  IF NOT public.verify_school_signup_code(_school_id, upper(trim(_code))) THEN
    RAISE EXCEPTION 'Neteisingas mokyklos kodas.';
  END IF;
  IF _class_year NOT IN ('5','6','7','8','9 / I gimn.','10 / II gimn.','11 / III gimn.','12 / IV gimn.') THEN
    RAISE EXCEPTION 'Neteisinga klasė';
  END IF;
  IF _class_letter NOT IN ('A','B') THEN RAISE EXCEPTION 'Neteisinga klasės raidė'; END IF;
  UPDATE public.profiles SET
    full_name = left(trim(_full_name), 120),
    school_id = _school_id,
    associated_school_id = _school_id,
    class_year = _class_year,
    class_letter = _class_letter,
    hours_needed = CASE WHEN _class_year IN ('5','6','7') THEN 20 ELSE LEAST(GREATEST(COALESCE(_hours_needed, 8), 8), 500) END,
    updated_at = now()
  WHERE id = _uid;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.complete_student_setup(uuid, text, text, text, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_student_setup(uuid, text, text, text, text, integer) TO authenticated, service_role;