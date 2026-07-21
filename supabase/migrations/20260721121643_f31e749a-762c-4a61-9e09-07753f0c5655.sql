
CREATE OR REPLACE FUNCTION public.admin_analytics_v2(_days integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _caller uuid := auth.uid();
  _since timestamptz := now() - make_interval(days => _days);
  _prev_since timestamptz := now() - make_interval(days => _days * 2);
  result jsonb;
BEGIN
  IF NOT public.has_role(_caller,'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  WITH raw AS (
    SELECT a.*,
           coalesce(a.meta->>'path','/') AS path,
           -- session key: per-tab visits
           coalesce(a.meta->>'session_id', a.meta->>'anon', a.user_id::text, a.id::text) AS sid,
           -- visitor key: per-device dedup (localStorage). Falls back to a
           -- device fingerprint so pre-visitor_id rows still dedup sanely.
           coalesce(
             nullif(a.meta->>'visitor_id',''),
             'fp:'||coalesce(nullif(a.meta->>'device',''),'?')
                 ||'|'||coalesce(nullif(a.meta->>'browser',''),'?')
                 ||'|'||coalesce(nullif(a.meta->>'os',''),'?')
                 ||'|'||coalesce(nullif(a.meta->>'tz',''),'?')
                 ||'|'||coalesce(nullif(a.meta->>'lang',''),'?')
                 ||'|'||coalesce(nullif(a.meta->>'screen',''),'?')
           ) AS vid,
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
      count(DISTINCT coalesce(
        nullif(a.meta->>'visitor_id',''),
        'fp:'||coalesce(nullif(a.meta->>'device',''),'?')
            ||'|'||coalesce(nullif(a.meta->>'browser',''),'?')
            ||'|'||coalesce(nullif(a.meta->>'os',''),'?')
            ||'|'||coalesce(nullif(a.meta->>'tz',''),'?')
            ||'|'||coalesce(nullif(a.meta->>'lang',''),'?')
            ||'|'||coalesce(nullif(a.meta->>'screen',''),'?')
      )) FILTER (WHERE action='page.view')::bigint AS uniques,
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
           count(DISTINCT vid) FILTER (WHERE action='page.view') AS uniques,
           count(*) FILTER (WHERE action='auth.signed_in') AS signins,
           count(*) FILTER (WHERE action='auth.signed_out') AS signouts
    FROM events GROUP BY 1
  ),
  hourly AS (
    SELECT extract(hour FROM created_at)::int AS h,
           count(*) FILTER (WHERE action='page.view') AS views,
           count(*) FILTER (WHERE action='auth.signed_in') AS signins,
           count(DISTINCT vid) FILTER (WHERE action='page.view') AS uniques
    FROM events GROUP BY 1
  ),
  wd AS (
    SELECT extract(dow FROM created_at)::int AS w,
           count(*) FILTER (WHERE action='page.view') AS views
    FROM events GROUP BY 1
  ),
  pages AS (
    SELECT path, count(*) AS n, count(DISTINCT vid) AS u
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
      count(DISTINCT vid) FILTER (WHERE action='page.view')::bigint AS uniques,
      count(*) FILTER (WHERE action='auth.signed_in')::bigint AS signins,
      count(*) FILTER (WHERE action='auth.signed_out')::bigint AS signouts,
      count(DISTINCT sid)::bigint AS sessions,
      count(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)::bigint AS signed_in_users
    FROM events
  ),
  active AS (
    SELECT count(DISTINCT vid)::bigint AS n
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
END; $function$;
