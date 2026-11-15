ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS tags text[];

CREATE OR REPLACE FUNCTION public.tg_tasks_clean_tags()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.tags IS NOT NULL THEN
    SELECT CASE WHEN count(*) = 0 THEN NULL ELSE array_agg(t ORDER BY ord) END INTO NEW.tags
    FROM (
      SELECT DISTINCT ON (lower(t)) t, ord
      FROM (SELECT left(btrim(regexp_replace(x, '[#<>]', '', 'g')), 30) AS t, ord
            FROM unnest(NEW.tags) WITH ORDINALITY AS u(x, ord)) s
      WHERE t <> ''
      ORDER BY lower(t), ord
    ) d
    WHERE ord IS NOT NULL;
    IF NEW.tags IS NOT NULL AND array_length(NEW.tags, 1) > 5 THEN
      NEW.tags := NEW.tags[1:5];
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tasks_clean_tags ON public.tasks;
CREATE TRIGGER tasks_clean_tags BEFORE INSERT OR UPDATE OF tags ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.tg_tasks_clean_tags();