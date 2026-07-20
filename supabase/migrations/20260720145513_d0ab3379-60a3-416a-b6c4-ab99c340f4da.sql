
ALTER TABLE public.activity_log
  ADD COLUMN IF NOT EXISTS is_admin_event boolean NOT NULL DEFAULT false;

-- Backfill: mark any past hit on /admin* or by an admin user
UPDATE public.activity_log
SET is_admin_event = true
WHERE is_admin_event = false
  AND (
    coalesce(meta->>'path','') LIKE '/admin%'
    OR (user_id IS NOT NULL AND public.has_role(user_id, 'admin'))
  );

-- (Re)create the flagging trigger now that the column exists
CREATE OR REPLACE FUNCTION public.tg_activity_log_flag_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_path text := coalesce(new.meta->>'path','');
  v_is_admin boolean := false;
BEGIN
  IF v_path LIKE '/admin%' THEN v_is_admin := true;
  ELSIF new.user_id IS NOT NULL AND public.has_role(new.user_id, 'admin') THEN v_is_admin := true;
  END IF;
  new.is_admin_event := v_is_admin;
  RETURN new;
END $$;

DROP TRIGGER IF EXISTS tg_activity_log_flag_admin ON public.activity_log;
CREATE TRIGGER tg_activity_log_flag_admin
  BEFORE INSERT ON public.activity_log
  FOR EACH ROW EXECUTE FUNCTION public.tg_activity_log_flag_admin();
