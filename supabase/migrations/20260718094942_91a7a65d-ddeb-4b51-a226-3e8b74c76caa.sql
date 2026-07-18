ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS assigned_classes text[] NOT NULL DEFAULT '{}';

UPDATE public.profiles
SET assigned_classes = '{}'
WHERE assigned_classes IS NULL;

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
BEGIN
  v_role := COALESCE((meta->>'role')::public.app_role, 'student');
  v_cat := CASE WHEN meta ? 'org_category' AND meta->>'org_category' <> ''
                THEN (meta->>'org_category')::public.org_category ELSE NULL END;

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    organization_name,
    hours_needed,
    org_category,
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
    CASE
      WHEN meta ? 'assigned_classes' AND jsonb_typeof(meta->'assigned_classes') = 'array'
      THEN ARRAY(SELECT jsonb_array_elements_text(meta->'assigned_classes'))
      ELSE '{}'
    END
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    role = COALESCE(public.profiles.role, EXCLUDED.role),
    organization_name = COALESCE(EXCLUDED.organization_name, public.profiles.organization_name),
    org_category = COALESCE(EXCLUDED.org_category, public.profiles.org_category),
    assigned_classes = COALESCE(public.profiles.assigned_classes, EXCLUDED.assigned_classes, '{}');

  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

NOTIFY pgrst, 'reload schema';