
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS signup_code TEXT;

-- Backfill a random code for existing schools that don't have one
UPDATE public.schools
SET signup_code = upper(substr(md5(random()::text || id::text), 1, 8))
WHERE signup_code IS NULL;

ALTER TABLE public.schools ALTER COLUMN signup_code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS schools_signup_code_key ON public.schools(signup_code);
