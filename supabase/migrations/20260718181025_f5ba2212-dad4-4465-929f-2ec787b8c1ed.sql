-- Certificates table for PDF hour export with QR verification
CREATE TABLE public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  student_class TEXT,
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  school_name TEXT,
  total_hours INTEGER NOT NULL DEFAULT 0,
  hours_needed INTEGER NOT NULL DEFAULT 0,
  reservations_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  content_hash TEXT NOT NULL,
  signature TEXT NOT NULL,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.certificates TO authenticated;
GRANT ALL ON public.certificates TO service_role;

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Students see own certs; admins & school_admins of their school see all
CREATE POLICY "cert owner select" ON public.certificates FOR SELECT
  TO authenticated USING (
    auth.uid() = student_id
    OR public.has_role(auth.uid(), 'admin')
    OR (
      public.has_role(auth.uid(), 'school_admin')
      AND EXISTS (
        SELECT 1 FROM public.profiles sa
        WHERE sa.id = auth.uid() AND sa.associated_school_id = certificates.school_id
      )
    )
  );

CREATE POLICY "cert owner insert" ON public.certificates FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = student_id);

CREATE INDEX idx_certificates_code ON public.certificates(code);
CREATE INDEX idx_certificates_student ON public.certificates(student_id);

-- Public verification RPC — no auth required, returns only safe fields
CREATE OR REPLACE FUNCTION public.verify_certificate(_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.certificates%ROWTYPE;
  cur_hours INT;
BEGIN
  SELECT * INTO c FROM public.certificates WHERE code = upper(trim(_code));
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'not_found');
  END IF;
  IF c.revoked_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'valid', false, 'reason', 'revoked',
      'revoked_at', c.revoked_at, 'revoked_reason', c.revoked_reason
    );
  END IF;
  SELECT COALESCE(hours_earned,0) INTO cur_hours FROM public.profiles WHERE id = c.student_id;
  RETURN jsonb_build_object(
    'valid', true,
    'code', c.code,
    'student_name', c.student_name,
    'student_class', c.student_class,
    'school_name', c.school_name,
    'total_hours_at_generation', c.total_hours,
    'current_hours_in_system', COALESCE(cur_hours, 0),
    'hours_needed', c.hours_needed,
    'reservations', c.reservations_json,
    'generated_at', c.generated_at,
    'content_hash', c.content_hash
  );
END; $$;

REVOKE ALL ON FUNCTION public.verify_certificate(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_certificate(TEXT) TO anon, authenticated;

-- Revoke certificate (admin only)
CREATE OR REPLACE FUNCTION public.revoke_certificate(_code TEXT, _reason TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.certificates
    SET revoked_at = now(), revoked_reason = _reason
    WHERE code = upper(trim(_code)) AND revoked_at IS NULL;
  RETURN FOUND;
END; $$;

GRANT EXECUTE ON FUNCTION public.revoke_certificate(TEXT, TEXT) TO authenticated;