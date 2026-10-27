-- Pokalbių apribojimai: auklėtojas ↔ mokinys tiesioginis pokalbis uždraustas.
-- Leidžiama: organizacija ↔ mokinys ir auklėtojas ↔ organizacija.
-- Paleidimas: psql "$DATABASE_URL" -f tests/chat-scope.test.sql

DO $$
DECLARE
  def text;
BEGIN
  -- open_chat_with nebeturi auklėtojas↔mokinys šakų.
  SELECT pg_get_functiondef('public.open_chat_with(uuid)'::regprocedure) INTO def;
  ASSERT def NOT LIKE '%school_admin_can_manage(_other)%',
    'open_chat_with vis dar leidžia auklėtojui rašyti mokiniui';
  ASSERT def NOT LIKE '%list_my_teachers()%',
    'open_chat_with vis dar leidžia mokiniui rašyti auklėtojui';

  -- list_chat_contacts nebegrąžina mokinių auklėtojams.
  SELECT pg_get_functiondef('public.list_chat_contacts()'::regprocedure) INTO def;
  ASSERT def NOT LIKE '%me.role = ''school_admin'' AND me.sch IS NOT NULL%',
    'list_chat_contacts vis dar rodo mokinius auklėtojams';

  -- list_my_teachers išjungtas (tuščias rezultatas).
  SELECT pg_get_functiondef('public.list_my_teachers()'::regprocedure) INTO def;
  ASSERT def LIKE '%WHERE false%',
    'list_my_teachers vis dar grąžina auklėtojus mokiniams';

  -- list_my_conversations slepia tiesioginius auklėtojas↔mokinys kambarius.
  SELECT pg_get_functiondef('public.list_my_conversations()'::regprocedure) INTO def;
  ASSERT def LIKE '%r.organization_id IS NULL AND r.student_id IS NOT NULL AND r.school_admin_id IS NOT NULL%',
    'list_my_conversations neslepia tiesioginių auklėtojas↔mokinys pokalbių';
END $$;
