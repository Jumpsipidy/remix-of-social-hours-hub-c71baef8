
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS logo_url          TEXT,
  ADD COLUMN IF NOT EXISTS cover_url         TEXT,
  ADD COLUMN IF NOT EXISTS gallery_urls      TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS bio               TEXT,
  ADD COLUMN IF NOT EXISTS public_email      TEXT,
  ADD COLUMN IF NOT EXISTS phone             TEXT,
  ADD COLUMN IF NOT EXISTS website_url       TEXT,
  ADD COLUMN IF NOT EXISTS facebook_url      TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url     TEXT,
  ADD COLUMN IF NOT EXISTS address           TEXT,
  ADD COLUMN IF NOT EXISTS city              TEXT,
  ADD COLUMN IF NOT EXISTS latitude          NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS longitude         NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS activity_tags     TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS profile_verified  BOOLEAN NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Org can upload own media" ON storage.objects;
CREATE POLICY "Org can upload own media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('org-logos','org-photos')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Org can update own media" ON storage.objects;
CREATE POLICY "Org can update own media"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id IN ('org-logos','org-photos')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Org can delete own media" ON storage.objects;
CREATE POLICY "Org can delete own media"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id IN ('org-logos','org-photos')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Public read org media" ON storage.objects;
CREATE POLICY "Public read org media"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id IN ('org-logos','org-photos'));

NOTIFY pgrst, 'reload schema';
