
-- 1. Org category enum + column
DO $$ BEGIN
  CREATE TYPE public.org_category AS ENUM ('organizacija', 'bendruomene');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS org_category public.org_category;

-- 2. Fix tasks RLS: drop legacy duplicates, allow admin insert
DROP POLICY IF EXISTS "Organizations insert own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Organizations update own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Organizations delete own tasks" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert" ON public.tasks;

CREATE POLICY "tasks_insert" ON public.tasks
FOR INSERT TO authenticated
WITH CHECK (
  (auth.uid() = organization_id AND public.has_role(auth.uid(), 'organization'))
  OR (is_event = true AND auth.uid() = created_by AND public.has_role(auth.uid(), 'school_admin'))
  OR public.has_role(auth.uid(), 'admin')
);

-- 3. Seed sample data for the current school if not present (no-op if row exists)
-- (safe: uses default gen_random_uuid if new)
