
GRANT SELECT, INSERT ON public.activity_log TO authenticated;
GRANT INSERT ON public.activity_log TO anon;
GRANT ALL ON public.activity_log TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_achievements TO authenticated;
GRANT ALL ON public.user_achievements TO service_role;

CREATE INDEX IF NOT EXISTS activity_log_created_at_idx ON public.activity_log (created_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_action_idx ON public.activity_log (action);
CREATE INDEX IF NOT EXISTS activity_log_user_id_idx ON public.activity_log (user_id);
