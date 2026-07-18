# Lockdown lentelės SQL setup

Jeigu matai klaidą:

```txt
Could not find the table 'public.site_settings' in the schema cache
```

reiškia, kad tavo realioje duomenų bazėje dar nėra `site_settings` lentelės arba API schema dar nepersikrovė.

Nukopijuok ir paleisk visą SQL bloką savo duomenų bazės SQL editoriuje:

```sql
CREATE TABLE IF NOT EXISTS public.site_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id = true),
  lockdown_enabled BOOLEAN NOT NULL DEFAULT false,
  lockdown_message TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT, UPDATE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

INSERT INTO public.site_settings (id, lockdown_enabled, lockdown_message)
VALUES (true, false, NULL)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "site_settings read all" ON public.site_settings;
CREATE POLICY "site_settings read all"
ON public.site_settings
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "site_settings admin update" ON public.site_settings;
CREATE POLICY "site_settings admin update"
ON public.site_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'site_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.site_settings;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
```

Po paleidimo palauk 10–30 sekundžių ir atnaujink `/admin/lockdown` puslapį. Jeigu klaida lieka, paleisk tik paskutinę eilutę dar kartą:

```sql
NOTIFY pgrst, 'reload schema';
```

OAuth nėra šitos klaidos priežastis. Google ir Discord login gali veikti puikiai, o `site_settings` klaida vis tiek atsiras, jeigu lentelė nebuvo sukurta tavo duomenų bazėje.