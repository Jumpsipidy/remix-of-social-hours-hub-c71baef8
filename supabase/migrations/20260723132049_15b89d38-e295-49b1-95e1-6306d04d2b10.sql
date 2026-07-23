
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS login_streak int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_login_streak int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_last_date date,
  ADD COLUMN IF NOT EXISTS streak_freeze_used_at date;

CREATE OR REPLACE FUNCTION public.bump_login_streak()
RETURNS TABLE(login_streak int, longest_login_streak int, streak_last_date date, freeze_used_at date)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  today date := (now() AT TIME ZONE 'Europe/Vilnius')::date;
  last date;
  cur int;
  best int;
  fz date;
  gap int;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT p.streak_last_date, p.login_streak, p.longest_login_streak, p.streak_freeze_used_at
    INTO last, cur, best, fz
  FROM public.profiles p WHERE p.id = me FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF last IS NULL THEN
    cur := 1;
    fz := NULL;
  ELSIF last = today THEN
    -- already counted today, no change
    NULL;
  ELSE
    gap := today - last;
    IF gap = 1 THEN
      cur := cur + 1;
    ELSIF gap = 2 AND (fz IS NULL OR fz < today - 7) THEN
      -- use a freeze for the 1 missed day
      cur := cur + 1;
      fz := today - 1;
    ELSE
      cur := 1;
      fz := NULL;
    END IF;
  END IF;

  IF cur > COALESCE(best, 0) THEN best := cur; END IF;

  UPDATE public.profiles
     SET login_streak = cur,
         longest_login_streak = best,
         streak_last_date = today,
         streak_freeze_used_at = fz
   WHERE id = me;

  RETURN QUERY SELECT cur, best, today, fz;
END;
$$;

REVOKE ALL ON FUNCTION public.bump_login_streak() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bump_login_streak() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_school_streak_leaderboard()
RETURNS TABLE(id uuid, full_name text, class_year text, login_streak int, longest_login_streak int)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me_school uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT p.school_id INTO me_school FROM public.profiles p WHERE p.id = auth.uid();
  IF me_school IS NULL THEN RETURN; END IF;

  RETURN QUERY
    SELECT p.id, p.full_name, p.class_year, p.login_streak, p.longest_login_streak
    FROM public.profiles p
    WHERE p.school_id = me_school
      AND p.role = 'student'
      AND p.login_streak > 0
    ORDER BY p.login_streak DESC, p.longest_login_streak DESC, p.full_name
    LIMIT 20;
END;
$$;

REVOKE ALL ON FUNCTION public.get_school_streak_leaderboard() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_school_streak_leaderboard() TO authenticated;
