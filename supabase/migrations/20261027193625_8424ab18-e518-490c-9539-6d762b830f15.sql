CREATE TABLE public.support_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  ip_hash text,
  user_id uuid,
  status text NOT NULL DEFAULT 'ai' CHECK (status IN ('ai','escalated','closed')),
  summary text,
  page text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.support_threads TO service_role;
ALTER TABLE public.support_threads ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.support_threads(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant','admin')),
  content text NOT NULL,
  provider text,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX support_messages_thread_idx ON public.support_messages(thread_id, created_at);
CREATE INDEX support_messages_ip_idx ON public.support_messages(ip_hash, created_at);
CREATE INDEX support_threads_status_idx ON public.support_threads(status, updated_at DESC);
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;