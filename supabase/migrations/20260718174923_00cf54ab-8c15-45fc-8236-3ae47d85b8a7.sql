
-- =========================================================
-- 1. FRIENDSHIPS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT friendships_not_self CHECK (requester_id <> addressee_id),
  CONSTRAINT friendships_unique_pair UNIQUE (requester_id, addressee_id)
);

CREATE INDEX IF NOT EXISTS friendships_requester_idx ON public.friendships(requester_id);
CREATE INDEX IF NOT EXISTS friendships_addressee_idx ON public.friendships(addressee_id);
CREATE INDEX IF NOT EXISTS friendships_status_idx ON public.friendships(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO authenticated;
GRANT ALL ON public.friendships TO service_role;

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Helper: are two users friends?
CREATE OR REPLACE FUNCTION public.are_friends(_a uuid, _b uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
      AND ((requester_id = _a AND addressee_id = _b)
        OR (requester_id = _b AND addressee_id = _a))
  );
$$;

REVOKE ALL ON FUNCTION public.are_friends(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.are_friends(uuid,uuid) TO authenticated, service_role;

-- RLS: user sees rows where they are either side
DROP POLICY IF EXISTS "friendships select own" ON public.friendships;
CREATE POLICY "friendships select own"
ON public.friendships FOR SELECT TO authenticated
USING (auth.uid() = requester_id OR auth.uid() = addressee_id OR public.has_role(auth.uid(),'admin'));

-- Only requester can create, and both must be students at the same school
DROP POLICY IF EXISTS "friendships insert as requester" ON public.friendships;
CREATE POLICY "friendships insert as requester"
ON public.friendships FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = requester_id
  AND EXISTS (
    SELECT 1 FROM public.profiles r, public.profiles a
    WHERE r.id = requester_id AND a.id = addressee_id
      AND r.role = 'student' AND a.role = 'student'
      AND r.school_id IS NOT NULL AND r.school_id = a.school_id
  )
);

-- Addressee can accept/decline; either side can delete (unfriend/cancel)
DROP POLICY IF EXISTS "friendships update by addressee" ON public.friendships;
CREATE POLICY "friendships update by addressee"
ON public.friendships FOR UPDATE TO authenticated
USING (auth.uid() = addressee_id OR auth.uid() = requester_id)
WITH CHECK (auth.uid() = addressee_id OR auth.uid() = requester_id);

DROP POLICY IF EXISTS "friendships delete own" ON public.friendships;
CREATE POLICY "friendships delete own"
ON public.friendships FOR DELETE TO authenticated
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- updated_at trigger
DROP TRIGGER IF EXISTS friendships_set_updated_at ON public.friendships;
CREATE TRIGGER friendships_set_updated_at
BEFORE UPDATE ON public.friendships
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- 2. RESERVATION PARTICIPANTS (group reservations)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.reservation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','removed')),
  hours_awarded INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT rp_unique_per_reservation UNIQUE (reservation_id, student_id)
);

CREATE INDEX IF NOT EXISTS rp_reservation_idx ON public.reservation_participants(reservation_id);
CREATE INDEX IF NOT EXISTS rp_student_idx ON public.reservation_participants(student_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservation_participants TO authenticated;
GRANT ALL ON public.reservation_participants TO service_role;

ALTER TABLE public.reservation_participants ENABLE ROW LEVEL SECURITY;

-- Read: the invitee, reservation owner, organization on the reservation, admins, or school_admins of the student's school
DROP POLICY IF EXISTS "rp select visible" ON public.reservation_participants;
CREATE POLICY "rp select visible"
ON public.reservation_participants FOR SELECT TO authenticated
USING (
  auth.uid() = student_id
  OR auth.uid() = invited_by
  OR public.has_role(auth.uid(),'admin')
  OR EXISTS (
    SELECT 1 FROM public.reservations r
    WHERE r.id = reservation_id
      AND (r.student_id = auth.uid() OR r.organization_id = auth.uid())
  )
);

-- Insert: only the reservation's owner (student) may add participants, and only their accepted friends
DROP POLICY IF EXISTS "rp insert by owner" ON public.reservation_participants;
CREATE POLICY "rp insert by owner"
ON public.reservation_participants FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.reservations r
    WHERE r.id = reservation_id AND r.student_id = auth.uid()
  )
  AND invited_by = auth.uid()
  AND (
    student_id = auth.uid() -- owner adding themselves is allowed
    OR public.are_friends(auth.uid(), student_id)
  )
);

-- Update: invitee accepts/declines their own row; owner can mark removed
DROP POLICY IF EXISTS "rp update by self or owner" ON public.reservation_participants;
CREATE POLICY "rp update by self or owner"
ON public.reservation_participants FOR UPDATE TO authenticated
USING (
  auth.uid() = student_id
  OR EXISTS (SELECT 1 FROM public.reservations r WHERE r.id = reservation_id AND r.student_id = auth.uid())
  OR public.has_role(auth.uid(),'admin')
)
WITH CHECK (
  auth.uid() = student_id
  OR EXISTS (SELECT 1 FROM public.reservations r WHERE r.id = reservation_id AND r.student_id = auth.uid())
  OR public.has_role(auth.uid(),'admin')
);

-- Delete: owner removes invite, or invitee removes themselves
DROP POLICY IF EXISTS "rp delete own" ON public.reservation_participants;
CREATE POLICY "rp delete own"
ON public.reservation_participants FOR DELETE TO authenticated
USING (
  auth.uid() = student_id
  OR EXISTS (SELECT 1 FROM public.reservations r WHERE r.id = reservation_id AND r.student_id = auth.uid())
);

DROP TRIGGER IF EXISTS rp_set_updated_at ON public.reservation_participants;
CREATE TRIGGER rp_set_updated_at
BEFORE UPDATE ON public.reservation_participants
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- 3. Award hours to whole group when org verifies
-- =========================================================
CREATE OR REPLACE FUNCTION public.award_reservation_hours(_reservation_id uuid)
RETURNS TABLE(student_id uuid, hours_awarded integer, new_total integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r public.reservations%ROWTYPE;
  award integer;
  owner_new integer;
BEGIN
  SELECT * INTO r FROM public.reservations WHERE id = _reservation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reservation not found'; END IF;
  IF NOT (auth.uid() = r.organization_id OR public.has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'Not authorized to complete this reservation';
  END IF;
  IF r.status = 'completed' THEN
    RETURN QUERY
      SELECT p.id, 0, COALESCE(p.hours_earned,0)
      FROM public.profiles p
      WHERE p.id = r.student_id
         OR p.id IN (SELECT rp.student_id FROM public.reservation_participants rp
                     WHERE rp.reservation_id = _reservation_id AND rp.status = 'accepted');
    RETURN;
  END IF;

  award := COALESCE(r.hours_to_earn, 0);
  UPDATE public.reservations SET status = 'completed' WHERE id = _reservation_id;

  -- owner
  UPDATE public.profiles
     SET hours_earned = COALESCE(hours_earned,0) + award
   WHERE id = r.student_id
   RETURNING hours_earned INTO owner_new;

  RETURN QUERY SELECT r.student_id, award, COALESCE(owner_new,0);

  -- accepted group participants (excluding owner if somehow listed)
  RETURN QUERY
  WITH updated AS (
    UPDATE public.profiles p
       SET hours_earned = COALESCE(p.hours_earned,0) + award
      FROM public.reservation_participants rp
     WHERE rp.reservation_id = _reservation_id
       AND rp.status = 'accepted'
       AND rp.student_id = p.id
       AND p.id <> r.student_id
    RETURNING p.id, p.hours_earned
  ), stamped AS (
    UPDATE public.reservation_participants rp
       SET hours_awarded = award
     WHERE rp.reservation_id = _reservation_id
       AND rp.status = 'accepted'
       AND rp.student_id <> r.student_id
    RETURNING rp.student_id
  )
  SELECT u.id, award, u.hours_earned FROM updated u;
END;
$$;

REVOKE ALL ON FUNCTION public.award_reservation_hours(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_reservation_hours(uuid) TO authenticated, service_role;

-- =========================================================
-- 4. Realtime for friendships + participants
-- =========================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='friendships') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='reservation_participants') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.reservation_participants;
    END IF;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
