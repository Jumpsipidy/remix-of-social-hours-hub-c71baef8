CREATE OR REPLACE FUNCTION public.tg_lockdown_health_security() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.threat_level='security' AND OLD.locked_at IS NOT NULL THEN
  UPDATE public.site_settings SET lockdown_code='E-2002',lockdown_message='[auto] Saugumo patikra aptiko kritinę grėsmę. Reikalinga administratoriaus patikra.',updated_at=clock_timestamp()
   WHERE id=true AND lockdown_enabled=true AND lockdown_code='E-4002' AND updated_at=OLD.locked_at AND lockdown_message=OLD.locked_message;
  NEW.locked_at:=NULL; NEW.locked_message:=NULL; NEW.healthy:=0;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.tg_lockdown_health_security() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.tg_lockdown_health_security() TO service_role;
CREATE TRIGGER lockdown_health_security BEFORE UPDATE ON public.lockdown_health_state FOR EACH ROW EXECUTE FUNCTION public.tg_lockdown_health_security();