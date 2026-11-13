-- 1) Friendships: only the addressee may answer a pending request, and the pair can never change.
DROP POLICY IF EXISTS "friendships update by addressee" ON public.friendships;
DROP POLICY IF EXISTS "friendships update participant" ON public.friendships;

CREATE POLICY "friendships addressee responds"
ON public.friendships
FOR UPDATE
TO authenticated
USING (auth.uid() = addressee_id AND status = 'pending')
WITH CHECK (auth.uid() = addressee_id AND status IN ('accepted', 'declined'));

CREATE OR REPLACE FUNCTION public.tg_friendships_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW; -- server-side maintenance (service role)
  END IF;
  IF NEW.requester_id IS DISTINCT FROM OLD.requester_id
     OR NEW.addressee_id IS DISTINCT FROM OLD.addressee_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Draugystės dalyvių keisti negalima';
  END IF;
  IF OLD.status <> 'pending' OR auth.uid() <> OLD.addressee_id THEN
    RAISE EXCEPTION 'Į kvietimą gali atsakyti tik gavėjas';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS friendships_guard ON public.friendships;
CREATE TRIGGER friendships_guard
BEFORE UPDATE ON public.friendships
FOR EACH ROW EXECUTE FUNCTION public.tg_friendships_guard();

-- 2) Achievements: the database verifies each key against real progress.
CREATE OR REPLACE FUNCTION public.tg_validate_achievement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _hours numeric := 0;
  _needed numeric := 0;
  _completed int := 0;
  _orgs int := 0;
  _friends int := 0;
  _groups int := 0;
  _login int := 0;
  _weeks int := 0;
  _i int;
  _end date;
  _ok boolean := false;
BEGIN
  IF _uid IS NULL THEN
    RETURN NEW; -- service role / server maintenance
  END IF;
  IF NEW.user_id IS DISTINCT FROM _uid THEN
    RAISE EXCEPTION 'Pasiekimą galima gauti tik sau';
  END IF;
  NEW.unlocked_at := now();

  SELECT COALESCE(hours_needed, 0), COALESCE(login_streak, 0)
    INTO _needed, _login
  FROM profiles WHERE id = _uid;

  SELECT COALESCE(SUM(hours_to_earn) FILTER (WHERE status = 'completed'), 0),
         COUNT(*) FILTER (WHERE status IN ('completed', 'confirmed')),
         COUNT(DISTINCT organization_id)
    INTO _hours, _completed, _orgs
  FROM reservations WHERE student_id = _uid;

  SELECT COUNT(*) INTO _friends FROM friendships
  WHERE status = 'accepted' AND (requester_id = _uid OR addressee_id = _uid);

  SELECT COUNT(*) INTO _groups FROM reservation_participants
  WHERE student_id = _uid AND status = 'accepted';

  FOR _i IN 0..7 LOOP
    _end := current_date - (_i * 7);
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM reservations
      WHERE student_id = _uid
        AND status IN ('completed', 'confirmed')
        AND hours_to_earn > 0
        AND reservation_date BETWEEN _end - 6 AND _end
    );
    _weeks := _weeks + 1;
  END LOOP;

  _ok := CASE NEW.key
    WHEN 'first_hour' THEN _hours >= 1
    WHEN 'five_hours' THEN _hours >= 5
    WHEN 'ten_hours' THEN _hours >= 10
    WHEN 'half_way' THEN _needed > 0 AND _hours / _needed >= 0.5
    WHEN 'goal_reached' THEN _needed > 0 AND _hours >= _needed
    WHEN 'overachiever' THEN _needed > 0 AND _hours / _needed >= 1.5
    WHEN 'three_orgs' THEN _orgs >= 3
    WHEN 'five_orgs' THEN _orgs >= 5
    WHEN 'streak_2' THEN _weeks >= 2
    WHEN 'streak_4' THEN _weeks >= 4
    WHEN 'social_starter' THEN _friends >= 1
    WHEN 'squad' THEN _friends >= 5
    WHEN 'team_player' THEN _groups >= 1
    WHEN 'ten_tasks' THEN _completed >= 10
    WHEN 'login_streak_3' THEN _login >= 3
    WHEN 'login_streak_7' THEN _login >= 7
    WHEN 'login_streak_14' THEN _login >= 14
    WHEN 'login_streak_30' THEN _login >= 30
    ELSE false
  END;

  IF NOT COALESCE(_ok, false) THEN
    RETURN NULL; -- silently skip unearned or unknown keys
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.tg_validate_achievement() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS user_achievements_validate ON public.user_achievements;
CREATE TRIGGER user_achievements_validate
BEFORE INSERT ON public.user_achievements
FOR EACH ROW EXECUTE FUNCTION public.tg_validate_achievement();