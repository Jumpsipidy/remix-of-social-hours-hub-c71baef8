CREATE OR REPLACE FUNCTION public.next_class_year(_c text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT CASE trim(_c)
    WHEN '5' THEN '6' WHEN '6' THEN '7' WHEN '7' THEN '8'
    WHEN '8' THEN '9 / I gimn.'
    WHEN '9' THEN '10 / II gimn.' WHEN '9 / I gimn.' THEN '10 / II gimn.'
    WHEN '10' THEN '11 / III gimn.' WHEN '10 / II gimn.' THEN '11 / III gimn.'
    WHEN '11' THEN '12 / IV gimn.' WHEN '11 / III gimn.' THEN '12 / IV gimn.'
    WHEN '12' THEN 'Absolventas' WHEN '12 / IV gimn.' THEN 'Absolventas'
    ELSE _c END
$$;

CREATE OR REPLACE FUNCTION public.promote_class_years()
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_year text; v_promoted integer := 0; v_graduated integer := 0; v_admins integer := 0;
BEGIN
  v_year := CASE WHEN EXTRACT(MONTH FROM now())::int >= 8
      THEN EXTRACT(YEAR FROM now())::int || '/' || (EXTRACT(YEAR FROM now())::int + 1)
    ELSE (EXTRACT(YEAR FROM now())::int - 1) || '/' || EXTRACT(YEAR FROM now())::int END;
  IF EXISTS (SELECT 1 FROM public.class_promotions WHERE school_year = v_year) THEN
    RETURN jsonb_build_object('skipped', true, 'school_year', v_year);
  END IF;

  UPDATE public.profiles SET class_year = 'Absolventas', updated_at = now()
   WHERE role = 'student' AND public.next_class_year(class_year) = 'Absolventas' AND class_year <> 'Absolventas';
  GET DIAGNOSTICS v_graduated = ROW_COUNT;

  UPDATE public.profiles SET class_year = public.next_class_year(class_year), updated_at = now()
   WHERE role = 'student' AND class_year IS NOT NULL AND class_year <> 'Absolventas'
     AND public.next_class_year(class_year) <> class_year;
  GET DIAGNOSTICS v_promoted = ROW_COUNT;

  UPDATE public.profiles p SET assigned_classes = COALESCE((
      SELECT array_agg(DISTINCT public.next_class_year(c))
      FROM unnest(p.assigned_classes) c WHERE public.next_class_year(c) <> 'Absolventas'), '{}'),
    updated_at = now()
   WHERE p.role = 'school_admin' AND p.auto_year_renewal AND cardinality(p.assigned_classes) > 0;
  GET DIAGNOSTICS v_admins = ROW_COUNT;

  INSERT INTO public.class_promotions (school_year, promoted_count, graduated_count)
  VALUES (v_year, v_promoted, v_graduated);
  RETURN jsonb_build_object('skipped', false, 'school_year', v_year,
    'promoted', v_promoted, 'graduated', v_graduated, 'admins_renewed', v_admins);
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.promote_class_years() FROM PUBLIC, anon, authenticated;