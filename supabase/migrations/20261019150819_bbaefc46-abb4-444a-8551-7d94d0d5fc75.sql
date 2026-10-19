CREATE OR REPLACE FUNCTION public.tg_profiles_guard_privileged()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  IF current_user NOT IN ('anon','authenticated') OR auth.uid() IS NULL
     OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.role := 'student'; NEW.associated_school_id := NULL; NEW.hours_earned := 0; NEW.assigned_letter := NULL;
    NEW.hours_needed := GREATEST(COALESCE(NEW.hours_needed, 20), 20);
    RETURN NEW;
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.associated_school_id IS DISTINCT FROM OLD.associated_school_id
     OR NEW.hours_earned IS DISTINCT FROM OLD.hours_earned
     OR NEW.hours_needed IS DISTINCT FROM OLD.hours_needed
     OR NEW.assigned_classes IS DISTINCT FROM OLD.assigned_classes
     OR NEW.assigned_letter IS DISTINCT FROM OLD.assigned_letter
     OR NEW.auto_year_renewal IS DISTINCT FROM OLD.auto_year_renewal
     OR (OLD.class_letter IS NOT NULL AND NEW.class_letter IS DISTINCT FROM OLD.class_letter) THEN
    RAISE EXCEPTION 'Šių laukų keisti negalima';
  END IF;
  RETURN NEW;
END;
$function$;