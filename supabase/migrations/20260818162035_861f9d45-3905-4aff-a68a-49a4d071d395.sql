-- 1) Serverio pusės limitai rezervacijoms (apsauga nuo piktnaudžiavimo/botų)
CREATE OR REPLACE FUNCTION public.tg_reservations_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent int;
  same_day int;
BEGIN
  -- Valandų ribos: niekada daugiau nei 8 val. vienai rezervacijai
  IF NEW.hours_to_earn IS NULL OR NEW.hours_to_earn < 0 OR NEW.hours_to_earn > 8 THEN
    RAISE EXCEPTION 'Neleistinas valandų skaičius (0-8)';
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Ne daugiau kaip 10 naujų užklausų per valandą vienam mokiniui
    SELECT count(*) INTO recent
      FROM public.reservations
     WHERE student_id = NEW.student_id
       AND created_at > now() - interval '1 hour';
    IF recent >= 10 THEN
      RAISE EXCEPTION 'Per daug užklausų per trumpą laiką. Pabandyk vėliau.';
    END IF;

    -- Ne daugiau kaip 3 rezervacijos tai pačiai dienai
    SELECT count(*) INTO same_day
      FROM public.reservations
     WHERE student_id = NEW.student_id
       AND reservation_date = NEW.reservation_date
       AND status <> 'declined';
    IF same_day >= 3 THEN
      RAISE EXCEPTION 'Tai dienai jau turi 3 rezervacijas.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reservations_guard ON public.reservations;
CREATE TRIGGER reservations_guard
BEFORE INSERT OR UPDATE ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.tg_reservations_guard();

-- 2) Užduočių įvesties valymas ir ribos
CREATE OR REPLACE FUNCTION public.tg_tasks_sanitize()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.title := btrim(regexp_replace(COALESCE(NEW.title,''), '[\u0000-\u001F\u007F]', '', 'g'));
  NEW.description := btrim(regexp_replace(COALESCE(NEW.description,''), '[\u0000-\u001F\u007F]', '', 'g'));
  IF length(NEW.title) = 0 THEN
    RAISE EXCEPTION 'Pavadinimas privalomas';
  END IF;
  IF length(NEW.title) > 160 THEN
    NEW.title := left(NEW.title, 160);
  END IF;
  IF length(NEW.description) > 4000 THEN
    NEW.description := left(NEW.description, 4000);
  END IF;
  IF NEW.available_hours IS NULL OR NEW.available_hours < 0 OR NEW.available_hours > 8 THEN
    RAISE EXCEPTION 'Neleistinas valandų skaičius (0-8)';
  END IF;
  IF NEW.spots_total IS NOT NULL AND (NEW.spots_total < 1 OR NEW.spots_total > 500) THEN
    RAISE EXCEPTION 'Neleistinas vietų skaičius (1-500)';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tasks_sanitize ON public.tasks;
CREATE TRIGGER tasks_sanitize
BEFORE INSERT OR UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.tg_tasks_sanitize();

-- 3) Žinučių ilgio riba + kontrolinių simbolių valymas
CREATE OR REPLACE FUNCTION public.tg_messages_sanitize()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.content := btrim(regexp_replace(COALESCE(NEW.content,''), '[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]', '', 'g'));
  IF length(NEW.content) = 0 THEN
    RAISE EXCEPTION 'Tuščia žinutė';
  END IF;
  IF length(NEW.content) > 4000 THEN
    NEW.content := left(NEW.content, 4000);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_sanitize ON public.messages;
CREATE TRIGGER messages_sanitize
BEFORE INSERT OR UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.tg_messages_sanitize();