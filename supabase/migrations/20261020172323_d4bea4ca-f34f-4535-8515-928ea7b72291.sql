CREATE TABLE public.gate_nonces (
  nonce uuid PRIMARY KEY,
  ua_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz
);
GRANT ALL ON public.gate_nonces TO service_role;
ALTER TABLE public.gate_nonces ENABLE ROW LEVEL SECURITY;
CREATE INDEX gate_nonces_ua_hash_created_idx ON public.gate_nonces (ua_hash, created_at);
CREATE INDEX gate_nonces_expires_idx ON public.gate_nonces (expires_at) WHERE consumed_at IS NULL;