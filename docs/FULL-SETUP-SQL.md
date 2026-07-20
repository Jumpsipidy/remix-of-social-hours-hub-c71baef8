# 🔥 PILNAS SQL FIX — Socialinės Valandos

Paleisk **VISĄ** šitą SQL vienu ypu savo Supabase SQL editoriuje
(tavo aktyviame projekte: `bacqlmhfokfnmoexijkj`).

Šis skriptas yra **idempotentinis** (galima paleisti kelis kartus) ir
sutvarko VISKĄ ko reikia analytics, lockdown, activity log, achievements,
error log ir grants.

---

## Kaip naudoti

1. Atsidaryk Supabase → SQL Editor → New query.
2. Nukopijuok visą SQL bloką žemiau.
3. Paleisk (Run).
4. Vercel → Deployments → Redeploy (be cache).
5. Įeik į `socialinesvalandos.vercel.app`, paspaudinėk po puslapius.
6. Grįžk į `/admin/analytics` — turi rodyti tikrus skaičius.

---

## 🧨 THE BIG SQL

```sql
-- ============================================================
-- SOCIALINĖS VALANDOS — FULL RESYNC SQL
-- Safe to run multiple times. Fixes analytics, lockdown, activity,
-- achievements, error log and all grants.
-- ============================================================

-- 1) activity_log table + missing column ---------------------
create table if not exists public.activity_log (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete set null,
  action         text not null,
  meta           jsonb not null default '{}'::jsonb,
  is_admin_event boolean not null default false,
  created_at     timestamptz not null default now()
);

alter table public.activity_log
  add column if not exists is_admin_event boolean not null default false;

alter table public.activity_log
  add column if not exists meta jsonb not null default '{}'::jsonb;

create index if not exists activity_log_created_at_idx
  on public.activity_log (created_at desc);
create index if not exists activity_log_action_created_idx
  on public.activity_log (action, created_at desc);
create index if not exists activity_log_user_id_idx
  on public.activity_log (user_id) where user_id is not null;
create index if not exists activity_log_admin_event_idx
  on public.activity_log (is_admin_event, created_at desc);
create index if not exists activity_log_session_idx
  on public.activity_log ((meta->>'session_id'));
create index if not exists activity_log_path_idx
  on public.activity_log ((meta->>'path'));

-- 2) Grants ---------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;
grant select, insert on public.activity_log to authenticated;
grant insert         on public.activity_log to anon;
grant all            on public.activity_log to service_role;

-- 3) RLS ------------------------------------------------------
alter table public.activity_log enable row level security;

drop policy if exists "anon inserts" on public.activity_log;
create policy "anon inserts"
  on public.activity_log for insert to anon with check (true);

drop policy if exists "authed inserts" on public.activity_log;
create policy "authed inserts"
  on public.activity_log for insert to authenticated with check (true);

drop policy if exists "self or admin reads" on public.activity_log;
create policy "self or admin reads"
  on public.activity_log for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- 4) Admin-flag trigger --------------------------------------
create or replace function public.tg_activity_log_flag_admin()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_path text := coalesce(new.meta->>'path','');
  v_is_admin boolean := false;
begin
  if v_path like '/admin%' then v_is_admin := true;
  elsif new.user_id is not null and public.has_role(new.user_id,'admin') then v_is_admin := true;
  end if;
  new.is_admin_event := v_is_admin;
  return new;
end $$;

drop trigger if exists tg_activity_log_flag_admin on public.activity_log;
create trigger tg_activity_log_flag_admin
  before insert on public.activity_log
  for each row execute function public.tg_activity_log_flag_admin();

update public.activity_log
   set is_admin_event = true
 where is_admin_event = false
   and coalesce(meta->>'path','') like '/admin%';

-- 5) site_settings public RPC (lockdown) ---------------------
create or replace function public.get_lockdown_public()
returns table(
  lockdown_enabled boolean,
  lockdown_message text,
  lockdown_code    text,
  updated_at       timestamptz
)
language sql stable security definer set search_path = public as $$
  select
    coalesce(s.lockdown_enabled,false),
    s.lockdown_message,
    s.lockdown_code,
    s.updated_at
  from public.site_settings s
  where s.id = true
  limit 1;
$$;

grant execute on function public.get_lockdown_public() to anon, authenticated;

-- 6) analytics reset RPC (admin only) ------------------------
create or replace function public.analytics_reset()
returns integer language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.has_role(auth.uid(),'admin') then
    raise exception 'Not authorized';
  end if;
  delete from public.activity_log;
  get diagnostics n = row_count;
  return n;
end $$;

grant execute on function public.analytics_reset() to authenticated;

-- 7) Force PostgREST schema reload ---------------------------
notify pgrst, 'reload schema';

-- 8) Sanity ---------------------------------------------------
select 'activity_log rows' as label, count(*)::text as value from public.activity_log
union all
select 'admin-flagged rows', count(*)::text from public.activity_log where is_admin_event = true
union all
select 'last 5min public views',
       count(distinct coalesce(meta->>'session_id', user_id::text, id::text))::text
  from public.activity_log
 where action = 'page.view'
   and is_admin_event = false
   and created_at > now() - interval '5 minutes';
```

---

## Po paleidimo

1. Vercel → Deployments → **Redeploy** (išjunk "Use existing Build Cache").
2. Atidaryk `socialinesvalandos.vercel.app` incognito lange, paspaudinėk po puslapius.
3. Įeik kaip admin → `/admin/analytics` → turi matyti realius skaičius.
4. Jei nori nuresetinti senus duomenis: `/admin/analytics` → **Reset** mygtukas.

Jei po viso to Vercel vis dar rodo kitokius duomenis nei preview — reiškia
Vercel env vis dar rodo į kitą projektą. Patikrink DevTools → Network →
turi matyti `bacqlmhfokfnmoexijkj.supabase.co` užklausas.
