-- 1) Klasių kėlimo istorija
CREATE TABLE IF NOT EXISTS public.class_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_year text NOT NULL UNIQUE,
  promoted_count integer NOT NULL DEFAULT 0,
  graduated_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.class_promotions TO authenticated;
GRANT ALL ON public.class_promotions TO service_role;

ALTER TABLE public.class_promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view class promotions" ON public.class_promotions;
CREATE POLICY "Admins can view class promotions"
  ON public.class_promotions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2) Automatinis klasių kėlimas
CREATE OR REPLACE FUNCTION public.promote_class_years()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year text;
  v_promoted integer := 0;
  v_graduated integer := 0;
BEGIN
  -- Mokslo metai: rugsėjis–gruodis priklauso einamiesiems metams
  v_year := CASE
    WHEN EXTRACT(MONTH FROM now())::int >= 8
      THEN EXTRACT(YEAR FROM now())::int || '/' || (EXTRACT(YEAR FROM now())::int + 1)
    ELSE (EXTRACT(YEAR FROM now())::int - 1) || '/' || EXTRACT(YEAR FROM now())::int
  END;

  IF EXISTS (SELECT 1 FROM public.class_promotions WHERE school_year = v_year) THEN
    RETURN jsonb_build_object('skipped', true, 'school_year', v_year);
  END IF;

  -- 12 klasė -> absolventai
  UPDATE public.profiles
     SET class_year = 'Absolventas', updated_at = now()
   WHERE role = 'student'
     AND class_year ~ '^\s*1?[0-9]\s*$'
     AND trim(class_year)::int >= 12;
  GET DIAGNOSTICS v_graduated = ROW_COUNT;

  -- 1..11 -> +1
  UPDATE public.profiles
     SET class_year = (trim(class_year)::int + 1)::text, updated_at = now()
   WHERE role = 'student'
     AND class_year ~ '^\s*1?[0-9]\s*$'
     AND trim(class_year)::int BETWEEN 1 AND 11;
  GET DIAGNOSTICS v_promoted = ROW_COUNT;

  INSERT INTO public.class_promotions (school_year, promoted_count, graduated_count)
  VALUES (v_year, v_promoted, v_graduated);

  RETURN jsonb_build_object(
    'skipped', false,
    'school_year', v_year,
    'promoted', v_promoted,
    'graduated', v_graduated
  );
END;
$$;

REVOKE ALL ON FUNCTION public.promote_class_years() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.promote_class_years() TO service_role;

-- 3) Kasmetinis planuoklis (rugsėjo 1 d. 00:05 UTC)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('promote-class-years')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'promote-class-years');
    PERFORM cron.schedule('promote-class-years', '5 0 1 9 *', 'SELECT public.promote_class_years();');
  END IF;
END;
$$;

-- 4) Mokyklos administratorius pasirenka kuruojamas klases
CREATE OR REPLACE FUNCTION public.set_my_assigned_classes(_classes text[])
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_clean text[];
BEGIN
  SELECT role::text INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF v_role IS DISTINCT FROM 'school_admin' AND v_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Prieiga tik mokyklos administratoriams';
  END IF;

  SELECT COALESCE(array_agg(DISTINCT c), '{}'::text[]) INTO v_clean
  FROM (
    SELECT upper(trim(x)) AS c
    FROM unnest(COALESCE(_classes, '{}'::text[])) AS x
    WHERE trim(x) <> '' AND length(trim(x)) <= 8
  ) s;

  UPDATE public.profiles
     SET assigned_classes = v_clean, updated_at = now()
   WHERE id = auth.uid();

  RETURN v_clean;
END;
$$;

REVOKE ALL ON FUNCTION public.set_my_assigned_classes(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_my_assigned_classes(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_my_assigned_classes(text[]) TO service_role;