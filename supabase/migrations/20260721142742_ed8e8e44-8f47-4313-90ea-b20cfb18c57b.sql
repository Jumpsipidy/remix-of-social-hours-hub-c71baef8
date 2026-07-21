-- ============================================================
-- QR CHECK-IN SYSTEM
-- Adds a static 6-digit code (tier 2 fallback) and check-in
-- tracking to reservations + reservation_participants.
-- Rotating QR tokens are HMAC-signed by the server function
-- using CERT_SIGNING_SECRET, so no schema is needed for those.
-- ============================================================

-- 1. Columns
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS check_in_code TEXT,
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checked_in_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.reservation_participants
  ADD COLUMN IF NOT EXISTS check_in_code TEXT,
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checked_in_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Uniqueness (partial — allow many NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS reservations_check_in_code_key
  ON public.reservations (check_in_code) WHERE check_in_code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS reservation_participants_check_in_code_key
  ON public.reservation_participants (check_in_code) WHERE check_in_code IS NOT NULL;

-- 3. 6-digit generator (retries on rare collisions)
CREATE OR REPLACE FUNCTION public.generate_check_in_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  code TEXT;
  tries INT := 0;
BEGIN
  LOOP
    code := lpad((floor(random() * 1000000))::int::text, 6, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.reservations WHERE check_in_code = code
      UNION ALL SELECT 1 FROM public.reservation_participants WHERE check_in_code = code
    );
    tries := tries + 1;
    IF tries > 20 THEN RAISE EXCEPTION 'Could not generate unique code'; END IF;
  END LOOP;
  RETURN code;
END; $$;

-- 4. Assign codes on approval (student's own reservation + accepted participants)
CREATE OR REPLACE FUNCTION public.tg_reservations_assign_checkin_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'approved' AND NEW.check_in_code IS NULL THEN
    NEW.check_in_code := public.generate_check_in_code();
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS reservations_assign_checkin_code ON public.reservations;
CREATE TRIGGER reservations_assign_checkin_code
  BEFORE INSERT OR UPDATE OF status ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.tg_reservations_assign_checkin_code();

CREATE OR REPLACE FUNCTION public.tg_participants_assign_checkin_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'accepted' AND NEW.check_in_code IS NULL THEN
    NEW.check_in_code := public.generate_check_in_code();
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS participants_assign_checkin_code ON public.reservation_participants;
CREATE TRIGGER participants_assign_checkin_code
  BEFORE INSERT OR UPDATE OF status ON public.reservation_participants
  FOR EACH ROW EXECUTE FUNCTION public.tg_participants_assign_checkin_code();

-- 5. Backfill for already-approved rows
UPDATE public.reservations
   SET check_in_code = public.generate_check_in_code()
 WHERE status IN ('approved','completed') AND check_in_code IS NULL;

UPDATE public.reservation_participants
   SET check_in_code = public.generate_check_in_code()
 WHERE status = 'accepted' AND check_in_code IS NULL;

-- 6. Check-in RPC — used by the organization scanner page.
--    Accepts either the 6-digit code OR a reservation UUID (from QR).
--    Verifies the caller is the reservation's organization.
CREATE OR REPLACE FUNCTION public.check_in_by_code(_code TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  me UUID := auth.uid();
  cleaned TEXT := regexp_replace(coalesce(_code,''), '\D', '', 'g');
  r_id UUID; s_id UUID; r_org UUID; r_status TEXT;
  is_owner BOOLEAN := false;
  part_id UUID;
  already TIMESTAMPTZ;
  student_name TEXT;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF length(cleaned) <> 6 THEN
    RAISE EXCEPTION 'Netaisyklingas kodas — turi būti 6 skaitmenys';
  END IF;

  -- Try owner code
  SELECT id, student_id, organization_id, status::text, checked_in_at
    INTO r_id, s_id, r_org, r_status, already
    FROM public.reservations WHERE check_in_code = cleaned;
  IF FOUND THEN
    is_owner := true;
  ELSE
    SELECT rp.id, rp.reservation_id, rp.student_id, rp.checked_in_at
      INTO part_id, r_id, s_id, already
      FROM public.reservation_participants rp WHERE rp.check_in_code = cleaned;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Kodas nerastas arba negalioja';
    END IF;
    SELECT organization_id, status::text INTO r_org, r_status
      FROM public.reservations WHERE id = r_id;
  END IF;

  IF r_org <> me AND NOT public.has_role(me, 'admin') THEN
    RAISE EXCEPTION 'Šis kodas nepriklauso jūsų organizacijai';
  END IF;
  IF r_status NOT IN ('approved','completed') THEN
    RAISE EXCEPTION 'Rezervacija dar nepatvirtinta';
  END IF;

  SELECT full_name INTO student_name FROM public.profiles WHERE id = s_id;

  IF already IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', true, 'already', true,
      'reservation_id', r_id, 'student_id', s_id, 'student_name', student_name,
      'checked_in_at', already, 'is_owner', is_owner
    );
  END IF;

  IF is_owner THEN
    UPDATE public.reservations
       SET checked_in_at = now(), checked_in_by = me
     WHERE id = r_id;
  ELSE
    UPDATE public.reservation_participants
       SET checked_in_at = now(), checked_in_by = me
     WHERE id = part_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true, 'already', false,
    'reservation_id', r_id, 'student_id', s_id, 'student_name', student_name,
    'checked_in_at', now(), 'is_owner', is_owner
  );
END; $$;

REVOKE ALL ON FUNCTION public.check_in_by_code(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_in_by_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_check_in_code() TO service_role;