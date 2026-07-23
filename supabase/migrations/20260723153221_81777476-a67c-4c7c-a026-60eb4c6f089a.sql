DELETE FROM public.activity_log
WHERE action IN ('page.view','auth.signed_in','auth.signed_out','route.404')
  AND (
    coalesce(meta->>'ref_host','') ILIKE '%lovable%'
    OR coalesce(meta->>'ua','') ILIKE '%HeadlessChrome%'
    OR coalesce(meta->>'ua','') ILIKE '%bot%'
    OR coalesce(meta->>'tz','') = ''
  );