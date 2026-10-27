CREATE INDEX IF NOT EXISTS support_messages_retention_idx ON public.support_messages (created_at);
CREATE OR REPLACE FUNCTION public.purge_support_messages()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.support_messages WHERE created_at <= now() - interval '48 hours';
  DELETE FROM public.support_threads t
  WHERE t.updated_at <= now() - interval '48 hours'
    AND NOT EXISTS (SELECT 1 FROM public.support_messages m WHERE m.thread_id = t.id);
END;
$$;
REVOKE ALL ON FUNCTION public.purge_support_messages() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_support_messages() TO service_role;
DO $$
DECLARE jid bigint;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'chat-retention-12-days';
  IF jid IS NULL THEN RAISE EXCEPTION 'Existing chat retention job not found'; END IF;
  PERFORM cron.alter_job(jid, command := 'SELECT public.purge_old_messages(); SELECT public.purge_dm_messages(); SELECT public.purge_support_messages();');
END;
$$;
SELECT public.purge_support_messages();