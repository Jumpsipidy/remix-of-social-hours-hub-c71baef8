ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS tasks_tags_gin ON public.tasks USING GIN (tags);
CREATE INDEX IF NOT EXISTS reservations_tags_gin ON public.reservations USING GIN (tags);