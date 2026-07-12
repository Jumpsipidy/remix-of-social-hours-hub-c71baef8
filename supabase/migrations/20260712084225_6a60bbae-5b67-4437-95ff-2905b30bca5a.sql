-- Grant execute on the signup-code verifier so anon+authenticated can call it via RPC
GRANT EXECUTE ON FUNCTION public.verify_school_signup_code(uuid, text) TO anon, authenticated, service_role;

-- Add status column to bug_reports if missing so admins can triage
ALTER TABLE public.bug_reports ADD COLUMN IF NOT EXISTS admin_note TEXT;
ALTER TABLE public.bug_reports ALTER COLUMN status SET DEFAULT 'open';
UPDATE public.bug_reports SET status = 'open' WHERE status IS NULL;

-- Reload PostgREST cache
NOTIFY pgrst, 'reload schema';