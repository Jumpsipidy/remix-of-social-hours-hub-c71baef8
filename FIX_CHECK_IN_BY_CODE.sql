-- =====================================================================
-- Socialinės Valandos — tikslinis check_in_by_code RPC pataisymas
-- Paleisk VISĄ failą savo Supabase SQL Editor.
-- Šis failas sąmoningai nepriklauso nuo kitų FIX failų vykdymo tvarkos.
-- =====================================================================

BEGIN;

-- Aiški klaida, jei pagrindinis QR SQL nebuvo pritaikytas iki galo.
DO $$
BEGIN
  IF to_regclass('public.reservations') IS NULL THEN
    RAISE EXCEPTION 'Trūksta public.reservations lentelės';
  END IF;
  IF to_regclass('public.reservation_participants') IS NULL THEN
    RAISE EXCEPTION 'Trūksta public.reservation_participants lentelės';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reservations' AND column_name = 'check_in_code'
  ) THEN
    RAISE EXCEPTION 'Trūksta public.reservations.check_in_code stulpelio';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reservation_participants' AND column_name = 'check_in_code'
  ) THEN
    RAISE EXCEPTION 'Trūksta public.reservation_participants.check_in_code stulpelio';
  END IF;
END $$;

-- Pašalinama būtent sena vieno TEXT argumento versija, kad neliktų
-- sugadintos signatūros ar neteisingo parametro pavadinimo PostgREST cache.
CREATE OR REPLACE FUNCTION public.check_in_by_code(_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  me UUID := auth.uid();
  cleaned TEXT := regexp_replace(COALESCE(_code, ''), '[^0-9]', '', 'g');
  admin_user BOOLEAN := false;
  reservation_row RECORD;
  participant_row RECORD;
  student_name TEXT;
  checked_at TIMESTAMPTZ;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Neprisijungęs vartotojas';
  END IF;
  IF length(cleaned) <> 6 THEN
    RAISE EXCEPTION 'Kodas turi būti 6 skaitmenys';
  END IF;

  admin_user := COALESCE(public.has_role(me, 'admin'), false);
  IF NOT admin_user AND NOT public.has_role(me, 'organization') THEN
    RAISE EXCEPTION 'Atvykimą gali patvirtinti tik organizacija';
  END IF;

  SELECT r.* INTO reservation_row
  FROM public.reservations r
  WHERE r.check_in_code = cleaned
  LIMIT 1 FOR UPDATE;

  IF FOUND THEN
    IF reservation_row.source = 'school' OR reservation_row.requires_checkin IS NOT TRUE THEN
      RAISE EXCEPTION 'Mokyklos rezervacijoms atvykimo patikra netaikoma';
    END IF;
    IF reservation_row.organization_id IS DISTINCT FROM me AND NOT admin_user THEN
      RAISE EXCEPTION 'Šis kodas priklauso kitai organizacijai';
    END IF;
    IF reservation_row.status::text NOT IN ('approved', 'completed', 'confirmed') THEN
      RAISE EXCEPTION 'Rezervacija dar nepatvirtinta';
    END IF;

    SELECT p.full_name INTO student_name
    FROM public.profiles p WHERE p.id = reservation_row.student_id;

    IF reservation_row.checked_in_at IS NOT NULL THEN
      RETURN jsonb_build_object(
        'ok', true, 'already', true, 'reservation_id', reservation_row.id,
        'student_id', reservation_row.student_id,
        'student_name', COALESCE(student_name, 'Mokinys'),
        'checked_in_at', reservation_row.checked_in_at, 'is_owner', true
      );
    END IF;

    checked_at := now();
    UPDATE public.reservations
    SET checked_in_at = checked_at, checked_in_by = me
    WHERE id = reservation_row.id;

    RETURN jsonb_build_object(
      'ok', true, 'already', false, 'reservation_id', reservation_row.id,
      'student_id', reservation_row.student_id,
      'student_name', COALESCE(student_name, 'Mokinys'),
      'checked_in_at', checked_at, 'is_owner', true
    );
  END IF;

  SELECT rp.*, r.organization_id, r.status::text AS reservation_status,
    r.source AS reservation_source, r.requires_checkin
  INTO participant_row
  FROM public.reservation_participants rp
  JOIN public.reservations r ON r.id = rp.reservation_id
  WHERE rp.check_in_code = cleaned
  LIMIT 1 FOR UPDATE OF rp, r;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kodas nerastas';
  END IF;
  IF participant_row.reservation_source = 'school' OR participant_row.requires_checkin IS NOT TRUE THEN
    RAISE EXCEPTION 'Mokyklos rezervacijoms atvykimo patikra netaikoma';
  END IF;
  IF participant_row.status::text <> 'accepted' THEN
    RAISE EXCEPTION 'Kvietimas dar nepriimtas';
  END IF;
  IF participant_row.organization_id IS DISTINCT FROM me AND NOT admin_user THEN
    RAISE EXCEPTION 'Šis kodas priklauso kitai organizacijai';
  END IF;
  IF participant_row.reservation_status NOT IN ('approved', 'completed', 'confirmed') THEN
    RAISE EXCEPTION 'Rezervacija dar nepatvirtinta';
  END IF;

  SELECT p.full_name INTO student_name
  FROM public.profiles p WHERE p.id = participant_row.student_id;

  IF participant_row.checked_in_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', true, 'already', true,
      'reservation_id', participant_row.reservation_id,
      'student_id', participant_row.student_id,
      'student_name', COALESCE(student_name, 'Mokinys'),
      'checked_in_at', participant_row.checked_in_at, 'is_owner', false
    );
  END IF;

  checked_at := now();
  UPDATE public.reservation_participants
  SET checked_in_at = checked_at, checked_in_by = me
  WHERE id = participant_row.id;

  RETURN jsonb_build_object(
    'ok', true, 'already', false,
    'reservation_id', participant_row.reservation_id,
    'student_id', participant_row.student_id,
    'student_name', COALESCE(student_name, 'Mokinys'),
    'checked_in_at', checked_at, 'is_owner', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_in_by_code(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_in_by_code(TEXT) FROM anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_in_by_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_in_by_code(TEXT) TO service_role;

-- Sustabdo SQL su aiškia klaida, jei signatūra nėra tiksliai tokia,
-- kokią kviečia aplikacija: { "_code": "123456" }.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'check_in_by_code'
      AND pg_get_function_identity_arguments(p.oid) = '_code text'
  ) THEN
    RAISE EXCEPTION 'check_in_by_code(_code text) funkcijos patikra nepavyko';
  END IF;
END $$;

COMMIT;

-- Priverstinai atnaujina Supabase PostgREST funkcijų cache.
NOTIFY pgrst, 'reload schema';

-- SQL Editor rezultatų lentelėje turi pasirodyti viena eilutė:
-- public | check_in_by_code | _code text | authenticated=true
SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'check_in_by_code';