-- Run with service-role read access; no live settings are modified.
SELECT
 public.classify_lockdown_health(NULL) = 'unknown' AS missing_fails_closed,
 public.classify_lockdown_health('{"checks":[]}'::jsonb) = 'unknown' AS empty_fails_closed,
 public.classify_lockdown_health('{"checks":[{"label":"profiles reachable","ok":false,"critical":true}]}'::jsonb) = 'technical' AS technical_failure,
 public.classify_lockdown_health('{"checks":[{"label":"RLS: profiles","ok":false,"critical":true}]}'::jsonb) = 'security' AS security_failure,
 public.classify_lockdown_health('{"checks":[{"label":"messages reachable","ok":false,"critical":false}]}'::jsonb) = 'healthy' AS warning_does_not_lock,
 public.classify_lockdown_health('{"checks":[{"label":"profiles reachable","ok":true,"critical":true}]}'::jsonb) = 'healthy' AS healthy_recovers,
 public.classify_lockdown_health('{"checks":[{"label":"profiles reachable","ok":"true","critical":true}]}'::jsonb) = 'unknown' AS malformed_fails_closed;