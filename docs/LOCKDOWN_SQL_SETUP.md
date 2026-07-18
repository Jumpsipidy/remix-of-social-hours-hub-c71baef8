# Lockdown lentelės SQL setup

Jeigu matai klaidą apie `site_settings` schemos talpyklą — paleisk šitą SQL bloką savo duomenų bazėje (SQL editor):

```sql
CREATE TABLE IF NOT EXISTS public.site_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id = true),
  lockdown_enabled BOOLEAN NOT NULL DEFAULT false,
  lockdown_message TEXT,
  lockdown_code TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS lockdown_code TEXT;

GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT, UPDATE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

INSERT INTO public.site_settings (id, lockdown_enabled)
VALUES (true, false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "site_settings read all" ON public.site_settings;
CREATE POLICY "site_settings read all"
ON public.site_settings FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "site_settings admin update" ON public.site_settings;
CREATE POLICY "site_settings admin update"
ON public.site_settings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
  AND NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'site_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.site_settings;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
```

Palauk 10–30 s ir atnaujink `/admin/lockdown`. Klaidų kodų gidas: `/status`.
