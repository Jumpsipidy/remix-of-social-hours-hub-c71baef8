
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS is_event boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS event_host_name text;

-- Backfill created_by for existing organization-owned tasks
UPDATE public.tasks SET created_by = organization_id WHERE created_by IS NULL;

-- Drop and recreate insert/update/delete policies to include school admin events
DROP POLICY IF EXISTS "tasks_insert_own" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_own" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_own" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete" ON public.tasks;

CREATE POLICY "tasks_insert"
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (
    (auth.uid() = organization_id AND public.has_role(auth.uid(), 'organization'))
    OR (is_event = true AND auth.uid() = created_by AND public.has_role(auth.uid(), 'school_admin'))
  );

CREATE POLICY "tasks_update"
  ON public.tasks FOR UPDATE TO authenticated
  USING (
    auth.uid() = organization_id
    OR (is_event = true AND auth.uid() = created_by)
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "tasks_delete"
  ON public.tasks FOR DELETE TO authenticated
  USING (
    auth.uid() = organization_id
    OR (is_event = true AND auth.uid() = created_by)
    OR public.has_role(auth.uid(), 'admin')
  );

-- Allow school admins to view reservations for events they created
DROP POLICY IF EXISTS "reservations_school_admin_events" ON public.reservations;
CREATE POLICY "reservations_school_admin_events"
  ON public.reservations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = reservations.task_id
        AND t.is_event = true
        AND t.created_by = auth.uid()
    )
  );

-- Allow school admins hosting events to update reservation status on their events
DROP POLICY IF EXISTS "reservations_school_admin_events_update" ON public.reservations;
CREATE POLICY "reservations_school_admin_events_update"
  ON public.reservations FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = reservations.task_id
        AND t.is_event = true
        AND t.created_by = auth.uid()
    )
  );
