
-- ============================================================
-- 1) DIRECT MESSAGES (student ↔ student, friends only, 2-day purge)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.dm_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT dm_rooms_ordered CHECK (user_a < user_b),
  CONSTRAINT dm_rooms_pair_unique UNIQUE (user_a, user_b)
);
GRANT SELECT, INSERT ON public.dm_rooms TO authenticated;
GRANT ALL ON public.dm_rooms TO service_role;
ALTER TABLE public.dm_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dm_rooms select participant" ON public.dm_rooms;
CREATE POLICY "dm_rooms select participant" ON public.dm_rooms FOR SELECT TO authenticated
USING (auth.uid() = user_a OR auth.uid() = user_b OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "dm_rooms insert friends only" ON public.dm_rooms;
CREATE POLICY "dm_rooms insert friends only" ON public.dm_rooms FOR INSERT TO authenticated
WITH CHECK (
  (auth.uid() = user_a OR auth.uid() = user_b)
  AND EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted'
      AND ((f.requester_id = user_a AND f.addressee_id = user_b)
        OR (f.requester_id = user_b AND f.addressee_id = user_a))
  )
);

CREATE TABLE IF NOT EXISTS public.dm_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.dm_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dm_messages_room_idx ON public.dm_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS dm_messages_purge_idx ON public.dm_messages(created_at);
GRANT SELECT, INSERT ON public.dm_messages TO authenticated;
GRANT ALL ON public.dm_messages TO service_role;
ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_dm_room_member(_room_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.dm_rooms
    WHERE id = _room_id AND (_user_id = user_a OR _user_id = user_b)
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_dm_room_member(UUID, UUID) TO authenticated;

DROP POLICY IF EXISTS "dm_messages select member" ON public.dm_messages;
CREATE POLICY "dm_messages select member" ON public.dm_messages FOR SELECT TO authenticated
USING (public.is_dm_room_member(room_id, auth.uid()));

DROP POLICY IF EXISTS "dm_messages insert member" ON public.dm_messages;
CREATE POLICY "dm_messages insert member" ON public.dm_messages FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid() AND public.is_dm_room_member(room_id, auth.uid()));

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='dm_messages') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_messages;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='dm_rooms') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_rooms;
    END IF;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.open_dm_room(_other UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me UUID := auth.uid();
  a UUID;
  b UUID;
  rid UUID;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF me = _other THEN RAISE EXCEPTION 'Cannot DM yourself'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
      AND ((requester_id = me AND addressee_id = _other)
        OR (requester_id = _other AND addressee_id = me))
  ) THEN
    RAISE EXCEPTION 'You must be friends to DM';
  END IF;
  IF me < _other THEN a := me; b := _other; ELSE a := _other; b := me; END IF;
  SELECT id INTO rid FROM public.dm_rooms WHERE user_a = a AND user_b = b;
  IF rid IS NULL THEN
    INSERT INTO public.dm_rooms(user_a, user_b) VALUES (a, b) RETURNING id INTO rid;
  END IF;
  RETURN rid;
END; $$;
GRANT EXECUTE ON FUNCTION public.open_dm_room(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.purge_dm_messages()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.dm_messages WHERE created_at < now() - interval '2 days';
$$;

-- ============================================================
-- 2) RECURRING TASKS
-- ============================================================
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS recurrence TEXT NOT NULL DEFAULT 'none'
    CHECK (recurrence IN ('none','weekly','biweekly','monthly')),
  ADD COLUMN IF NOT EXISTS recurrence_weekday SMALLINT CHECK (recurrence_weekday BETWEEN 0 AND 6),
  ADD COLUMN IF NOT EXISTS recurrence_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS template_source_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recurrence_until DATE;

CREATE INDEX IF NOT EXISTS tasks_recurring_idx ON public.tasks(recurrence, recurrence_active) WHERE recurrence <> 'none';

CREATE OR REPLACE FUNCTION public.generate_recurring_tasks()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  t RECORD;
  target_date DATE;
  created_count INTEGER := 0;
  i INTEGER;
  matches BOOLEAN;
BEGIN
  FOR t IN
    SELECT * FROM public.tasks
    WHERE recurrence <> 'none' AND recurrence_active = true AND template_source_id IS NULL
  LOOP
    FOR i IN 0..14 LOOP
      target_date := CURRENT_DATE + i;
      IF t.recurrence_until IS NOT NULL AND target_date > t.recurrence_until THEN
        EXIT;
      END IF;
      matches := false;
      IF t.recurrence = 'weekly' AND t.recurrence_weekday IS NOT NULL
         AND EXTRACT(DOW FROM target_date)::INT = t.recurrence_weekday THEN
        matches := true;
      ELSIF t.recurrence = 'biweekly' AND t.recurrence_weekday IS NOT NULL
         AND EXTRACT(DOW FROM target_date)::INT = t.recurrence_weekday
         AND ((target_date - t.task_date) % 14 = 0) THEN
        matches := true;
      ELSIF t.recurrence = 'monthly'
         AND EXTRACT(DAY FROM target_date) = EXTRACT(DAY FROM t.task_date) THEN
        matches := true;
      END IF;
      IF NOT matches THEN CONTINUE; END IF;
      IF EXISTS (
        SELECT 1 FROM public.tasks
        WHERE template_source_id = t.id AND task_date = target_date
      ) THEN CONTINUE; END IF;
      INSERT INTO public.tasks (
        organization_id, title, description, task_date, start_time, end_time,
        available_hours, location, spots_total, is_open, is_event,
        created_by, event_host_name, tags, template_source_id, recurrence
      ) VALUES (
        t.organization_id, t.title, t.description, target_date, t.start_time, t.end_time,
        t.available_hours, t.location, t.spots_total, true, t.is_event,
        t.created_by, t.event_host_name, t.tags, t.id, 'none'
      );
      created_count := created_count + 1;
    END LOOP;
  END LOOP;
  RETURN created_count;
END; $$;
GRANT EXECUTE ON FUNCTION public.generate_recurring_tasks() TO service_role;

-- ============================================================
-- 3) DEEP HEALTH SCAN + AUTO-LOCKDOWN
-- ============================================================
CREATE OR REPLACE FUNCTION public.run_deep_health_scan()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  checks JSONB := '[]'::jsonb;
  critical_fail INT := 0;
  warn_fail INT := 0;
  n BIGINT;
  ok BOOLEAN;
BEGIN
  BEGIN
    SELECT count(*) INTO n FROM public.profiles;
    checks := checks || jsonb_build_object('label','profiles reachable','ok',true,'detail',n||' rows','critical',true);
  EXCEPTION WHEN OTHERS THEN
    checks := checks || jsonb_build_object('label','profiles reachable','ok',false,'detail',SQLERRM,'critical',true);
    critical_fail := critical_fail + 1;
  END;

  BEGIN
    SELECT count(*) INTO n FROM public.reservations;
    checks := checks || jsonb_build_object('label','reservations reachable','ok',true,'detail',n||' rows','critical',true);
  EXCEPTION WHEN OTHERS THEN
    checks := checks || jsonb_build_object('label','reservations reachable','ok',false,'detail',SQLERRM,'critical',true);
    critical_fail := critical_fail + 1;
  END;

  BEGIN
    SELECT count(*) INTO n FROM public.tasks;
    checks := checks || jsonb_build_object('label','tasks reachable','ok',true,'detail',n||' rows','critical',true);
  EXCEPTION WHEN OTHERS THEN
    checks := checks || jsonb_build_object('label','tasks reachable','ok',false,'detail',SQLERRM,'critical',true);
    critical_fail := critical_fail + 1;
  END;

  BEGIN
    SELECT count(*) INTO n FROM public.messages;
    checks := checks || jsonb_build_object('label','messages reachable','ok',true,'detail',n||' rows','critical',false);
  EXCEPTION WHEN OTHERS THEN
    checks := checks || jsonb_build_object('label','messages reachable','ok',false,'detail',SQLERRM,'critical',false);
    warn_fail := warn_fail + 1;
  END;

  BEGIN
    SELECT count(*) INTO n FROM public.schools;
    checks := checks || jsonb_build_object('label','schools reachable','ok',true,'detail',n||' rows','critical',true);
  EXCEPTION WHEN OTHERS THEN
    checks := checks || jsonb_build_object('label','schools reachable','ok',false,'detail',SQLERRM,'critical',true);
    critical_fail := critical_fail + 1;
  END;

  SELECT relrowsecurity INTO ok FROM pg_class WHERE oid = 'public.profiles'::regclass;
  checks := checks || jsonb_build_object('label','RLS: profiles','ok',ok,'detail',ok::text,'critical',true);
  IF NOT ok THEN critical_fail := critical_fail + 1; END IF;

  SELECT relrowsecurity INTO ok FROM pg_class WHERE oid = 'public.reservations'::regclass;
  checks := checks || jsonb_build_object('label','RLS: reservations','ok',ok,'detail',ok::text,'critical',true);
  IF NOT ok THEN critical_fail := critical_fail + 1; END IF;

  SELECT relrowsecurity INTO ok FROM pg_class WHERE oid = 'public.messages'::regclass;
  checks := checks || jsonb_build_object('label','RLS: messages','ok',ok,'detail',ok::text,'critical',true);
  IF NOT ok THEN critical_fail := critical_fail + 1; END IF;

  SELECT relrowsecurity INTO ok FROM pg_class WHERE oid = 'public.dm_messages'::regclass;
  checks := checks || jsonb_build_object('label','RLS: dm_messages','ok',ok,'detail',ok::text,'critical',true);
  IF NOT ok THEN critical_fail := critical_fail + 1; END IF;

  BEGIN
    SELECT count(*) INTO n FROM public.site_settings;
    checks := checks || jsonb_build_object('label','site_settings reachable','ok',true,'detail',n||' rows','critical',false);
  EXCEPTION WHEN OTHERS THEN
    checks := checks || jsonb_build_object('label','site_settings reachable','ok',false,'detail',SQLERRM,'critical',false);
    warn_fail := warn_fail + 1;
  END;

  SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname='has_role' AND pronamespace='public'::regnamespace) INTO ok;
  checks := checks || jsonb_build_object('label','has_role() present','ok',ok,'detail',ok::text,'critical',true);
  IF NOT ok THEN critical_fail := critical_fail + 1; END IF;

  SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname='handle_new_user' AND pronamespace='public'::regnamespace) INTO ok;
  checks := checks || jsonb_build_object('label','handle_new_user() present','ok',ok,'detail',ok::text,'critical',true);
  IF NOT ok THEN critical_fail := critical_fail + 1; END IF;

  SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname='award_reservation_hours' AND pronamespace='public'::regnamespace) INTO ok;
  checks := checks || jsonb_build_object('label','award_reservation_hours() present','ok',ok,'detail',ok::text,'critical',true);
  IF NOT ok THEN critical_fail := critical_fail + 1; END IF;

  SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname='purge_dm_messages' AND pronamespace='public'::regnamespace) INTO ok;
  checks := checks || jsonb_build_object('label','purge_dm_messages() present','ok',ok,'detail',ok::text,'critical',false);
  IF NOT ok THEN warn_fail := warn_fail + 1; END IF;

  SELECT count(*) INTO n FROM public.messages m LEFT JOIN public.chat_rooms r ON r.id = m.chat_room_id WHERE r.id IS NULL;
  checks := checks || jsonb_build_object('label','no orphan chat messages','ok',n=0,'detail',n||' orphans','critical',false);
  IF n > 0 THEN warn_fail := warn_fail + 1; END IF;

  SELECT count(*) INTO n FROM public.messages WHERE created_at < now() - interval '15 days';
  checks := checks || jsonb_build_object('label','12-day purge effective','ok',n=0,'detail',n||' stale','critical',false);
  IF n > 0 THEN warn_fail := warn_fail + 1; END IF;

  SELECT count(*) INTO n FROM public.dm_messages WHERE created_at < now() - interval '3 days';
  checks := checks || jsonb_build_object('label','2-day DM purge effective','ok',n=0,'detail',n||' stale','critical',false);
  IF n > 0 THEN warn_fail := warn_fail + 1; END IF;

  SELECT count(*) INTO n FROM public.profiles WHERE role = 'admin';
  checks := checks || jsonb_build_object('label','admin exists','ok',n>=1,'detail',n||' admins','critical',true);
  IF n = 0 THEN critical_fail := critical_fail + 1; END IF;

  RETURN jsonb_build_object(
    'generated_at', now(),
    'critical_failures', critical_fail,
    'warnings', warn_fail,
    'checks', checks
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.run_deep_health_scan() TO authenticated;
GRANT EXECUTE ON FUNCTION public.run_deep_health_scan() TO service_role;

CREATE OR REPLACE FUNCTION public.auto_lockdown_if_unhealthy()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  scan JSONB;
  crit INT;
BEGIN
  scan := public.run_deep_health_scan();
  crit := (scan->>'critical_failures')::INT;
  IF crit > 0 THEN
    INSERT INTO public.site_settings (id, lockdown_enabled, lockdown_code, lockdown_message, updated_at)
    VALUES (true, true, 'E-4002',
      '[auto] Sistemos patikra rado '||crit||' kritinių gedimų. Prieiga ribojama automatiškai.',
      now())
    ON CONFLICT (id) DO UPDATE SET
      lockdown_enabled = true,
      lockdown_code = 'E-4002',
      lockdown_message = EXCLUDED.lockdown_message,
      updated_at = now()
    WHERE site_settings.lockdown_enabled = false;
  END IF;
  RETURN scan;
END; $$;
GRANT EXECUTE ON FUNCTION public.auto_lockdown_if_unhealthy() TO service_role;

-- ============================================================
-- 4) CRON JOBS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
DECLARE j RECORD;
BEGIN
  FOR j IN SELECT jobname FROM cron.job WHERE jobname IN (
    'purge-messages-hourly','purge-dm-15m','recurring-tasks-daily','health-scan-auto'
  ) LOOP
    PERFORM cron.unschedule(j.jobname);
  END LOOP;
END $$;

SELECT cron.schedule('purge-messages-hourly', '0 * * * *', $$SELECT public.purge_old_messages();$$);
SELECT cron.schedule('purge-dm-15m',         '*/15 * * * *', $$SELECT public.purge_dm_messages();$$);
SELECT cron.schedule('recurring-tasks-daily','15 3 * * *',   $$SELECT public.generate_recurring_tasks();$$);
SELECT cron.schedule('health-scan-auto',     '*/10 * * * *', $$SELECT public.auto_lockdown_if_unhealthy();$$);

NOTIFY pgrst, 'reload schema';
