GRANT INSERT ON public.activity_log TO anon;
CREATE POLICY "activity_log anon page views" ON public.activity_log
  FOR INSERT TO anon
  WITH CHECK (user_id IS NULL AND action = 'page.view');