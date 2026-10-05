-- tasks: no blanket read
DROP POLICY IF EXISTS "Authenticated can view tasks" ON public.tasks;
CREATE POLICY "Tasks visible when open or related" ON public.tasks FOR SELECT TO authenticated
USING (
  is_open = true
  OR auth.uid() = organization_id
  OR auth.uid() = created_by
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'school_admin'::app_role)
  OR EXISTS (SELECT 1 FROM public.reservations r WHERE r.task_id = tasks.id AND r.student_id = auth.uid())
);

-- site_settings: admins read directly; everyone else uses get_lockdown_public()
DROP POLICY IF EXISTS "site_settings read all" ON public.site_settings;
CREATE POLICY "site_settings admin read" ON public.site_settings FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- activity_log: remove unrestricted insert policies (scoped ones remain)
DROP POLICY IF EXISTS "anon inserts" ON public.activity_log;
DROP POLICY IF EXISTS "authed inserts" ON public.activity_log;

-- organization access requests: only pending, clean submissions
DROP POLICY IF EXISTS "org_req_insert_public" ON public.organization_access_requests;
CREATE POLICY "org_req_insert_public" ON public.organization_access_requests FOR INSERT TO anon, authenticated
WITH CHECK (
  status = 'pending' AND admin_notes IS NULL
  AND length(organization_name) BETWEEN 2 AND 200
  AND length(contact_name) BETWEEN 2 AND 200
  AND length(contact_email) BETWEEN 5 AND 200
  AND length(description) BETWEEN 10 AND 5000
);

-- bug reports: reporter must be self or anonymous, open status
DROP POLICY IF EXISTS "bugs_insert_public" ON public.bug_reports;
CREATE POLICY "bugs_insert_public" ON public.bug_reports FOR INSERT TO anon, authenticated
WITH CHECK (
  (reporter_user_id IS NULL OR reporter_user_id = auth.uid())
  AND status = 'open'
  AND length(message) BETWEEN 1 AND 5000
);

-- web vitals: own user id only, sane values
DROP POLICY IF EXISTS "Anyone can log their vitals" ON public.web_vitals_log;
CREATE POLICY "Anyone can log their vitals" ON public.web_vitals_log FOR INSERT TO anon, authenticated
WITH CHECK (
  (user_id IS NULL OR user_id = auth.uid())
  AND length(metric) <= 20 AND length(route) <= 300
  AND value >= 0 AND value < 1000000
);

-- schools: only active schools are publicly readable
DROP POLICY IF EXISTS "schools_read_all" ON public.schools;
CREATE POLICY "schools_read_active" ON public.schools FOR SELECT TO anon, authenticated
USING (is_active = true OR public.has_role(auth.uid(), 'admin'::app_role));

-- org media: public buckets serve files by URL; listing limited to uploader
DROP POLICY IF EXISTS "Public read org media" ON storage.objects;
CREATE POLICY "Owners list org media" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = ANY (ARRAY['org-logos','org-photos']) AND owner_id = (select auth.uid()::text));