
-- Store the disclosure signed by the organization when closing a task
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS legal_disclosure text;

-- Allow chat rooms without a reservation (school admin ↔ organization direct chat)
ALTER TABLE public.chat_rooms ALTER COLUMN reservation_id DROP NOT NULL;

DO $$
DECLARE cname text;
BEGIN
  SELECT conname INTO cname FROM pg_constraint
   WHERE conrelid = 'public.chat_rooms'::regclass
     AND contype = 'u'
     AND array_length(conkey,1) = 1
     AND conkey = ARRAY[(SELECT attnum FROM pg_attribute
                          WHERE attrelid = 'public.chat_rooms'::regclass
                            AND attname = 'reservation_id')];
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.chat_rooms DROP CONSTRAINT %I', cname);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS chat_rooms_reservation_uniq
  ON public.chat_rooms(reservation_id) WHERE reservation_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS chat_rooms_direct_admin_org_uniq
  ON public.chat_rooms(school_admin_id, organization_id)
  WHERE reservation_id IS NULL;
