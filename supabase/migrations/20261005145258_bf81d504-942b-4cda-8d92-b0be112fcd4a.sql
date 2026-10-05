CREATE OR REPLACE FUNCTION public.tg_profiles_guard_privileged()
 RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path TO 'public'
AS $$
BEGIN
  -- Only direct Data API writes run as anon/authenticated; trusted
  -- SECURITY DEFINER functions and the service role run as other roles.
  IF current_user NOT IN ('anon','authenticated') OR auth.uid() IS NULL
     OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.role := 'student'; NEW.associated_school_id := NULL; NEW.hours_earned := 0;
    RETURN NEW;
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.associated_school_id IS DISTINCT FROM OLD.associated_school_id
     OR NEW.hours_earned IS DISTINCT FROM OLD.hours_earned
     OR NEW.assigned_classes IS DISTINCT FROM OLD.assigned_classes
     OR NEW.auto_year_renewal IS DISTINCT FROM OLD.auto_year_renewal THEN
    RAISE EXCEPTION 'Šių laukų keisti negalima';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_my_assigned_classes(_classes text[])
 RETURNS text[] LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_role text; v_clean text[];
BEGIN
  SELECT role::text INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF v_role IS DISTINCT FROM 'school_admin' AND v_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Prieiga tik mokyklos administratoriams';
  END IF;
  SELECT COALESCE(array_agg(DISTINCT c), '{}'::text[]) INTO v_clean
  FROM (SELECT trim(x) AS c FROM unnest(COALESCE(_classes, '{}'::text[])) x
        WHERE trim(x) <> '' AND length(trim(x)) <= 24) s;
  UPDATE public.profiles SET assigned_classes = v_clean, updated_at = now() WHERE id = auth.uid();
  RETURN v_clean;
END;
$function$;