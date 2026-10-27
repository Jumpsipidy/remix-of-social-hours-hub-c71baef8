-- Run with psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/support-retention.test.sql.
-- Fixture writes and cleanup effects are rolled back inside a subtransaction.
DO $$
DECLARE
  old_thread uuid := gen_random_uuid();
  live_thread uuid := gen_random_uuid();
  old_message uuid := gen_random_uuid();
  edge_message uuid := gen_random_uuid();
  fresh_message uuid := gen_random_uuid();
BEGIN
  BEGIN
    INSERT INTO public.support_threads (id, token_hash, updated_at)
    VALUES (old_thread, old_thread::text, now() - interval '49 hours'),
           (live_thread, live_thread::text, now());
    INSERT INTO public.support_messages (id, thread_id, role, content, created_at)
    VALUES (old_message, old_thread, 'user', 'retention-test', now() - interval '49 hours'),
           (edge_message, live_thread, 'assistant', 'retention-test', now() - interval '48 hours'),
           (fresh_message, live_thread, 'admin', 'retention-test', now() - interval '47 hours');
    PERFORM public.purge_support_messages();
    ASSERT NOT EXISTS (SELECT 1 FROM public.support_messages WHERE id = old_message), 'Messages older than 48 hours must be deleted';
    ASSERT NOT EXISTS (SELECT 1 FROM public.support_messages WHERE id = edge_message), 'Exactly 48-hour-old messages must be deleted';
    ASSERT EXISTS (SELECT 1 FROM public.support_messages WHERE id = fresh_message), 'Recent admin messages must remain';
    ASSERT NOT EXISTS (SELECT 1 FROM public.support_threads WHERE id = old_thread), 'Empty inactive threads must be deleted';
    ASSERT EXISTS (SELECT 1 FROM public.support_threads WHERE id = live_thread), 'Active threads must remain';
    ASSERT NOT has_function_privilege('authenticated', 'public.purge_support_messages()', 'EXECUTE'), 'Visitors cannot invoke cleanup';
    RAISE EXCEPTION USING ERRCODE = 'ZX001', MESSAGE = 'retention test rollback';
  EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;
  END;
END $$;