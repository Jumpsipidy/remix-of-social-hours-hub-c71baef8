# PDF Sertifikatų SQL — pilnas setup

Šis dokumentas turi **visą SQL**, kurio reikia PDF sertifikatų sistemai. Paleisk Supabase SQL editoriuje **vieną kartą** (nauja Supabase DB) — po to viskas veiks.

> Klaida `relation "public.certificates" does not exist` reiškia, kad tavo Supabase DB dar neturi šios lentelės. Šis .md sutvarko viską.

---

## 1) Reikalingi priklausiniai (turi jau egzistuoti)

Šie objektai turėtų būti sukurti iš ankstesnių migracijų:

- `public.profiles(id uuid, hours_earned int, ...)` — mokinių profiliai
- `public.reservations(id uuid, ...)` — rezervacijos
- `public.has_role(_user_id uuid, _role app_role) → boolean` — rolių tikrinimas
- `public.app_role` enum su reikšme `'admin'`

Jei kurio nors nėra, pirmiausia paleisk `docs/SQL-REFERENCE.md`.

---

## 2) `certificates` lentelė

```sql
CREATE TABLE public.certificates (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code                text NOT NULL UNIQUE,
  student_id          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_name        text NOT NULL,
  student_class       text,
  school_id           uuid,
  school_name         text,
  total_hours         integer NOT NULL DEFAULT 0,
  hours_needed        integer NOT NULL DEFAULT 0,
  reservations_json   jsonb   NOT NULL DEFAULT '[]'::jsonb,
  content_hash        text    NOT NULL,
  signature           text    NOT NULL,
  revoked_at          timestamptz,
  revoked_reason      text,
  generated_at        timestamptz NOT NULL DEFAULT now(),
  ip_address          text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX certificates_code_idx       ON public.certificates (code);
CREATE INDEX certificates_student_id_idx ON public.certificates (student_id);
```

### GRANTs (BŪTINA — kitaip 403)

```sql
GRANT SELECT, INSERT ON public.certificates TO authenticated;
GRANT ALL           ON public.certificates TO service_role;
-- anon negauna prieigos tiesiogiai — viešas patikrinimas eina per verify_certificate RPC
```

### RLS

```sql
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Mokinys mato tik savo sertifikatus
CREATE POLICY "Students can view own certificates"
  ON public.certificates
  FOR SELECT TO authenticated
  USING (auth.uid() = student_id);

-- Admin mato viską
CREATE POLICY "Admins can view all certificates"
  ON public.certificates
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
```

> Naujus įrašus rašo tik serveris (per `SECURITY DEFINER` funkciją / server function su service role), todėl `INSERT` policy nereikia — service_role RLS pralaužia.

---

## 3) Viešas verifikavimas — `verify_certificate`

Ši funkcija leidžia bet kam (net neprisijungusiam) skenuoti QR kodą ir gauti realaus laiko duomenis iš DB. Ji **neatskleidžia** privačių laukų — grąžina tik saugius laukus.

```sql
CREATE OR REPLACE FUNCTION public.verify_certificate(_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.certificates%ROWTYPE;
  cur_hours int;
BEGIN
  SELECT * INTO c FROM public.certificates WHERE code = upper(trim(_code));
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'not_found');
  END IF;

  IF c.revoked_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'revoked',
      'revoked_at', c.revoked_at,
      'revoked_reason', c.revoked_reason
    );
  END IF;

  SELECT COALESCE(hours_earned, 0) INTO cur_hours
    FROM public.profiles WHERE id = c.student_id;

  RETURN jsonb_build_object(
    'valid', true,
    'code', c.code,
    'student_name', c.student_name,
    'student_class', c.student_class,
    'school_name', c.school_name,
    'total_hours_at_generation', c.total_hours,
    'current_hours_in_system', COALESCE(cur_hours, 0),
    'hours_needed', c.hours_needed,
    'reservations', c.reservations_json,
    'generated_at', c.generated_at,
    'content_hash', c.content_hash
  );
END;
$$;

-- Public execute — kitaip /verify/{kodas} neveiks neprisijungusiems
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO anon, authenticated;
```

---

## 4) Sertifikato anuliavimas — `revoke_certificate` (tik admin)

```sql
CREATE OR REPLACE FUNCTION public.revoke_certificate(_code text, _reason text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.certificates
    SET revoked_at = now(), revoked_reason = _reason
    WHERE code = upper(trim(_code)) AND revoked_at IS NULL;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_certificate(text, text) TO authenticated;
```

---

## 5) Environment variables (Vercel + Lovable)

| Kintamasis | Kur | Reikšmė |
|---|---|---|
| `CERT_SIGNING_SECRET` | Vercel (Prod+Preview+Dev) ir Lovable Cloud secrets | 64 hex simbolių (`openssl rand -hex 32`) |
| `SUPABASE_URL` | server-only | tavo Supabase URL |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only | Supabase service role key |
| `VITE_SUPABASE_URL` | client | tas pats URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | client | publishable/anon key |

> Ta pati `CERT_SIGNING_SECRET` reikšmė **turi** būti ir Vercel'yje, ir Lovable Cloud secrets — kitaip PDF'ai sugeneruoti vienoj vietoj turės kitokį HMAC parašą nei kitoj. Verifikacija vis tiek veiks (nes `/verify/{kodas}` skaito iš DB), bet parašo laukelis PDF'e nesutaps kryžminiam auditui.

---

## 6) Testas

```sql
-- 1. Sukurk testinį sertifikatą (kaip service_role Supabase SQL editoriuje):
INSERT INTO public.certificates (code, student_id, student_name, total_hours, hours_needed, content_hash, signature)
VALUES ('TEST-0001', (SELECT id FROM public.profiles LIMIT 1), 'Test Student', 20, 20, 'test_hash', 'test_sig');

-- 2. Iškviesk verify:
SELECT public.verify_certificate('TEST-0001');
-- turi grąžinti { "valid": true, ... }

-- 3. Neteisingas kodas:
SELECT public.verify_certificate('BLOGAS');
-- turi grąžinti { "valid": false, "reason": "not_found" }
```

Jei visi trys žingsniai veikia, sistema paruošta. Programoje eik į mokinio dashboard'ą → paspausk **📄 PDF sertifikatas** (jei valandų tikslas pasiektas) arba super admin **🧪 Debug PDF** — QR kode bus `https://tavo-domenas/verify/{KODAS}` ir nuskenavus atvers realaus laiko DB duomenis.
