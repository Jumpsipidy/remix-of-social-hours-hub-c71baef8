
-- 1. Schools: exclude signup_code from public reads via column-level grant
REVOKE SELECT ON public.schools FROM anon, authenticated;
GRANT SELECT (id, name, city, is_active, created_at) ON public.schools TO anon, authenticated;
GRANT SELECT ON public.schools TO service_role;

-- 2. Site settings: revoke public read; rely on get_lockdown_public() SECURITY DEFINER RPC
DROP POLICY IF EXISTS "site_settings read all" ON public.site_settings;
CREATE POLICY "site_settings admin read" ON public.site_settings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Restrict deep health scan to admins
CREATE OR REPLACE FUNCTION public.run_deep_health_scan()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  checks JSONB := '[]'::jsonb;
  critical_fail INT := 0;
  warn_fail INT := 0;
  n BIGINT;
  ok BOOLEAN;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  BEGIN SELECT count(*) INTO n FROM public.profiles;
    checks := checks || jsonb_build_object('label','profiles reachable','ok',true,'detail',n||' rows','critical',true);
  EXCEPTION WHEN OTHERS THEN
    checks := checks || jsonb_build_object('label','profiles reachable','ok',false,'detail',SQLERRM,'critical',true);
    critical_fail := critical_fail + 1;
  END;

  BEGIN SELECT count(*) INTO n FROM public.reservations;
    checks := checks || jsonb_build_object('label','reservations reachable','ok',true,'detail',n||' rows','critical',true);
  EXCEPTION WHEN OTHERS THEN
    checks := checks || jsonb_build_object('label','reservations reachable','ok',false,'detail',SQLERRM,'critical',true);
    critical_fail := critical_fail + 1;
  END;

  BEGIN SELECT count(*) INTO n FROM public.tasks;
    checks := checks || jsonb_build_object('label','tasks reachable','ok',true,'detail',n||' rows','critical',true);
  EXCEPTION WHEN OTHERS THEN
    checks := checks || jsonb_build_object('label','tasks reachable','ok',false,'detail',SQLERRM,'critical',true);
    critical_fail := critical_fail + 1;
  END;

  BEGIN SELECT count(*) INTO n FROM public.messages;
    checks := checks || jsonb_build_object('label','messages reachable','ok',true,'detail',n||' rows','critical',false);
  EXCEPTION WHEN OTHERS THEN
    checks := checks || jsonb_build_object('label','messages reachable','ok',false,'detail',SQLERRM,'critical',false);
    warn_fail := warn_fail + 1;
  END;

  BEGIN SELECT count(*) INTO n FROM public.schools;
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

  BEGIN SELECT count(*) INTO n FROM public.site_settings;
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
END; $function$;

-- 4. Fix mutable search_path on trigger function
CREATE OR REPLACE FUNCTION public.ai_analyses_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;
