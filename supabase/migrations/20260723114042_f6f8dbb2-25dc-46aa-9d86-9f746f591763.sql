
-- 1. AI error analyses cache
CREATE TABLE public.ai_error_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fingerprint TEXT NOT NULL UNIQUE,
  error_message TEXT,
  suspected_cause TEXT,
  suggested_file TEXT,
  suggested_fix TEXT,
  severity_estimate TEXT,
  confidence NUMERIC,
  model TEXT NOT NULL,
  tokens_used INT DEFAULT 0,
  raw_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_error_analyses TO authenticated;
GRANT ALL ON public.ai_error_analyses TO service_role;
ALTER TABLE public.ai_error_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view AI analyses" ON public.ai_error_analyses
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. Uptime checks
CREATE TABLE public.uptime_checks (
  id BIGSERIAL PRIMARY KEY,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status_code INT,
  latency_ms INT,
  ok BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  db_ok BOOLEAN
);
CREATE INDEX idx_uptime_checks_checked_at ON public.uptime_checks(checked_at DESC);
GRANT SELECT ON public.uptime_checks TO authenticated;
GRANT ALL ON public.uptime_checks TO service_role;
ALTER TABLE public.uptime_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view uptime" ON public.uptime_checks
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Web Vitals log
CREATE TABLE public.web_vitals_log (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT,
  user_id UUID,
  route TEXT NOT NULL,
  metric TEXT NOT NULL,
  value NUMERIC NOT NULL,
  rating TEXT,
  navigation_type TEXT,
  user_agent TEXT,
  connection_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_web_vitals_route ON public.web_vitals_log(route, metric, created_at DESC);
CREATE INDEX idx_web_vitals_created_at ON public.web_vitals_log(created_at DESC);
GRANT INSERT ON public.web_vitals_log TO anon, authenticated;
GRANT SELECT ON public.web_vitals_log TO authenticated;
GRANT ALL ON public.web_vitals_log TO service_role;
ALTER TABLE public.web_vitals_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can log their vitals" ON public.web_vitals_log
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can view vitals" ON public.web_vitals_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Auto-purge old data (keep 7 days for uptime, 3 days for vitals)
CREATE OR REPLACE FUNCTION public.purge_monitoring_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.uptime_checks WHERE checked_at < now() - INTERVAL '7 days';
  DELETE FROM public.web_vitals_log WHERE created_at < now() - INTERVAL '3 days';
END;
$$;
GRANT EXECUTE ON FUNCTION public.purge_monitoring_data() TO service_role;

-- Updated_at trigger for AI analyses
CREATE OR REPLACE FUNCTION public.ai_analyses_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_ai_analyses_updated
BEFORE UPDATE ON public.ai_error_analyses
FOR EACH ROW EXECUTE FUNCTION public.ai_analyses_updated_at();
