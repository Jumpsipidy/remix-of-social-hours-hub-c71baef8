ALTER TABLE public.school_class_codes ADD COLUMN IF NOT EXISTS hours_needed integer;
ALTER TABLE public.school_class_codes DROP CONSTRAINT IF EXISTS school_class_codes_hours_range;
ALTER TABLE public.school_class_codes ADD CONSTRAINT school_class_codes_hours_range CHECK (hours_needed IS NULL OR hours_needed BETWEEN 8 AND 500);

CREATE OR REPLACE FUNCTION public.complete_student_setup(
  _school_id uuid, _code text, _full_name text, _class_year text, _class_letter text, _hours_needed integer
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _p public.profiles%ROWTYPE;
  _c public.school_class_codes%ROWTYPE;
  _year text;
  _letter text;
  _hours integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Reikia prisijungti'; END IF;
  SELECT * INTO _p FROM public.profiles WHERE id = _uid;
  IF NOT FOUND OR _p.role <> 'student' THEN RAISE EXCEPTION 'Tik mokiniai gali užbaigti registraciją'; END IF;
  IF COALESCE(_p.associated_school_id, _p.school_id) IS NOT NULL
     AND COALESCE(_p.associated_school_id, _p.school_id) <> _school_id THEN
    RAISE EXCEPTION 'Mokykla jau priskirta. Kreipkis į administratorių.';
  END IF;
  SELECT * INTO _c FROM public.school_class_codes
   WHERE school_id = _school_id AND signup_code = upper(trim(_code)) AND is_active LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Neteisingas klasės kodas.'; END IF;
  _year := _c.class_year;
  _letter := _c.class_letter;
  _hours := CASE WHEN _year IN ('5','6','7') THEN 20 ELSE COALESCE(_c.hours_needed, 20) END;
  UPDATE public.profiles SET
    full_name = left(trim(_full_name), 120),
    school_id = _school_id,
    associated_school_id = _school_id,
    class_year = _year,
    class_letter = _letter,
    hours_needed = _hours,
    updated_at = now()
  WHERE id = _uid;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.complete_student_setup(uuid, text, text, text, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_student_setup(uuid, text, text, text, text, integer) TO authenticated, service_role;