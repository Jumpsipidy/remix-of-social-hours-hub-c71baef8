# Analytics v3 — SQL Reference

**Svarbu tavo dabartinei klaidai:** jei konsolėje matai
`record "new" has no field "is_admin_event"` arba `column activity_log.is_admin_event does not exist`,
reiškia tavo production DB turi triggerį, bet neturi pačio stulpelio. Paleisk šitą trumpą fix'ą:

```sql
alter table public.activity_log
  add column if not exists is_admin_event boolean not null default false;

create index if not exists activity_log_admin_event_idx
  on public.activity_log (is_admin_event, created_at desc);

update public.activity_log
set is_admin_event = true
where is_admin_event = false
  and coalesce(meta->>'path', '') like '/admin%';

create or replace function public.tg_activity_log_flag_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_path text := coalesce(new.meta->>'path','');
begin
  new.is_admin_event := v_path like '/admin%';
  return new;
end $$;

drop trigger if exists tg_activity_log_flag_admin on public.activity_log;
create trigger tg_activity_log_flag_admin
  before insert on public.activity_log
  for each row execute function public.tg_activity_log_flag_admin();

notify pgrst, 'reload schema';
```

Po to perkrauk svetainę ir atsidaryk ne `/admin` puslapį — `activity_log` 400 klaida turi dingti.

---

Jei jau paleidai visas ankstesnes analytics migracijas
(`activity_log`, `admin_analytics_v2`, `admin_recent_activity`,
`tg_activity_log_flag_admin`), daugiau nieko nereikia.
V3 dashboardas naudoja tuos pačius duomenis ir RPC.

If you're starting from scratch or want to re-verify, this is the complete,
idempotent SQL. Run it in the Supabase SQL editor as `postgres`.

---

## 1. Base table

```sql
create table if not exists public.activity_log (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete set null,
  action       text not null,           -- 'page.view' | 'auth.signed_in' | 'auth.signed_out' | custom
  meta         jsonb not null default '{}'::jsonb,
  is_admin_event boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists activity_log_created_at_idx
  on public.activity_log (created_at desc);

create index if not exists activity_log_action_created_idx
  on public.activity_log (action, created_at desc);

create index if not exists activity_log_user_id_idx
  on public.activity_log (user_id) where user_id is not null;

create index if not exists activity_log_session_idx
  on public.activity_log ((meta->>'session_id'));

create index if not exists activity_log_path_idx
  on public.activity_log ((meta->>'path'));
```

## 2. Grants (CRITICAL — no data flows without these)

```sql
grant select, insert on public.activity_log to authenticated;
grant insert         on public.activity_log to anon;
grant all            on public.activity_log to service_role;
```

## 3. RLS

```sql
alter table public.activity_log enable row level security;

drop policy if exists "anon inserts" on public.activity_log;
create policy "anon inserts"
  on public.activity_log for insert to anon
  with check (true);

drop policy if exists "authed inserts" on public.activity_log;
create policy "authed inserts"
  on public.activity_log for insert to authenticated
  with check (true);

drop policy if exists "self or admin reads" on public.activity_log;
create policy "self or admin reads"
  on public.activity_log for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
```

## 4. Admin-event flagging trigger

Any hit on `/admin*` or by an admin user is hidden from analytics totals.

```sql
create or replace function public.tg_activity_log_flag_admin()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_path text := coalesce(new.meta->>'path','');
  v_is_admin boolean := false;
begin
  if v_path like '/admin%' then v_is_admin := true;
  elsif new.user_id is not null and public.has_role(new.user_id, 'admin') then v_is_admin := true;
  end if;
  new.is_admin_event := v_is_admin;
  return new;
end $$;

drop trigger if exists tg_activity_log_flag_admin on public.activity_log;
create trigger tg_activity_log_flag_admin
  before insert on public.activity_log
  for each row execute function public.tg_activity_log_flag_admin();
```

## 5. RPC — `admin_analytics_v2`

The heavy-lifting analytics query (totals, daily, hourly, weekday, top
pages, devices, browsers, OS, referrers, languages, active-now,
prev-period comparison, admin_hidden_events).

Definition already in your DB. Verify with:

```sql
select proname from pg_proc
where proname in ('admin_analytics_v2','admin_recent_activity','has_role');
```

If any is missing, re-run the earlier `SQL-REFERENCE.md` migration.

## 6. Optional — automatic pruning

Keep the log lean. Runs weekly via `pg_cron`:

```sql
select cron.schedule(
  'prune-activity-log',
  '0 4 * * 0',
  $$ delete from public.activity_log where created_at < now() - interval '180 days' $$
);
```

Or run manually as admin:

```sql
select public.analytics_prune(180);
```

## 7. Sanity check queries

```sql
-- Row count
select count(*) from public.activity_log;

-- Last 20 events (admin view)
select created_at, action, meta->>'path' as path, meta->>'device' as device,
       meta->>'browser' as browser, is_admin_event
from public.activity_log
order by created_at desc limit 20;

-- Active public visitors in last 5 minutes
-- Important: this ignores /admin and admin-user traffic, because admin visits
-- are intentionally hidden from analytics totals.
select count(distinct coalesce(meta->>'session_id', user_id::text, id::text)) as active_now
from public.activity_log
where action = 'page.view'
  and created_at > now() - interval '5 minutes'
  and coalesce(is_admin_event, false) = false
  and coalesce(meta->>'path', '') not like '/admin%';

-- If active_now is 0, check whether anything was tracked recently:
select created_at, action, meta->>'path' as path, meta->>'session_id' as session_id, is_admin_event
from public.activity_log
order by created_at desc
limit 10;
```

If `count(*)` is 0, the client is not tracking. Check:
- `<PageViewTracker />` mounted in `__root.tsx`
- Browser console for insert errors
- The three grants in step 2

If the browser console request URL points to a different backend project than
your real project, fix Vercel env variables and redeploy:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
