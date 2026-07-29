-- ============================================================
-- FIX: trūkstami stulpeliai (schema cache klaidos)
-- Paleisk VISĄ šitą failą Supabase → SQL Editor → Run.
--
-- Sutvarko:
--   "Could not find the 'address' column of 'tasks' in the schema cache"
--   "Could not find the 'raw_response' column of 'ai_error_analyses' ..."
--   "Could not find the 'error_message' column of 'ai_error_analyses' ..."
-- ============================================================

-- 1) tasks — adresas + koordinatės (naudoja AddressPicker / žemėlapis)
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS address   TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS latitude  DOUBLE PRECISION;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- 2) ai_error_analyses — AI analizės lentelė (jei jos nėra, sukuriam)
CREATE TABLE IF NOT EXISTS public.ai_error_analyses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint       TEXT NOT NULL UNIQUE,
  error_message     TEXT,
  suspected_cause   TEXT,
  suggested_file    TEXT,
  suggested_fix     TEXT,
  severity_estimate TEXT,
  confidence        NUMERIC,
  model             TEXT,
  tokens_used       INTEGER,
  raw_response      JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_error_analyses ADD COLUMN IF NOT EXISTS error_message     TEXT;
ALTER TABLE public.ai_error_analyses ADD COLUMN IF NOT EXISTS raw_response      JSONB;
ALTER TABLE public.ai_error_analyses ADD COLUMN IF NOT EXISTS suspected_cause   TEXT;
ALTER TABLE public.ai_error_analyses ADD COLUMN IF NOT EXISTS suggested_file    TEXT;
ALTER TABLE public.ai_error_analyses ADD COLUMN IF NOT EXISTS suggested_fix     TEXT;
ALTER TABLE public.ai_error_analyses ADD COLUMN IF NOT EXISTS severity_estimate TEXT;
ALTER TABLE public.ai_error_analyses ADD COLUMN IF NOT EXISTS confidence        NUMERIC;
ALTER TABLE public.ai_error_analyses ADD COLUMN IF NOT EXISTS model             TEXT;
ALTER TABLE public.ai_error_analyses ADD COLUMN IF NOT EXISTS tokens_used       INTEGER;
ALTER TABLE public.ai_error_analyses ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ NOT NULL DEFAULT now();

-- unikalus fingerprint reikalingas upsert(onConflict: "fingerprint")
CREATE UNIQUE INDEX IF NOT EXISTS ai_error_analyses_fingerprint_key
  ON public.ai_error_analyses (fingerprint);

-- 3) Teisės (Data API)
GRANT SELECT ON public.ai_error_analyses TO authenticated;
GRANT ALL    ON public.ai_error_analyses TO service_role;

ALTER TABLE public.ai_error_analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read ai analyses" ON public.ai_error_analyses;
CREATE POLICY "Admins can read ai analyses"
  ON public.ai_error_analyses FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4) PostgREST schema cache perkrovimas (be šito klaida gali likti kelias minutes)
NOTIFY pgrst, 'reload schema';
