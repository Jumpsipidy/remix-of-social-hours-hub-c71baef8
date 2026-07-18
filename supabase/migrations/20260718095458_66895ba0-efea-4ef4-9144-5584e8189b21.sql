DROP POLICY IF EXISTS bugs_insert_public ON public.bug_reports;
CREATE POLICY bugs_insert_public
ON public.bug_reports
FOR INSERT
TO anon, authenticated
WITH CHECK (
  char_length(trim(message)) BETWEEN 10 AND 4000
  AND (reporter_email IS NULL OR reporter_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
  AND severity IN ('low', 'normal', 'high', 'critical')
  AND status = 'open'
);

DROP POLICY IF EXISTS org_req_insert_public ON public.organization_access_requests;
CREATE POLICY org_req_insert_public
ON public.organization_access_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (
  char_length(trim(organization_name)) BETWEEN 2 AND 160
  AND char_length(trim(contact_name)) BETWEEN 2 AND 120
  AND contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND char_length(trim(description)) BETWEEN 20 AND 4000
  AND status = 'pending'
);