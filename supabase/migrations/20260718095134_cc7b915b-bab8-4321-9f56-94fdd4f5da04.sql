CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  meta JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_role public.app_role;
  v_cat public.org_category;
  v_school_id uuid;
  v_classes text[] := '{}';
BEGIN
  v_role := COALESCE((meta->>'role')::public.app_role, 'student');
  v_cat := CASE WHEN meta ? 'org_category' AND meta->>'org_category' <> ''
                THEN (meta->>'org_category')::public.org_category ELSE NULL END;
  v_school_id := CASE WHEN meta ? 'school_id' AND meta->>'school_id' <> ''
                      THEN (meta->>'school_id')::uuid ELSE NULL END;
  v_classes := CASE
    WHEN meta ? 'assigned_classes' AND jsonb_typeof(meta->'assigned_classes') = 'array'
    THEN ARRAY(SELECT jsonb_array_elements_text(meta->'assigned_classes'))
    ELSE '{}'
  END;

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    organization_name,
    hours_needed,
    org_category,
    school_id,
    class_year,
    assigned_classes
  )
  VALUES (
    NEW.id,
    lower(NEW.email),
    COALESCE(meta->>'full_name', meta->>'name'),
    v_role,
    meta->>'organization_name',
    COALESCE((meta->>'hours_needed')::int, CASE WHEN v_role = 'student' THEN 20 ELSE 0 END),
    v_cat,
    v_school_id,
    NULLIF(meta->>'class_year', ''),
    v_classes
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    role = COALESCE(public.profiles.role, EXCLUDED.role),
    organization_name = COALESCE(EXCLUDED.organization_name, public.profiles.organization_name),
    org_category = COALESCE(EXCLUDED.org_category, public.profiles.org_category),
    school_id = COALESCE(public.profiles.school_id, EXCLUDED.school_id),
    class_year = COALESCE(public.profiles.class_year, EXCLUDED.class_year),
    hours_needed = CASE
      WHEN public.profiles.hours_needed = 0 AND EXCLUDED.hours_needed > 0 THEN EXCLUDED.hours_needed
      ELSE public.profiles.hours_needed
    END,
    assigned_classes = COALESCE(public.profiles.assigned_classes, EXCLUDED.assigned_classes, '{}');

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

NOTIFY pgrst, 'reload schema';