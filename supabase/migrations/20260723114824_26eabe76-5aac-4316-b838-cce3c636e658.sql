
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Helper: insert an uptime check and fire alert if 3 consecutive fails
CREATE OR REPLACE FUNCTION public.record_uptime_check(_status_code int, _latency_ms int, _ok boolean, _error text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_fails int;
BEGIN
  INSERT INTO public.uptime_checks (status_code, latency_ms, ok, error_message)
  VALUES (_status_code, _latency_ms, _ok, _error);

  IF NOT _ok THEN
    SELECT count(*) INTO recent_fails
    FROM (SELECT ok FROM public.uptime_checks ORDER BY checked_at DESC LIMIT 3) t
    WHERE ok = false;

    IF recent_fails >= 3 THEN
      -- Log critical to activity_log so admin-alert-monitor + Discord picks it up
      INSERT INTO public.activity_log (action, meta, is_admin_event)
      VALUES (
        'app.critical',
        jsonb_build_object(
          'message', 'Svetainė neatsako — 3 patikros iš eilės nepavyko',
          'source', 'uptime.monitor',
          'path', '/api/public/health',
          'severity', 'critical',
          'status_code', _status_code,
          'error', _error,
          'fingerprint', 'uptime:site-down'
        ),
        true
      );
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.record_uptime_check(int, int, boolean, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_uptime_check(int, int, boolean, text) TO service_role;

-- Cron job: ping health endpoint every 60s
-- Uses pg_net async request; result is fire-and-forget (we log via net.http_get response check pattern)
-- Simple version: log the request status directly.
SELECT cron.unschedule('uptime-ping-health') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'uptime-ping-health');

SELECT cron.schedule(
  'uptime-ping-health',
  '* * * * *',  -- every minute
  $$
  WITH ping AS (
    SELECT
      net.http_get(
        url := 'https://socialinesvalandos.dev/api/public/health',
        timeout_milliseconds := 5000
      ) AS request_id,
      clock_timestamp() AS started
  )
  INSERT INTO public.uptime_checks (status_code, latency_ms, ok, error_message)
  SELECT NULL, NULL, false, 'ping scheduled: ' || (SELECT request_id::text FROM ping)
  WHERE false;  -- dummy; real result recorded by response handler below
  $$
);

-- Reliable path: use a synchronous cron that fetches response and records it.
-- We rewrite using a plpgsql block that awaits net response via _http_response table.
SELECT cron.unschedule('uptime-record-results') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'uptime-record-results');

SELECT cron.schedule(
  'uptime-record-results',
  '* * * * *',  -- every minute, after ping
  $$
  DO $body$
  DECLARE
    r RECORD;
    latency int;
    ok boolean;
  BEGIN
    -- Fire a fresh sync-ish check using pg_net and read response
    PERFORM net.http_get(
      url := 'https://socialinesvalandos.dev/api/public/health',
      timeout_milliseconds := 5000
    );
    -- Wait briefly for the response to land
    PERFORM pg_sleep(2);
    -- Grab the most recent response for our health URL
    SELECT status_code, (EXTRACT(EPOCH FROM (created - NOW() + INTERVAL '3 seconds')) * 1000)::int AS latency_ms
    INTO r
    FROM net._http_response
    WHERE created > NOW() - INTERVAL '5 seconds'
    ORDER BY created DESC
    LIMIT 1;

    IF r.status_code IS NULL THEN
      PERFORM public.record_uptime_check(NULL, NULL, false, 'no response');
    ELSE
      ok := r.status_code >= 200 AND r.status_code < 400;
      PERFORM public.record_uptime_check(r.status_code, GREATEST(0, r.latency_ms), ok, NULL);
    END IF;
  END;
  $body$;
  $$
);

-- Purge cron: run daily at 3:15
SELECT cron.unschedule('monitoring-daily-purge') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'monitoring-daily-purge');
SELECT cron.schedule(
  'monitoring-daily-purge',
  '15 3 * * *',
  $$SELECT public.purge_monitoring_data();$$
);
