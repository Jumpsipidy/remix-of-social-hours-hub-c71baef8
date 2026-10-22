DO $$ BEGIN
 IF public.classify_lockdown_health(NULL) <> 'unknown' THEN RAISE EXCEPTION 'Missing status must fail closed'; END IF;
 IF public.classify_lockdown_health('{"checks":[]}'::jsonb) <> 'unknown' THEN RAISE EXCEPTION 'Empty status must fail closed'; END IF;
 IF public.classify_lockdown_health('{"checks":[{"label":"profiles reachable","ok":false,"critical":true}]}'::jsonb) <> 'technical' THEN RAISE EXCEPTION 'Technical failure classification'; END IF;
 IF public.classify_lockdown_health('{"checks":[{"label":"RLS: profiles","ok":false,"critical":true}]}'::jsonb) <> 'security' THEN RAISE EXCEPTION 'Security failure classification'; END IF;
 IF public.classify_lockdown_health('{"checks":[{"label":"messages reachable","ok":false,"critical":false}]}'::jsonb) <> 'healthy' THEN RAISE EXCEPTION 'Warnings must not lock'; END IF;
 IF public.classify_lockdown_health('{"checks":[{"label":"profiles reachable","ok":true,"critical":true}]}'::jsonb) <> 'healthy' THEN RAISE EXCEPTION 'Healthy classification'; END IF;
 IF public.classify_lockdown_health('{"checks":[{"label":"profiles reachable","ok":"true","critical":true}]}'::jsonb) <> 'unknown' THEN RAISE EXCEPTION 'Malformed status must fail closed'; END IF;
END $$;