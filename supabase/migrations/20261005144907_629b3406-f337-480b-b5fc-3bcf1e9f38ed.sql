CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  meta JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
BEGIN
  -- Only students can self-register. Privileged roles are assigned by the
  -- Super Admin server function after creation.
  INSERT INTO public.profiles (id, email, full_name, role, organization_name, hours_needed)
  VALUES (NEW.id, NEW.email, meta->>'full_name', 'student', NULL,
          LEAST(GREATEST(COALESCE((meta->>'hours_needed')::int, 0), 0), 200))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.tg_profiles_guard_privileged()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.role := 'student';
    NEW.associated_school_id := NULL;
    NEW.hours_earned := 0;
    RETURN NEW;
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.associated_school_id IS DISTINCT FROM OLD.associated_school_id
     OR NEW.hours_earned IS DISTINCT FROM OLD.hours_earned THEN
    RAISE EXCEPTION 'Šių laukų keisti negalima';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_privileged ON public.profiles;
CREATE TRIGGER profiles_guard_privileged BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.tg_profiles_guard_privileged();

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auto_year_renewal boolean NOT NULL DEFAULT true;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS city text;

CREATE OR REPLACE FUNCTION public.tg_validate_city()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.city IS NOT NULL AND NEW.city NOT IN ('Šeduva','Radviliškis','Šiauliai') THEN
    RAISE EXCEPTION 'Netinkamas miestas: %', NEW.city;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS tasks_validate_city ON public.tasks;
CREATE TRIGGER tasks_validate_city BEFORE INSERT OR UPDATE OF city ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.tg_validate_city();
DROP TRIGGER IF EXISTS reservations_validate_city ON public.reservations;
CREATE TRIGGER reservations_validate_city BEFORE INSERT OR UPDATE OF city ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.tg_validate_city();
CREATE INDEX IF NOT EXISTS tasks_city_idx ON public.tasks(city);