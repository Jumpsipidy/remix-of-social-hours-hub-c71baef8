CREATE OR REPLACE FUNCTION public.is_lockdown_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT lockdown_enabled FROM public.site_settings WHERE id = true), false);
$$;

REVOKE EXECUTE ON FUNCTION public.is_lockdown_active() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_lockdown_active() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.tg_block_when_lockdown()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND public.is_lockdown_active()
     AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Sistema laikinai užrakinta (lockdown). Veiksmai negalimi.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS lockdown_guard_reservations ON public.reservations;
CREATE TRIGGER lockdown_guard_reservations
BEFORE INSERT OR UPDATE OR DELETE ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.tg_block_when_lockdown();

DROP TRIGGER IF EXISTS lockdown_guard_participants ON public.reservation_participants;
CREATE TRIGGER lockdown_guard_participants
BEFORE INSERT OR UPDATE OR DELETE ON public.reservation_participants
FOR EACH ROW EXECUTE FUNCTION public.tg_block_when_lockdown();

DROP TRIGGER IF EXISTS lockdown_guard_tasks ON public.tasks;
CREATE TRIGGER lockdown_guard_tasks
BEFORE INSERT OR UPDATE OR DELETE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.tg_block_when_lockdown();

DROP TRIGGER IF EXISTS lockdown_guard_messages ON public.messages;
CREATE TRIGGER lockdown_guard_messages
BEFORE INSERT OR UPDATE OR DELETE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.tg_block_when_lockdown();

DROP TRIGGER IF EXISTS lockdown_guard_dm_messages ON public.dm_messages;
CREATE TRIGGER lockdown_guard_dm_messages
BEFORE INSERT OR UPDATE OR DELETE ON public.dm_messages
FOR EACH ROW EXECUTE FUNCTION public.tg_block_when_lockdown();