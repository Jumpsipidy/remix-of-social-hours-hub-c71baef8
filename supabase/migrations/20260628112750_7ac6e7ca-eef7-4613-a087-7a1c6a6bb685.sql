
-- Tasks table: real volunteer opportunities posted by organizations
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  task_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  available_hours NUMERIC(5,2) NOT NULL DEFAULT 0,
  location TEXT NOT NULL DEFAULT '',
  spots_total INT NOT NULL DEFAULT 1,
  is_open BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can browse open tasks
CREATE POLICY "Authenticated can view tasks" ON public.tasks
  FOR SELECT TO authenticated USING (true);

-- Organizations manage only their own tasks
CREATE POLICY "Organizations insert own tasks" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = organization_id AND public.has_role(auth.uid(), 'organization'));

CREATE POLICY "Organizations update own tasks" ON public.tasks
  FOR UPDATE TO authenticated
  USING (auth.uid() = organization_id)
  WITH CHECK (auth.uid() = organization_id);

CREATE POLICY "Organizations delete own tasks" ON public.tasks
  FOR DELETE TO authenticated
  USING (auth.uid() = organization_id);

CREATE TRIGGER tasks_set_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX tasks_org_idx ON public.tasks(organization_id);
CREATE INDEX tasks_open_date_idx ON public.tasks(is_open, task_date);

-- Link reservations to a task (optional; ad-hoc reservations still allowed)
ALTER TABLE public.reservations ADD COLUMN task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL;
CREATE INDEX reservations_task_idx ON public.reservations(task_id);
