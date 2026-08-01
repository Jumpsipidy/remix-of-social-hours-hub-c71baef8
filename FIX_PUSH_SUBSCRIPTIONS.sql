-- FIX_PUSH_SUBSCRIPTIONS.sql
-- Paleisk Supabase SQL redaktoriuje, jei /admin/push rodo klaidą
-- "Could not find the table 'public.push_subscriptions' (PGRST205)".

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  user_agent text,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions(user_id);

grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant all on public.push_subscriptions to service_role;

alter table public.push_subscriptions enable row level security;

drop policy if exists "own push subscriptions select" on public.push_subscriptions;
create policy "own push subscriptions select"
  on public.push_subscriptions for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "own push subscriptions insert" on public.push_subscriptions;
create policy "own push subscriptions insert"
  on public.push_subscriptions for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "own push subscriptions update" on public.push_subscriptions;
create policy "own push subscriptions update"
  on public.push_subscriptions for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own push subscriptions delete" on public.push_subscriptions;
create policy "own push subscriptions delete"
  on public.push_subscriptions for delete to authenticated
  using (auth.uid() = user_id);

-- Atnaujina PostgREST schema cache
notify pgrst, 'reload schema';
