CREATE TABLE public.task_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  teacher_id uuid NOT NULL,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  note text,
  dismissed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, task_id)
);
GRANT SELECT, UPDATE ON public.task_suggestions TO authenticated;
GRANT ALL ON public.task_suggestions TO service_role;
ALTER TABLE public.task_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Student reads own suggestions" ON public.task_suggestions FOR SELECT TO authenticated USING (auth.uid() = student_id OR auth.uid() = teacher_id);
CREATE POLICY "Student dismisses own suggestions" ON public.task_suggestions FOR UPDATE TO authenticated USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);