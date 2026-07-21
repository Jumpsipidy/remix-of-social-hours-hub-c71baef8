# SQL Reference — Admin Jobs & Utilities

All SQL below is safe to run inside your Supabase project. Everything is idempotent (uses `IF EXISTS` / `OR REPLACE`) and scoped to `public`.

---

## 1. Threshold tuning — auto-lockdown

The auto-lockdown threshold is now **2 critical errors within 5 minutes** (was 3).
This is enforced in the server function `escalateAppError`, not in SQL. If you want to also enforce it via `pg_cron`, use this reactive scan:

```sql
CREATE OR REPLACE FUNCTION public.tick_auto_lockdown()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE crit INT;
BEGIN
  SELECT count(*) INTO crit FROM public.activity_log
   WHERE action = 'app.critical'
     AND user_id IS NOT NULL
     AND created_at > now() - interval '5 minutes';
  IF crit >= 2 THEN
    INSERT INTO public.site_settings (id, lockdown_enabled, lockdown_code, lockdown_message, updated_at)
    VALUES (true, true, 'E-5001',
      '[auto] Aptikta '||crit||' kritinių klaidų per 5 min. Prieiga ribojama.', now())
    ON CONFLICT (id) DO UPDATE SET
      lockdown_enabled = true, lockdown_code = 'E-5001',
      lockdown_message = EXCLUDED.lockdown_message, updated_at = now()
    WHERE site_settings.lockdown_enabled = false;
  END IF;
END $$;

-- optional cron (every minute)
-- SELECT cron.schedule('auto-lockdown-tick', '* * * * *', $$SELECT public.tick_auto_lockdown();$$);
```

---

## 2. Admin table inspection (drill-down from /admin/tools)

The `adminTableSample` server function accepts a table name and returns rows.
No new SQL is needed — it uses `supabaseAdmin` (service_role) which bypasses RLS.

Allowed tables (whitelist enforced in TS):
`profiles, reservations, tasks, messages, chat_rooms, schools, bug_reports, organization_access_requests, site_settings, activity_log, certificates, dm_messages, dm_rooms, friendships, user_achievements`.

---

## 3. Deep health scan

Runs from `/admin/tools` via `adminDeepHealth`. Also available as SQL:

```sql
-- Row counts + latency probe per critical table
SELECT relname AS table,
       n_live_tup AS approx_rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- Recent 24h critical errors
SELECT count(*) FROM public.activity_log
WHERE action = 'app.critical' AND created_at > now() - interval '24 hours';
```

---

## 4. Message purge (12-day retention)

Already installed as `public.purge_old_messages()`. Cron it:

```sql
SELECT cron.schedule('purge-messages-12d', '0 3 * * *', $$SELECT public.purge_old_messages();$$);
SELECT cron.schedule('purge-dms-2d',       '0 3 * * *', $$SELECT public.purge_dm_messages();$$);
```

---

## 5. Wipe / reset helpers (super-admin only, DANGER)

These live in server functions, but the raw SQL equivalents are:

```sql
DELETE FROM public.reservations;
DELETE FROM public.tasks;
DELETE FROM public.messages WHERE created_at < now() - interval '12 days';
```

---

## 6. Orphan-user cleanup

Auth users without a `profiles` row (created via OAuth before trigger existed):

```sql
SELECT u.id, u.email, u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;
```

`/admin/manage` now shows these merged with real profiles. Deleting them from
the UI removes both the auth row and any references.

---

## 7. Analytics reset / prune

```sql
SELECT public.analytics_prune(180);   -- delete rows older than 180 days
SELECT public.analytics_reset();      -- nuke everything (admin only)
```

---

## 8. Certificate revocation

```sql
SELECT public.revoke_certificate('ABC123', 'issued in error');
SELECT public.verify_certificate('ABC123');
```
