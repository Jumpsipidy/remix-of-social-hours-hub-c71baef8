-- Socialinės Valandos — trūkstamas stulpelis profiles.assigned_classes
-- Paleisk Supabase → SQL Editor. Saugu paleisti kelis kartus.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS assigned_classes text[] NOT NULL DEFAULT '{}'::text[];

-- Kad PostgREST iš karto pamatytų naują stulpelį:
NOTIFY pgrst, 'reload schema';

-- Pavyzdys: priskirti auklėtojai tik 8A klasę
-- UPDATE public.profiles
--   SET assigned_classes = ARRAY['8A']
--   WHERE email = 'aukletoja@mokykla.lt' AND role = 'school_admin';

-- Pavyzdys: direktorius mato visą mokyklą (tuščias masyvas = visos klasės)
-- UPDATE public.profiles SET assigned_classes = '{}'::text[]
--   WHERE email = 'direktorius@mokykla.lt';

-- Patikra: ar mokyklos administratoriai turi priskirtą mokyklą?
-- SELECT id, email, role, school_id, assigned_classes
--   FROM public.profiles WHERE role = 'school_admin';
