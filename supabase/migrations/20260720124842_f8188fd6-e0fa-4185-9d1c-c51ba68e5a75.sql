
-- Indexes for high-volume analytics reads
CREATE INDEX IF NOT EXISTS activity_log_created_at_desc_idx ON public.activity_log (created_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_action_created_idx ON public.activity_log (action, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_user_created_idx ON public.activity_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_path_idx ON public.activity_log ((meta->>'path'));
CREATE INDEX IF NOT EXISTS activity_log_session_idx ON public.activity_log ((meta->>'session_id'));

-- Realtime for live dashboard
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_log;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ================================================================
-- ADVANCED ANALYTICS RPC — server-computed, admin-filtered
-- ================================================================
CREATE OR REPLACE FUNCTION public.admin_analytics_v2(_days int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _since timestamptz := now() - make_interval(days => _days);
  _prev_since timestamptz := now() - make_interval(days => _days * 2);
  result jsonb;
  admin_events bigint;
BEGIN
  IF NOT public.has_role(_caller, 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Base filtered event set: exclude admin users + /admin routes.
  -- Kept in a CTE-like temp view via WITH clause in each aggregate below.
  WITH admin_ids AS (
    SELECT id FROM public.profiles WHERE role = 'admin'
  ),
  raw AS (
    SELECT a.*,
           lower(coalesce(a.meta->>'ua','')) AS ua,
           coalesce(a.meta->>'path','/') AS path,
           coalesce(a.meta->>'session_id', a.meta->>'anon', a.user_id::text, a.id::text) AS sid,
           coalesce(a.meta->>'device','unknown') AS device,
           coalesce(a.meta->>'browser','unknown') AS browser,
           coalesce(a.meta->>'os','unknown') AS os,
           coalesce(a.meta->>'lang','') AS lang,
           coalesce(a.meta->>'ref_host','') AS ref_host,
           coalesce(a.meta->>'screen','') AS screen
    FROM public.activity_log a
    WHERE a.created_at >= _since
      AND a.action IN ('page.view','auth.signed_in','auth.signed_out')
  ),
  events AS (
    SELECT r.*
    FROM raw r
    WHERE r.user_id IS NULL OR r.user_id NOT IN (SELECT id FROM admin_ids)
  ),
  events_no_admin_path AS (
    SELECT * FROM events WHERE path NOT LIKE '/admin%'
  ),
  admin_hits AS (
    SELECT count(*)::bigint AS n
    FROM raw
    WHERE (user_id IN (SELECT id FROM admin_ids)) OR path LIKE '/admin%'
  ),
  -- previous period totals (for delta %)
  prev AS (
    SELECT
      count(*) FILTER (WHERE action='page.view')::bigint AS views,
      count(DISTINCT sid) FILTER (WHERE action='page.view')::bigint AS uniques,
      count(*) FILTER (WHERE action='auth.signed_in')::bigint AS signins,
      count(*) FILTER (WHERE action='auth.signed_out')::bigint AS signouts
    FROM public.activity_log a
    CROSS JOIN LATERAL (
      SELECT coalesce(a.meta->>'session_id', a.meta->>'anon', a.user_id::text, a.id::text) AS sid,
             coalesce(a.meta->>'path','/') AS path
    ) x
    WHERE a.created_at >= _prev_since AND a.created_at < _since
      AND a.action IN ('page.view','auth.signed_in','auth.signed_out')
      AND (a.user_id IS NULL OR a.user_id NOT IN (SELECT id FROM admin_ids))
      AND x.path NOT LIKE '/admin%'
  ),
  -- daily series
  day_series AS (
    SELECT to_char(d::date,'YYYY-MM-DD') AS d
    FROM generate_series((now()::date - (_days - 1)), now()::date, interval '1 day') d
  ),
  daily AS (
    SELECT
      to_char(e.created_at::date,'YYYY-MM-DD') AS d,
      count(*) FILTER (WHERE action='page.view') AS views,
      count(DISTINCT sid) FILTER (WHERE action='page.view') AS uniques,
      count(*) FILTER (WHERE action='auth.signed_in') AS signins,
      count(*) FILTER (WHERE action='auth.signed_out') AS signouts
    FROM events_no_admin_path e
    GROUP BY 1
  ),
  hourly AS (
    SELECT extract(hour FROM created_at)::int AS h,
           count(*) FILTER (WHERE action='page.view') AS views,
           count(*) FILTER (WHERE action='auth.signed_in') AS signins,
           count(DISTINCT sid) FILTER (WHERE action='page.view') AS uniques
    FROM events_no_admin_path
    GROUP BY 1
  ),
  wd AS (
    SELECT extract(dow FROM created_at)::int AS w,
           count(*) FILTER (WHERE action='page.view') AS views
    FROM events_no_admin_path
    GROUP BY 1
  ),
  pages AS (
    SELECT path, count(*) AS n, count(DISTINCT sid) AS u
    FROM events_no_admin_path
    WHERE action='page.view'
    GROUP BY 1
    ORDER BY 2 DESC
    LIMIT 20
  ),
  devices AS (
    SELECT device, count(*) AS n
    FROM events_no_admin_path
    WHERE action='page.view'
    GROUP BY 1 ORDER BY 2 DESC
  ),
  browsers AS (
    SELECT browser, count(*) AS n
    FROM events_no_admin_path
    WHERE action='page.view'
    GROUP BY 1 ORDER BY 2 DESC LIMIT 10
  ),
  oses AS (
    SELECT os, count(*) AS n
    FROM events_no_admin_path
    WHERE action='page.view'
    GROUP BY 1 ORDER BY 2 DESC LIMIT 10
  ),
  refs AS (
    SELECT coalesce(nullif(ref_host,''),'(direct)') AS host, count(*) AS n
    FROM events_no_admin_path
    WHERE action='page.view'
    GROUP BY 1 ORDER BY 2 DESC LIMIT 10
  ),
  langs AS (
    SELECT coalesce(nullif(lang,''),'(nežinoma)') AS lang, count(*) AS n
    FROM events_no_admin_path
    WHERE action='page.view'
    GROUP BY 1 ORDER BY 2 DESC LIMIT 10
  ),
  totals AS (
    SELECT
      count(*) FILTER (WHERE action='page.view')::bigint AS views,
      count(DISTINCT sid) FILTER (WHERE action='page.view')::bigint AS uniques,
      count(*) FILTER (WHERE action='auth.signed_in')::bigint AS signins,
      count(*) FILTER (WHERE action='auth.signed_out')::bigint AS signouts,
      count(DISTINCT sid) AS sessions,
      count(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) AS signed_in_users
    FROM events_no_admin_path
  ),
  active_now AS (
    SELECT count(DISTINCT sid) AS n
    FROM events_no_admin_path
    WHERE created_at >= now() - interval '5 minutes'
  )
  SELECT jsonb_build_object(
    'generated_at', now(),
    'range_days', _days,
    'totals', (SELECT to_jsonb(t) FROM totals t),
    'prev_totals', (SELECT to_jsonb(p) FROM prev p),
    'active_now', (SELECT n FROM active_now),
    'admin_hidden_events', (SELECT n FROM admin_hits),
    'daily', (
      SELECT jsonb_agg(jsonb_build_object(
        'd', s.d,
        'views', coalesce(dv.views,0),
        'uniques', coalesce(dv.uniques,0),
        'signins', coalesce(dv.signins,0),
        'signouts', coalesce(dv.signouts,0)
      ) ORDER BY s.d)
      FROM day_series s LEFT JOIN daily dv ON dv.d = s.d
    ),
    'hourly', (SELECT jsonb_agg(to_jsonb(h) ORDER BY h.h) FROM hourly h),
    'weekday', (SELECT jsonb_agg(to_jsonb(w) ORDER BY w.w) FROM wd w),
    'top_pages', (SELECT jsonb_agg(to_jsonb(p)) FROM pages p),
    'devices', (SELECT jsonb_agg(to_jsonb(d)) FROM devices d),
    'browsers', (SELECT jsonb_agg(to_jsonb(b)) FROM browsers b),
    'os', (SELECT jsonb_agg(to_jsonb(o)) FROM oses o),
    'referrers', (SELECT jsonb_agg(to_jsonb(r)) FROM refs r),
    'languages', (SELECT jsonb_agg(to_jsonb(l)) FROM langs l)
  ) INTO result;

  RETURN result;
END; $$;

REVOKE ALL ON FUNCTION public.admin_analytics_v2(int) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_analytics_v2(int) TO authenticated;

-- Live feed
CREATE OR REPLACE FUNCTION public.admin_recent_activity(_limit int DEFAULT 60)
RETURNS TABLE(
  id uuid, created_at timestamptz, action text, user_id uuid,
  path text, device text, browser text, os text, ref_host text, lang text,
  user_name text, user_role text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT a.id, a.created_at, a.action, a.user_id,
         coalesce(a.meta->>'path','/'),
         coalesce(a.meta->>'device','unknown'),
         coalesce(a.meta->>'browser','unknown'),
         coalesce(a.meta->>'os','unknown'),
         coalesce(a.meta->>'ref_host',''),
         coalesce(a.meta->>'lang',''),
         coalesce(p.full_name, p.organization_name, p.email),
         p.role::text
  FROM public.activity_log a
  LEFT JOIN public.profiles p ON p.id = a.user_id
  WHERE public.has_role(auth.uid(), 'admin')
    AND (p.role IS NULL OR p.role <> 'admin')
    AND coalesce(a.meta->>'path','/') NOT LIKE '/admin%'
  ORDER BY a.created_at DESC
  LIMIT greatest(1, least(_limit, 500));
$$;

REVOKE ALL ON FUNCTION public.admin_recent_activity(int) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_recent_activity(int) TO authenticated;
