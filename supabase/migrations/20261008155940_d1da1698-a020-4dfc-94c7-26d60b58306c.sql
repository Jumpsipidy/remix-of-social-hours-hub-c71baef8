ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS hours_approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL, ADD COLUMN IF NOT EXISTS hours_approved_at timestamptz;
CREATE OR REPLACE FUNCTION public.tg_stamp_hours_approval() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF TG_OP = 'INSERT' THEN
  NEW.hours_approved_by := NULL; NEW.hours_approved_at := NULL;
 ELSIF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
  IF auth.uid() IS NOT NULL AND NOT (auth.uid() = NEW.organization_id OR public.has_role(auth.uid(), 'admin') OR (NEW.source = 'school' AND public.school_admin_can_manage(NEW.student_id))) THEN
   RAISE EXCEPTION 'Prieiga patvirtinti valandas uždrausta';
  END IF;
  NEW.hours_approved_by := auth.uid(); NEW.hours_approved_at := now();
 ELSE
  NEW.hours_approved_by := OLD.hours_approved_by; NEW.hours_approved_at := OLD.hours_approved_at;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.tg_stamp_hours_approval() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER stamp_hours_approval BEFORE INSERT OR UPDATE ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.tg_stamp_hours_approval();
REVOKE EXECUTE ON FUNCTION public.verify_certificate(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO service_role;
REVOKE INSERT, UPDATE, DELETE ON public.certificates FROM anon, authenticated;