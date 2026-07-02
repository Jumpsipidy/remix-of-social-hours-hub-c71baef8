
-- =========================================================
-- WIPE ALL NON-ADMIN DATA
-- =========================================================
DELETE FROM public.messages;
DELETE FROM public.chat_rooms;
DELETE FROM public.reservations;
DELETE FROM public.tasks;

-- Delete every profile & auth user that is NOT an admin
DELETE FROM auth.users
WHERE id IN (SELECT id FROM public.profiles WHERE role <> 'admin');

-- Belt-and-braces: profiles cascade should cover it, but ensure
DELETE FROM public.profiles WHERE role <> 'admin';

-- =========================================================
-- SCHOOLS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  city text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.schools TO anon, authenticated;
GRANT ALL ON public.schools TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.schools TO authenticated;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "schools_read_all" ON public.schools FOR SELECT USING (true);
CREATE POLICY "schools_admin_write" ON public.schools FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.schools (name, city) VALUES ('Šeduvos gimnazija', 'Radviliškis')
ON CONFLICT (name) DO NOTHING;

-- =========================================================
-- PROFILES: add school + class
-- =========================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS class_year text;

-- =========================================================
-- ORGANIZATION ACCESS REQUESTS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.organization_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name text NOT NULL,
  legal_code text,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,
  website text,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.organization_access_requests TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.organization_access_requests TO authenticated;
GRANT ALL ON public.organization_access_requests TO service_role;
ALTER TABLE public.organization_access_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_req_insert_public" ON public.organization_access_requests
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "org_req_admin_read" ON public.organization_access_requests
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "org_req_admin_update" ON public.organization_access_requests
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "org_req_admin_delete" ON public.organization_access_requests
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER org_req_set_updated_at
  BEFORE UPDATE ON public.organization_access_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- BUG REPORTS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.bug_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_email text,
  reporter_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  page_url text,
  message text NOT NULL,
  severity text NOT NULL DEFAULT 'normal' CHECK (severity IN ('low','normal','high','critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','triaged','resolved','wont_fix')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.bug_reports TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.bug_reports TO authenticated;
GRANT ALL ON public.bug_reports TO service_role;
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bugs_insert_public" ON public.bug_reports
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "bugs_admin_all" ON public.bug_reports
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- 12-DAY MESSAGE PURGE (pg_cron)
-- =========================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- unschedule previous version if exists (safe)
DO $$
DECLARE jid int;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'purge_old_messages_daily';
  IF jid IS NOT NULL THEN PERFORM cron.unschedule(jid); END IF;
END $$;

SELECT cron.schedule(
  'purge_old_messages_daily',
  '0 3 * * *',
  $$ SELECT public.purge_old_messages(); $$
);
