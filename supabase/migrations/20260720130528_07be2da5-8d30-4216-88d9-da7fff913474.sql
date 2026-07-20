
-- =============================================================================
-- 1. Fix activity_log so it can actually receive traffic
-- =============================================================================
ALTER TABLE public.activity_log ALTER COLUMN user_id DROP NOT NULL;

-- Grant missing permissions (this is the root cause of empty analytics).
GRANT INSERT ON public.activity_log TO anon;
GRANT INSERT, SELECT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;

-- Refresh policies to be explicit and correct
DROP POLICY IF EXISTS "activity_log anon page views" ON public.activity_log;
DROP POLICY IF EXISTS "activity_log insert self" ON public.activity_log;
DROP POLICY IF EXISTS "activity_log select own or admin" ON public.activity_log;

CREATE POLICY "activity_log anon insert page views"
  ON public.activity_log FOR INSERT TO anon
  WITH CHECK (user_id IS NULL AND action IN ('page.view'));

CREATE POLICY "activity_log authenticated insert own"
  ON public.activity_log FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "activity_log select own or admin"
  ON public.activity_log FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- =============================================================================
-- 2. Auto-flag admin traffic so it's easy to exclude
-- =============================================================================
ALTER TABLE public.activity_log
  ADD COLUMN IF NOT EXISTS is_admin_event boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.tg_activity_log_flag_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_path text := coalesce(NEW.meta->>'path','');
  v_is_admin boolean := false;
BEGIN
  IF v_path LIKE '/admin%' THEN
    v_is_admin := true;
  ELSIF NEW.user_id IS NOT NULL AND public.has_role(NEW.user_id, 'admin') THEN
    v_is_admin := true;
  END IF;
  NEW.is_admin_event := v_is_admin;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS activity_log_flag_admin ON public.activity_log;
CREATE TRIGGER activity_log_flag_admin
  BEFORE INSERT ON public.activity_log
  FOR EACH ROW EXECUTE FUNCTION public.tg_activity_log_flag_admin();

-- Backfill flag for existing rows
UPDATE public.activity_log a
   SET is_admin_event = true
 WHERE (coalesce(a.meta->>'path','') LIKE '/admin%')
    OR (a.user_id IS NOT NULL AND public.has_role(a.user_id, 'admin'));

-- =============================================================================
-- 3. Indexes tuned for the analytics RPC
-- =============================================================================
CREATE INDEX IF NOT EXISTS activity_log_is_admin_idx
  ON public.activity_log (is_admin_event, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_device_idx
  ON public.activity_log ((meta ->> 'device'));
CREATE INDEX IF NOT EXISTS activity_log_browser_idx
  ON public.activity_log ((meta ->> 'browser'));
CREATE INDEX IF NOT EXISTS activity_log_os_idx
  ON public.activity_log ((meta ->> 'os'));
CREATE INDEX IF NOT EXISTS activity_log_ref_host_idx
  ON public.activity_log ((meta ->> 'ref_host'));

-- =============================================================================
-- 4. Ensure analytics RPCs are callable by authenticated users
--    (RPC itself checks has_role(admin) internally.)
-- =============================================================================
GRANT EXECUTE ON FUNCTION public.admin_analytics_v2(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_recent_activity(int) TO authenticated;

-- =============================================================================
-- 5. Google Search Console: storage for future integration
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.gsc_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_url text NOT NULL UNIQUE,
  label text,
  connected boolean NOT NULL DEFAULT false,
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.gsc_properties TO authenticated;
GRANT ALL ON public.gsc_properties TO service_role;
ALTER TABLE public.gsc_properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gsc_properties admin all" ON public.gsc_properties;
CREATE POLICY "gsc_properties admin all"
  ON public.gsc_properties FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.gsc_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.gsc_properties(id) ON DELETE CASCADE,
  date date NOT NULL,
  clicks int NOT NULL DEFAULT 0,
  impressions int NOT NULL DEFAULT 0,
  ctr numeric(6,4) NOT NULL DEFAULT 0,
  position numeric(6,2) NOT NULL DEFAULT 0,
  top_query text,
  top_page text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(property_id, date)
);

GRANT SELECT ON public.gsc_daily TO authenticated;
GRANT ALL ON public.gsc_daily TO service_role;
ALTER TABLE public.gsc_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gsc_daily admin all" ON public.gsc_daily;
CREATE POLICY "gsc_daily admin all"
  ON public.gsc_daily FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS gsc_daily_property_date_idx
  ON public.gsc_daily (property_id, date DESC);

-- =============================================================================
-- 6. Analytics helpers for super admin (prune / reset)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.analytics_prune(_days int DEFAULT 180)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  DELETE FROM public.activity_log
   WHERE created_at < now() - make_interval(days => greatest(_days, 7));
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END; $$;

CREATE OR REPLACE FUNCTION public.analytics_reset()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  DELETE FROM public.activity_log;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END; $$;

GRANT EXECUTE ON FUNCTION public.analytics_prune(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_reset() TO authenticated;

-- =============================================================================
-- 7. Rebuild admin_analytics_v2 to use the new is_admin_event flag
--    (fastere, and admin filtering happens on an indexed boolean).
-- =============================================================================
CREATE OR REPLACE FUNCTION public.admin_analytics_v2(_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _caller uuid := auth.uid();
  _since timestamptz := now() - make_interval(days => _days);
  _prev_since timestamptz := now() - make_interval(days => _days * 2);
  result jsonb;
  admin_events bigint;
BEGIN
  IF NOT public.has_role(_caller,'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  WITH raw AS (
    SELECT a.*,
           coalesce(a.meta->>'path','/') AS path,
           coalesce(a.meta->>'session_id', a.meta->>'anon', a.user_id::text, a.id::text) AS sid,
           coalesce(nullif(a.meta->>'device',''),'unknown') AS device,
           coalesce(nullif(a.meta->>'browser',''),'unknown') AS browser,
           coalesce(nullif(a.meta->>'os',''),'unknown') AS os,
           coalesce(nullif(a.meta->>'lang',''),'—') AS lang,
           coalesce(nullif(a.meta->>'ref_host',''),'(direct)') AS ref_host
    FROM public.activity_log a
    WHERE a.created_at >= _since
      AND a.action IN ('page.view','auth.signed_in','auth.signed_out')
  ),
  events AS (SELECT * FROM raw WHERE is_admin_event = false),
  admin_hits AS (SELECT count(*)::bigint AS n FROM raw WHERE is_admin_event = true),
  prev AS (
    SELECT
      count(*) FILTER (WHERE action='page.view')::bigint AS views,
      count(DISTINCT coalesce(a.meta->>'session_id', a.meta->>'anon', a.user_id::text, a.id::text))
        FILTER (WHERE action='page.view')::bigint AS uniques,
      count(*) FILTER (WHERE action='auth.signed_in')::bigint AS signins,
      count(*) FILTER (WHERE action='auth.signed_out')::bigint AS signouts
    FROM public.activity_log a
    WHERE a.created_at >= _prev_since AND a.created_at < _since
      AND a.action IN ('page.view','auth.signed_in','auth.signed_out')
      AND is_admin_event = false
  ),
  day_series AS (
    SELECT to_char(d::date,'YYYY-MM-DD') AS d
    FROM generate_series((now()::date - (_days - 1)), now()::date, interval '1 day') d
  ),
  daily AS (
    SELECT to_char(created_at::date,'YYYY-MM-DD') AS d,
           count(*) FILTER (WHERE action='page.view') AS views,
           count(DISTINCT sid) FILTER (WHERE action='page.view') AS uniques,
           count(*) FILTER (WHERE action='auth.signed_in') AS signins,
           count(*) FILTER (WHERE action='auth.signed_out') AS signouts
    FROM events GROUP BY 1
  ),
  hourly AS (
    SELECT extract(hour FROM created_at)::int AS h,
           count(*) FILTER (WHERE action='page.view') AS views,
           count(*) FILTER (WHERE action='auth.signed_in') AS signins,
           count(DISTINCT sid) FILTER (WHERE action='page.view') AS uniques
    FROM events GROUP BY 1
  ),
  wd AS (
    SELECT extract(dow FROM created_at)::int AS w,
           count(*) FILTER (WHERE action='page.view') AS views
    FROM events GROUP BY 1
  ),
  pages AS (
    SELECT path, count(*) AS n, count(DISTINCT sid) AS u
    FROM events WHERE action='page.view'
    GROUP BY 1 ORDER BY n DESC LIMIT 15
  ),
  dev AS (SELECT device, count(*) AS n FROM events WHERE action='page.view' GROUP BY 1 ORDER BY n DESC),
  brw AS (SELECT browser, count(*) AS n FROM events WHERE action='page.view' GROUP BY 1 ORDER BY n DESC LIMIT 12),
  osk AS (SELECT os, count(*) AS n FROM events WHERE action='page.view' GROUP BY 1 ORDER BY n DESC LIMIT 12),
  refs AS (SELECT ref_host AS host, count(*) AS n FROM events WHERE action='page.view' GROUP BY 1 ORDER BY n DESC LIMIT 12),
  langs AS (SELECT lang, count(*) AS n FROM events WHERE action='page.view' GROUP BY 1 ORDER BY n DESC LIMIT 12),
  totals AS (
    SELECT
      count(*) FILTER (WHERE action='page.view')::bigint AS views,
      count(DISTINCT sid) FILTER (WHERE action='page.view')::bigint AS uniques,
      count(*) FILTER (WHERE action='auth.signed_in')::bigint AS signins,
      count(*) FILTER (WHERE action='auth.signed_out')::bigint AS signouts,
      count(DISTINCT sid)::bigint AS sessions,
      count(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)::bigint AS signed_in_users
    FROM events
  ),
  active AS (
    SELECT count(DISTINCT sid)::bigint AS n
    FROM events WHERE created_at >= now() - interval '5 minutes' AND action='page.view'
  )
  SELECT jsonb_build_object(
    'generated_at', now(),
    'range_days', _days,
    'totals', (SELECT to_jsonb(t) FROM totals t),
    'prev_totals', (SELECT to_jsonb(p) FROM prev p),
    'active_now', (SELECT n FROM active),
    'admin_hidden_events', (SELECT n FROM admin_hits),
    'daily', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'd', ds.d,
        'views', coalesce(d.views,0),
        'uniques', coalesce(d.uniques,0),
        'signins', coalesce(d.signins,0),
        'signouts', coalesce(d.signouts,0)
      ) ORDER BY ds.d), '[]'::jsonb)
      FROM day_series ds LEFT JOIN daily d ON d.d = ds.d
    ),
    'hourly', (SELECT coalesce(jsonb_agg(to_jsonb(h) ORDER BY h.h),'[]'::jsonb) FROM hourly h),
    'weekday', (SELECT coalesce(jsonb_agg(to_jsonb(w) ORDER BY w.w),'[]'::jsonb) FROM wd w),
    'top_pages', (SELECT coalesce(jsonb_agg(jsonb_build_object('path',path,'n',n,'u',u) ORDER BY n DESC),'[]'::jsonb) FROM pages),
    'devices', (SELECT coalesce(jsonb_agg(jsonb_build_object('device',device,'n',n) ORDER BY n DESC),'[]'::jsonb) FROM dev),
    'browsers', (SELECT coalesce(jsonb_agg(jsonb_build_object('browser',browser,'n',n) ORDER BY n DESC),'[]'::jsonb) FROM brw),
    'os', (SELECT coalesce(jsonb_agg(jsonb_build_object('os',os,'n',n) ORDER BY n DESC),'[]'::jsonb) FROM osk),
    'referrers', (SELECT coalesce(jsonb_agg(jsonb_build_object('host',host,'n',n) ORDER BY n DESC),'[]'::jsonb) FROM refs),
    'languages', (SELECT coalesce(jsonb_agg(jsonb_build_object('lang',lang,'n',n) ORDER BY n DESC),'[]'::jsonb) FROM langs)
  ) INTO result;

  RETURN result;
END; $$;

GRANT EXECUTE ON FUNCTION public.admin_analytics_v2(int) TO authenticated;

-- =============================================================================
-- 8. Rebuild admin_recent_activity too (join profiles for name/role)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.admin_recent_activity(_limit int DEFAULT 80)
RETURNS TABLE (
  id uuid, created_at timestamptz, action text, user_id uuid,
  path text, device text, browser text, os text, ref_host text, lang text,
  user_name text, user_role text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.created_at, a.action, a.user_id,
    coalesce(a.meta->>'path','/'),
    coalesce(nullif(a.meta->>'device',''),'unknown'),
    coalesce(nullif(a.meta->>'browser',''),'unknown'),
    coalesce(nullif(a.meta->>'os',''),'unknown'),
    coalesce(nullif(a.meta->>'ref_host',''),'(direct)'),
    coalesce(nullif(a.meta->>'lang',''),'—'),
    p.full_name, p.role::text
  FROM public.activity_log a
  LEFT JOIN public.profiles p ON p.id = a.user_id
  WHERE public.has_role(auth.uid(),'admin')
    AND a.is_admin_event = false
    AND a.action IN ('page.view','auth.signed_in','auth.signed_out')
  ORDER BY a.created_at DESC
  LIMIT least(greatest(_limit, 1), 500)
$$;

GRANT EXECUTE ON FUNCTION public.admin_recent_activity(int) TO authenticated;

-- =============================================================================
-- 9. pg_cron: keep the log lean (last 180 days)
-- =============================================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'analytics_prune_daily';
    PERFORM cron.schedule('analytics_prune_daily', '17 3 * * *',
      $cron$ SELECT public.analytics_prune(180); $cron$);
  END IF;
END $$;
