CREATE TABLE public.invite_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  label text NOT NULL,
  message text,
  audience text NOT NULL DEFAULT 'student' CHECK (audience IN ('student','organization','any')),
  school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  max_uses int CHECK (max_uses IS NULL OR max_uses > 0),
  uses int NOT NULL DEFAULT 0,
  opens int NOT NULL DEFAULT 0,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.invite_links TO service_role;
ALTER TABLE public.invite_links ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_invite(_token text, _accept boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.invite_links; s text; sc text;
BEGIN
  IF _token IS NULL OR length(_token) < 20 OR length(_token) > 100 THEN RETURN jsonb_build_object('status','invalid'); END IF;
  SELECT * INTO r FROM public.invite_links WHERE token_hash = encode(extensions.digest(_token,'sha256'),'hex');
  IF NOT FOUND THEN RETURN jsonb_build_object('status','invalid'); END IF;
  IF r.revoked_at IS NOT NULL THEN s := 'revoked';
  ELSIF r.expires_at IS NOT NULL AND r.expires_at < now() THEN s := 'expired';
  ELSIF r.max_uses IS NOT NULL AND r.uses >= r.max_uses THEN s := 'used_up';
  ELSE s := 'ok'; END IF;
  IF s <> 'ok' THEN RETURN jsonb_build_object('status', s); END IF;
  IF _accept THEN UPDATE public.invite_links SET uses = uses + 1 WHERE id = r.id;
  ELSE UPDATE public.invite_links SET opens = opens + 1 WHERE id = r.id; END IF;
  SELECT name, signup_code INTO s, sc FROM public.schools WHERE id = r.school_id AND is_active;
  RETURN jsonb_build_object('status','ok','label',r.label,'message',r.message,'audience',r.audience,
    'school_name',s,'school_code', CASE WHEN _accept THEN sc END,'expires_at',r.expires_at);
END $$;
REVOKE ALL ON FUNCTION public.get_invite(text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invite(text, boolean) TO anon, authenticated;