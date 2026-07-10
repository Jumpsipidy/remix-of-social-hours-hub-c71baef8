
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
  INSERT INTO public.profiles (id, email, full_name, role, organization_name, hours_needed, org_category)
  VALUES (
    NEW.id, NEW.email, meta->>'full_name', v_role,
    meta->>'organization_name',
    COALESCE((meta->>'hours_needed')::int, 0),
    v_cat
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    role = EXCLUDED.role,
    organization_name = COALESCE(EXCLUDED.organization_name, public.profiles.organization_name),
    org_category = COALESCE(EXCLUDED.org_category, public.profiles.org_category);
  RETURN NEW;
END;
$function$;
