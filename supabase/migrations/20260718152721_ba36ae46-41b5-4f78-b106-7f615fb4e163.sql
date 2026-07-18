
CREATE TABLE IF NOT EXISTS public.site_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id = true),
  lockdown_enabled BOOLEAN NOT NULL DEFAULT false,
  lockdown_message TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);
INSERT INTO public.site_settings (id, lockdown_enabled) VALUES (true, false)
  ON CONFLICT (id) DO NOTHING;

GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT UPDATE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_settings read all" ON public.site_settings;
CREATE POLICY "site_settings read all" ON public.site_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "site_settings admin update" ON public.site_settings;
CREATE POLICY "site_settings admin update" ON public.site_settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.site_settings;
