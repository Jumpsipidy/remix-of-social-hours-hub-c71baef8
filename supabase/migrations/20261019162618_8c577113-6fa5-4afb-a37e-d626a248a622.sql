CREATE TABLE public.school_class_codes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
 class_year text NOT NULL,
 class_letter text NOT NULL,
 signup_code text NOT NULL UNIQUE,
 is_active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_class_codes TO authenticated;
GRANT ALL ON public.school_class_codes TO service_role;
ALTER TABLE public.school_class_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY class_codes_admin ON public.school_class_codes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE OR REPLACE FUNCTION public.tg_validate_class_signup_code() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.class_year NOT IN ('5','6','7','8','9 / I gimn.','10 / II gimn.','11 / III gimn.','12 / IV gimn.') OR NEW.class_letter NOT IN ('A','B') THEN RAISE EXCEPTION 'Neteisinga klasė'; END IF;
 NEW.signup_code := upper(btrim(NEW.signup_code));
 IF length(NEW.signup_code)<8 OR length(NEW.signup_code)>64 THEN RAISE EXCEPTION 'Kodas turi būti 8–64 simbolių'; END IF;
 NEW.updated_at := now(); RETURN NEW;
END; $$;
CREATE TRIGGER validate_class_signup_code BEFORE INSERT OR UPDATE ON public.school_class_codes FOR EACH ROW EXECUTE FUNCTION public.tg_validate_class_signup_code();
CREATE OR REPLACE FUNCTION public.complete_student_setup(_school_id uuid, _code text, _full_name text, _class_year text, _class_letter text, _hours_needed integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _uid uuid := auth.uid(); _p public.profiles%ROWTYPE; _c public.school_class_codes%ROWTYPE;
BEGIN
 IF _uid IS NULL THEN RAISE EXCEPTION 'Reikia prisijungti'; END IF;
 SELECT * INTO _p FROM public.profiles WHERE id=_uid FOR UPDATE;
 IF NOT FOUND OR _p.role <> 'student' THEN RAISE EXCEPTION 'Tik mokiniai gali užbaigti registraciją'; END IF;
 IF COALESCE(_p.associated_school_id,_p.school_id) IS NOT NULL AND COALESCE(_p.associated_school_id,_p.school_id)<>_school_id THEN RAISE EXCEPTION 'Mokykla jau priskirta. Kreipkis į administratorių.'; END IF;
 SELECT c.* INTO _c FROM public.school_class_codes c JOIN public.schools s ON s.id=c.school_id WHERE c.signup_code=upper(btrim(_code)) AND c.school_id=_school_id AND c.is_active AND s.is_active;
 IF NOT FOUND THEN RAISE EXCEPTION 'Neteisingas arba nebegaliojantis klasės kodas'; END IF;
 IF _p.class_year IS NOT NULL AND _p.class_letter IS NOT NULL AND (_p.class_year<>_c.class_year OR _p.class_letter<>_c.class_letter) THEN RAISE EXCEPTION 'Klasė jau priskirta. Kreipkis į administratorių.'; END IF;
 UPDATE public.profiles SET full_name=left(btrim(_full_name),120), school_id=_c.school_id, associated_school_id=_c.school_id, class_year=_c.class_year, class_letter=_c.class_letter,
 hours_needed=CASE WHEN _c.class_year IN ('5','6','7') THEN 20 ELSE LEAST(GREATEST(COALESCE(_hours_needed,8),8),500) END, updated_at=now() WHERE id=_uid;
 RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.complete_student_setup(uuid,text,text,text,text,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_student_setup(uuid,text,text,text,text,integer) TO authenticated, service_role;
NOTIFY pgrst, 'reload schema';