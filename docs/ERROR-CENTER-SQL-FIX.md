# Error Center SQL fix — 2026-07-23

Šitas fix'as buvo reikalingas, nes **AI lentelė jau egzistavo**, bet „Fixinta“ būsena buvo laikoma tik naršyklėje (`localStorage`). Todėl po refresh arba kitame device senos klaidos vėl atrodė aktyvios.

## Kas pakeista

- Sukurta `public.resolved_error_groups` lentelė.
- „Fixinta“ / „Atkurti“ dabar saugoma duomenų bazėje.
- Live klaidų srautas paslepia senas klaidas, kurios įvyko iki fix momento.
- Jei ta pati klaida pasirodo po fix — ji vėl išlenda kaip regresija.
- Išjungtas klaidingas uptime cron, kuris kas minutę rašė fake `Svetainė neatsako` įrašus, nors health endpoint veikia.
- Išvalyti fake `uptime:site-down` įrašai.

## SQL, kuris buvo pritaikytas

```sql
CREATE TABLE IF NOT EXISTS public.resolved_error_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint TEXT NOT NULL UNIQUE,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_in_build TEXT NOT NULL DEFAULT 'unknown',
  note TEXT,
  last_seen_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.resolved_error_groups TO authenticated;
GRANT ALL ON public.resolved_error_groups TO service_role;

ALTER TABLE public.resolved_error_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage resolved error groups" ON public.resolved_error_groups;
CREATE POLICY "Admins can manage resolved error groups"
ON public.resolved_error_groups
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_resolved_error_groups_fingerprint
ON public.resolved_error_groups(fingerprint);

CREATE INDEX IF NOT EXISTS idx_resolved_error_groups_resolved_at
ON public.resolved_error_groups(resolved_at DESC);

CREATE OR REPLACE FUNCTION public.resolved_error_groups_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_resolved_error_groups_updated_at ON public.resolved_error_groups;
CREATE TRIGGER trg_resolved_error_groups_updated_at
BEFORE UPDATE ON public.resolved_error_groups
FOR EACH ROW EXECUTE FUNCTION public.resolved_error_groups_updated_at();

SELECT cron.unschedule('uptime-ping-health')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'uptime-ping-health');

SELECT cron.unschedule('uptime-record-results')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'uptime-record-results');

DELETE FROM public.activity_log
WHERE action = 'app.critical'
  AND meta->>'fingerprint' = 'uptime:site-down'
  AND meta->>'source' = 'uptime.monitor';

DELETE FROM public.uptime_checks
WHERE ok = false
  AND error_message IN ('no response')
  AND status_code IS NULL;

NOTIFY pgrst, 'reload schema';
```

## Kaip testuoti

1. Eik į `/admin/errors`.
2. Atidaryk **Grupės (fingerprint)**.
3. Paspausk **Fixinta** ant klaidos grupės.
4. Paspausk **Atnaujinti** arba perkrauk puslapį.
5. Ta grupė turi likti paslėpta.
6. Jei tokia pati klaida įvyks vėl po fix — ji turi vėl pasirodyti kaip regresija.
```