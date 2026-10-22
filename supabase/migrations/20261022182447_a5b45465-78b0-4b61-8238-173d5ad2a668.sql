-- lovable-cron-fallback-reviewed: SQL-only health reconciliation detects outages with no row-change event; one consolidated two-minute job balances prompt protection and recovery, 720 checks per day disclosed to user.
CREATE TABLE public.lockdown_health_state (id boolean PRIMARY KEY DEFAULT true, failures integer NOT NULL DEFAULT 0, healthy integer NOT NULL DEFAULT 0, locked_at timestamptz, locked_message text, threat_level text NOT NULL DEFAULT 'unknown', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.lockdown_health_state TO service_role;
ALTER TABLE public.lockdown_health_state ENABLE ROW LEVEL SECURITY;
INSERT INTO public.lockdown_health_state(id) VALUES(true);

CREATE OR REPLACE FUNCTION public.classify_lockdown_health(_scan jsonb) RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path=public AS $$
DECLARE c jsonb; technical boolean:=false;
BEGIN
 IF _scan IS NULL OR jsonb_typeof(_scan->'checks') IS DISTINCT FROM 'array' OR jsonb_array_length(_scan->'checks')=0 THEN RETURN 'unknown'; END IF;
 FOR c IN SELECT value FROM jsonb_array_elements(_scan->'checks') LOOP
  IF jsonb_typeof(c->'ok') IS DISTINCT FROM 'boolean' OR jsonb_typeof(c->'critical') IS DISTINCT FROM 'boolean' THEN RETURN 'unknown'; END IF;
  IF (c->>'ok')::boolean=false AND (c->>'critical')::boolean=true THEN
   IF c->>'label' LIKE '% reachable' THEN technical:=true;
   ELSE RETURN 'security'; END IF;
  END IF;
 END LOOP;
 IF technical THEN RETURN 'technical'; END IF;
 RETURN 'healthy';
END $$;
REVOKE ALL ON FUNCTION public.classify_lockdown_health(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.classify_lockdown_health(jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.auto_lockdown_if_unhealthy() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE scan jsonb; level text; health public.lockdown_health_state%ROWTYPE; settings public.site_settings%ROWTYPE; stamp timestamptz:=clock_timestamp(); msg text;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('sv-lockdown-health',0));
 SELECT * INTO health FROM public.lockdown_health_state WHERE id=true FOR UPDATE;
 SELECT * INTO settings FROM public.site_settings WHERE id=true FOR UPDATE;
 scan:=public.run_deep_health_scan(); level:=public.classify_lockdown_health(scan);
 UPDATE public.lockdown_health_state SET threat_level=level, failures=CASE WHEN level='technical' THEN failures+1 ELSE 0 END, healthy=CASE WHEN level='healthy' THEN healthy+1 ELSE 0 END, updated_at=stamp WHERE id=true RETURNING * INTO health;
 IF NOT FOUND OR settings.id IS NULL THEN RETURN jsonb_build_object('decision','unknown'); END IF;
 IF settings.lockdown_enabled IS NOT TRUE AND (level='security' OR (level='technical' AND health.failures>=2)) THEN
  msg:=CASE WHEN level='security' THEN '[auto] Saugumo patikra aptiko kritinę grėsmę. Reikalinga administratoriaus patikra.' ELSE '[auto] Patvirtintas pasikartojantis techninis gedimas. Vyksta automatinės atkūrimo patikros.' END;
  UPDATE public.site_settings SET lockdown_enabled=true, lockdown_code=CASE WHEN level='security' THEN 'E-2002' ELSE 'E-4002' END, lockdown_message=msg, updated_at=stamp, updated_by=NULL WHERE id=true AND lockdown_enabled IS NOT TRUE;
  IF FOUND THEN UPDATE public.lockdown_health_state SET locked_at=CASE WHEN level='technical' THEN stamp END, locked_message=CASE WHEN level='technical' THEN msg END, healthy=0 WHERE id=true; END IF;
 ELSIF settings.lockdown_enabled=true AND settings.lockdown_code='E-4002' AND settings.updated_at=health.locked_at AND settings.lockdown_message=health.locked_message AND level='healthy' AND health.healthy>=3 THEN
  UPDATE public.site_settings SET lockdown_enabled=false, lockdown_code=NULL, lockdown_message=NULL, updated_at=stamp WHERE id=true AND updated_at=health.locked_at AND lockdown_code='E-4002' AND lockdown_message=health.locked_message;
  IF FOUND THEN
   INSERT INTO public.activity_log(action,entity_type,meta) VALUES('app.auto_recovery','lockdown',jsonb_build_object('previous_code','E-4002','healthy_checks',health.healthy,'source','scheduled-health'));
   UPDATE public.lockdown_health_state SET locked_at=NULL,locked_message=NULL WHERE id=true;
  END IF;
 END IF;
 RETURN scan || jsonb_build_object('threat_level',level,'consecutive_failures',health.failures,'healthy_checks',health.healthy);
END $$;
REVOKE ALL ON FUNCTION public.auto_lockdown_if_unhealthy() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.auto_lockdown_if_unhealthy() TO service_role;
SELECT cron.schedule('health-scan-auto','*/2 * * * *','SELECT public.auto_lockdown_if_unhealthy();');