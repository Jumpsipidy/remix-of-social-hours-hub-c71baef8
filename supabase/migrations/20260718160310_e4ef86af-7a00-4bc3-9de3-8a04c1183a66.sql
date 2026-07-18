ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS lockdown_code TEXT;
NOTIFY pgrst, 'reload schema';