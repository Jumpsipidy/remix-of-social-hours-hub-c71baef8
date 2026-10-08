create or replace function public.search_classmates(_q text)
returns table (
  id uuid,
  full_name text,
  class_year text,
  hours_earned integer,
  school_id uuid,
  public_email text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.full_name, p.class_year, p.hours_earned, p.school_id, p.public_email
  from public.profiles p
  where p.school_id = (select school_id from public.profiles where id = auth.uid())
    and p.id <> auth.uid()
    and p.role = 'student'
    and (
      _q is null or btrim(_q) = ''
      or p.full_name ilike '%' || btrim(_q) || '%'
    )
  order by p.full_name
  limit 20
$$;

revoke all on function public.search_classmates(text) from public, anon;
grant execute on function public.search_classmates(text) to authenticated;

notify pgrst, 'reload schema';