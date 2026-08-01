-- =====================================================================
--  Socialinės Valandos — QR įsiregistravimo + streak/pasiekimų pataisa
--  Paleisk VISĄ failą Supabase SQL Editor. Saugu leisti kelis kartus.
-- =====================================================================

-- ---------------------------------------------------------------
-- 1. Įsiregistravimo stulpeliai
-- ---------------------------------------------------------------
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS check_in_code TEXT,
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checked_in_by UUID REFERENCES public.profiles(id);

ALTER TABLE public.reservation_participants
  ADD COLUMN IF NOT EXISTS check_in_code TEXT,
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checked_in_by UUID REFERENCES public.profiles(id);

CREATE UNIQUE INDEX IF NOT EXISTS reservations_check_in_code_key
  ON public.reservations (check_in_code) WHERE check_in_code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS participants_check_in_code_key
  ON public.reservation_participants (check_in_code) WHERE check_in_code IS NOT NULL;

-- ---------------------------------------------------------------
-- 2. Kodo generatorius
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_check_in_code()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c TEXT; i INT := 0;
BEGIN
  LOOP
    c := lpad((floor(random() * 1000000))::int::text, 6, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.reservations WHERE check_in_code = c)
         AND NOT EXISTS (SELECT 1 FROM public.reservation_participants WHERE check_in_code = c);
    i := i + 1;
    IF i > 50 THEN RAISE EXCEPTION 'Nepavyko sugeneruoti unikalaus kodo'; END IF;
  END LOOP;
  RETURN c;
END $$;

-- ---------------------------------------------------------------
-- 3. Trigeriai — kodas atsiranda kai rezervacija patvirtinama
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_reservations_assign_checkin_code()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('approved','completed','confirmed') AND NEW.check_in_code IS NULL THEN
    NEW.check_in_code := public.generate_check_in_code();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS reservations_assign_checkin_code ON public.reservations;
CREATE TRIGGER reservations_assign_checkin_code
  BEFORE INSERT OR UPDATE OF status ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.tg_reservations_assign_checkin_code();

CREATE OR REPLACE FUNCTION public.tg_participants_assign_checkin_code()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'accepted' AND NEW.check_in_code IS NULL THEN
    NEW.check_in_code := public.generate_check_in_code();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS participants_assign_checkin_code ON public.reservation_participants;
CREATE TRIGGER participants_assign_checkin_code
  BEFORE INSERT OR UPDATE OF status ON public.reservation_participants
  FOR EACH ROW EXECUTE FUNCTION public.tg_participants_assign_checkin_code();

-- ---------------------------------------------------------------
-- 4. Senų eilučių užpildymas (dėl to /checkin rodė „nėra rezervacijų")
-- ---------------------------------------------------------------
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.reservations
           WHERE check_in_code IS NULL AND status IN ('approved','completed','confirmed') LOOP
    UPDATE public.reservations SET check_in_code = public.generate_check_in_code() WHERE id = r.id;
  END LOOP;
  FOR r IN SELECT id FROM public.reservation_participants
           WHERE check_in_code IS NULL AND status = 'accepted' LOOP
    UPDATE public.reservation_participants SET check_in_code = public.generate_check_in_code() WHERE id = r.id;
  END LOOP;
END $$;

-- ---------------------------------------------------------------
-- 5. Kodo užtikrinimas iš app'o (jei trigeris kažkodėl nesuveikė)
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_check_in_code(_reservation_id UUID DEFAULT NULL, _participant_id UUID DEFAULT NULL)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c TEXT;
BEGIN
  IF _participant_id IS NOT NULL THEN
    SELECT check_in_code INTO c FROM public.reservation_participants
      WHERE id = _participant_id AND student_id = auth.uid() AND status = 'accepted';
    IF NOT FOUND THEN RETURN NULL; END IF;
    IF c IS NULL THEN
      c := public.generate_check_in_code();
      UPDATE public.reservation_participants SET check_in_code = c WHERE id = _participant_id;
    END IF;
    RETURN c;
  END IF;

  IF _reservation_id IS NOT NULL THEN
    SELECT check_in_code INTO c FROM public.reservations
      WHERE id = _reservation_id AND student_id = auth.uid()
        AND status IN ('approved','completed','confirmed');
    IF NOT FOUND THEN RETURN NULL; END IF;
    IF c IS NULL THEN
      c := public.generate_check_in_code();
      UPDATE public.reservations SET check_in_code = c WHERE id = _reservation_id;
    END IF;
    RETURN c;
  END IF;

  RETURN NULL;
END $$;

GRANT EXECUTE ON FUNCTION public.ensure_check_in_code(UUID, UUID) TO authenticated;

-- ---------------------------------------------------------------
-- 6. Įregistravimas pagal kodą (naudoja tik organizacija / admin)
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_in_by_code(_code TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me UUID := auth.uid();
  is_admin BOOLEAN := EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin');
  r RECORD; p RECORD; sname TEXT; ts TIMESTAMPTZ;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Neprisijungęs vartotojas'; END IF;

  SELECT * INTO r FROM public.reservations WHERE check_in_code = _code;
  IF FOUND THEN
    IF r.organization_id <> me AND NOT is_admin THEN RAISE EXCEPTION 'Šis kodas priklauso kitai organizacijai'; END IF;
    IF r.status NOT IN ('approved','completed','confirmed') THEN RAISE EXCEPTION 'Rezervacija dar nepatvirtinta'; END IF;
    SELECT full_name INTO sname FROM public.profiles WHERE id = r.student_id;
    IF r.checked_in_at IS NOT NULL THEN
      RETURN jsonb_build_object('ok', true, 'already', true, 'reservation_id', r.id, 'student_id', r.student_id,
        'student_name', COALESCE(sname,'Mokinys'), 'checked_in_at', r.checked_in_at, 'is_owner', true);
    END IF;
    ts := now();
    UPDATE public.reservations SET checked_in_at = ts, checked_in_by = me WHERE id = r.id;
    RETURN jsonb_build_object('ok', true, 'already', false, 'reservation_id', r.id, 'student_id', r.student_id,
      'student_name', COALESCE(sname,'Mokinys'), 'checked_in_at', ts, 'is_owner', true);
  END IF;

  SELECT pp.*, rr.organization_id AS org_id, rr.status AS res_status
    INTO p FROM public.reservation_participants pp
    JOIN public.reservations rr ON rr.id = pp.reservation_id
    WHERE pp.check_in_code = _code;
  IF NOT FOUND THEN RAISE EXCEPTION 'Kodas nerastas'; END IF;
  IF p.org_id <> me AND NOT is_admin THEN RAISE EXCEPTION 'Šis kodas priklauso kitai organizacijai'; END IF;
  IF p.res_status NOT IN ('approved','completed','confirmed') THEN RAISE EXCEPTION 'Rezervacija dar nepatvirtinta'; END IF;

  SELECT full_name INTO sname FROM public.profiles WHERE id = p.student_id;
  IF p.checked_in_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'already', true, 'reservation_id', p.reservation_id, 'student_id', p.student_id,
      'student_name', COALESCE(sname,'Mokinys'), 'checked_in_at', p.checked_in_at, 'is_owner', false);
  END IF;
  ts := now();
  UPDATE public.reservation_participants SET checked_in_at = ts, checked_in_by = me WHERE id = p.id;
  RETURN jsonb_build_object('ok', true, 'already', false, 'reservation_id', p.reservation_id, 'student_id', p.student_id,
    'student_name', COALESCE(sname,'Mokinys'), 'checked_in_at', ts, 'is_owner', false);
END $$;

REVOKE ALL ON FUNCTION public.check_in_by_code(TEXT) FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_in_by_code(TEXT) TO authenticated;

-- ---------------------------------------------------------------
-- 7. Pasiekimai (achievements)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, key)
);

GRANT SELECT, INSERT ON public.user_achievements TO authenticated;
GRANT ALL ON public.user_achievements TO service_role;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own achievements select" ON public.user_achievements;
CREATE POLICY "own achievements select" ON public.user_achievements
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "own achievements insert" ON public.user_achievements;
CREATE POLICY "own achievements insert" ON public.user_achievements
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- 8. Prisijungimų streak'as
-- ---------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS login_streak INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_login_streak INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_login_day DATE,
  ADD COLUMN IF NOT EXISTS freeze_used_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.bump_login_streak()
RETURNS TABLE (login_streak INT, longest_login_streak INT, freeze_used_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me UUID := auth.uid(); last_day DATE; cur INT; best INT; today DATE := (now() AT TIME ZONE 'Europe/Vilnius')::date;
BEGIN
  IF me IS NULL THEN RETURN; END IF;
  SELECT p.last_login_day, p.login_streak, p.longest_login_streak
    INTO last_day, cur, best FROM public.profiles p WHERE p.id = me;
  IF NOT FOUND THEN RETURN; END IF;

  cur := COALESCE(cur, 0); best := COALESCE(best, 0);
  IF last_day IS NULL THEN cur := 1;
  ELSIF last_day = today THEN cur := GREATEST(cur, 1);
  ELSIF last_day = today - 1 THEN cur := cur + 1;
  ELSE cur := 1;
  END IF;
  best := GREATEST(best, cur);

  UPDATE public.profiles p
     SET login_streak = cur, longest_login_streak = best, last_login_day = today
   WHERE p.id = me;

  RETURN QUERY SELECT cur, best, (SELECT p.freeze_used_at FROM public.profiles p WHERE p.id = me);
END $$;

GRANT EXECUTE ON FUNCTION public.bump_login_streak() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_school_streak_leaderboard()
RETURNS TABLE (id UUID, full_name TEXT, class_year TEXT, login_streak INT, longest_login_streak INT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.full_name, p.class_year::text, p.login_streak, p.longest_login_streak
    FROM public.profiles p
   WHERE p.role = 'student'
     AND p.school_id IS NOT DISTINCT FROM (SELECT s.school_id FROM public.profiles s WHERE s.id = auth.uid())
     AND COALESCE(p.login_streak, 0) > 0
   ORDER BY p.login_streak DESC, p.longest_login_streak DESC
   LIMIT 10;
$$;

GRANT EXECUTE ON FUNCTION public.get_school_streak_leaderboard() TO authenticated;

-- ---------------------------------------------------------------
-- 9. Schema cache perkrovimas
-- ---------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
