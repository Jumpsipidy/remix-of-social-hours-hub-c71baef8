# Demo paruošimas — vaizdo įrašui (be debug panelės)

Šis failas — vienintelis, kurio reikia norint per ~10 min. paruošti pilną demo:
3 paskyros (mokinys, organizacija, mokyklos administratorius), valandos,
rezervacijos ir veikiantis QR / 6 skaitmenų įsiregistravimas.

Visas SQL leidžiamas **Supabase → SQL Editor** (service_role, RLS negalioja).
Viskas idempotentiška — galima leisti kelis kartus.

---

## 0. Greitas planas

| Žingsnis | Ką darai | Kur |
|---|---|---|
| 1 | Sukuri 3 paskyras per `/register` | naršyklėje |
| 2 | Paleidi „setup" SQL — nustato roles, valandas, mokyklą | SQL Editor |
| 3 | Paleidi „demo duomenys" SQL — užduotys + rezervacijos | SQL Editor |
| 4 | Filmuoji: mokinys → `/checkin`, organizacija → `/organization/scan` | 2 naršyklės |
| 5 | Po įrašo — „reset" SQL | SQL Editor |

Naršyklės: mokinys — įprastame lange, organizacija — **incognito**,
mokykla — kita naršyklė (Firefox/Edge). Trys sesijos vienu metu.

---

## 1. Paskyrų sukūrimas (per UI, ne SQL)

Kurk per `/register`, kad `auth.users` + `profiles` susikurtų teisingai
(trigeris pats padaro profilį). Rekomenduojami demo el. paštai:

| Rolė | El. paštas | Slaptažodis |
|---|---|---|
| Mokinys | `demo.mokinys@socialinesvalandos.dev` | `Demo2026!` |
| Organizacija | `demo.org@socialinesvalandos.dev` | `Demo2026!` |
| Mokyklos admin | `demo.mokykla@socialinesvalandos.dev` | `Demo2026!` |

Registruojant mokinį reikės **mokyklos registracijos kodo**: `SEDUVOS2026`.

> Jei el. pašto patvirtinimas trukdo — Supabase → Authentication → Providers →
> Email → išjunk „Confirm email" demo laikui. Arba patvirtink ranka:
> ```sql
> UPDATE auth.users SET email_confirmed_at = now()
> WHERE email LIKE 'demo.%@socialinesvalandos.dev';
> ```

---

## 2. Setup SQL — rolės, mokykla, valandos

```sql
-- ============================================================
-- DEMO SETUP — leisti po to, kai 3 paskyros sukurtos per /register
-- ============================================================

-- 2.1 Mokykla (jei dar nėra)
INSERT INTO public.schools (name, city, signup_code, is_active)
SELECT 'Šeduvos gimnazija', 'Šeduva', 'SEDUVOS2026', true
WHERE NOT EXISTS (SELECT 1 FROM public.schools WHERE name ILIKE '%šeduv%');

-- 2.2 MOKINYS: rolė, klasė, valandos, mokykla
UPDATE public.profiles p SET
  role         = 'student',
  full_name    = 'Demo Mokinys',
  class_year   = '11',
  hours_needed = 60,
  hours_earned = 42,          -- 70% progreso juosta — gražiai atrodo vaizde
  school_id    = (SELECT id FROM public.schools WHERE name ILIKE '%šeduv%' LIMIT 1),
  city         = 'Šeduva',
  updated_at   = now()
WHERE p.email = 'demo.mokinys@socialinesvalandos.dev';

-- 2.3 ORGANIZACIJA
UPDATE public.profiles p SET
  role              = 'organization',
  full_name         = 'Demo Organizacija',
  organization_name = 'Šeduvos gyvūnų globos namai',
  org_category      = 'organizacija',
  city              = 'Šeduva',
  address           = 'Vytauto g. 1, Šeduva',
  bio               = 'Padedame benamiams gyvūnams. Priimame savanorius kasdien.',
  activity_tags     = ARRAY['Gyvūnai','Aplinkosauga'],
  profile_verified  = true,
  public_email      = 'demo.org@socialinesvalandos.dev',
  latitude          = 55.7556,
  longitude         = 23.7594,
  updated_at        = now()
WHERE p.email = 'demo.org@socialinesvalandos.dev';

-- 2.4 MOKYKLOS ADMINISTRATORIUS
UPDATE public.profiles p SET
  role                  = 'school_admin',
  full_name             = 'Demo Mokyklos Administratorė',
  associated_school_id  = (SELECT id FROM public.schools WHERE name ILIKE '%šeduv%' LIMIT 1),
  school_id             = (SELECT id FROM public.schools WHERE name ILIKE '%šeduv%' LIMIT 1),
  assigned_classes      = ARRAY['9','10','11','12'],
  updated_at            = now()
WHERE p.email = 'demo.mokykla@socialinesvalandos.dev';

-- 2.5 Patikra
SELECT email, role, full_name, organization_name, hours_earned, hours_needed, class_year
FROM public.profiles
WHERE email LIKE 'demo.%@socialinesvalandos.dev';
```

### Jei projekte naudojama ir `user_roles` lentelė (super admin)

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'TAVO@EMAIL.lt'
ON CONFLICT (user_id, role) DO NOTHING;
```

---

## 3. Valandų valdymas (vienos eilutės komandos)

```sql
-- Nustatyti tikslų valandų skaičių
UPDATE public.profiles SET hours_earned = 42
WHERE email = 'demo.mokinys@socialinesvalandos.dev';

-- Pridėti valandų (pvz. +5)
UPDATE public.profiles SET hours_earned = hours_earned + 5
WHERE email = 'demo.mokinys@socialinesvalandos.dev';

-- Beveik baigta (gražus „98%" kadras)
UPDATE public.profiles SET hours_earned = 59, hours_needed = 60
WHERE email = 'demo.mokinys@socialinesvalandos.dev';

-- Pilnai surinkta (sertifikato demo)
UPDATE public.profiles SET hours_earned = 60, hours_needed = 60
WHERE email = 'demo.mokinys@socialinesvalandos.dev';

-- Nuo nulio (registracijos demo)
UPDATE public.profiles SET hours_earned = 0
WHERE email = 'demo.mokinys@socialinesvalandos.dev';
```

> **Taisyklės priminimas:** 5–7 klasės — fiksuotos 20 val.; 8+ klasė — min. 8 val.
> Siūloma rezervacija — max 8 val. vienam kartui.

---

## 4. Demo duomenys — užduotys ir rezervacijos

```sql
-- ============================================================
-- DEMO TURINYS
-- ============================================================
WITH org AS (
  SELECT id FROM public.profiles WHERE email = 'demo.org@socialinesvalandos.dev'
), stu AS (
  SELECT id FROM public.profiles WHERE email = 'demo.mokinys@socialinesvalandos.dev'
)
-- 4.1 Trys atviros užduotys
INSERT INTO public.tasks
  (organization_id, title, description, location, address, task_date,
   start_time, end_time, available_hours, spots_total, is_open, tags,
   latitude, longitude)
SELECT org.id, t.title, t.descr, 'Šeduva', 'Vytauto g. 1, Šeduva',
       (CURRENT_DATE + t.day_off)::date, t.st::time, t.et::time,
       t.hrs, t.spots, true, t.tags, 55.7556, 23.7594
FROM org, (VALUES
  ('Gyvūnų prieglaudos tvarkymas','Voljerų valymas, šunų vedžiojimas, socializacija.', 2, '10:00','14:00', 4, 8, ARRAY['Gyvūnai']),
  ('Parko švarinimo akcija','Renkame šiukšles Šeduvos parke. Pirštines duodame.',      4, '09:00','14:00', 5, 20, ARRAY['Aplinkosauga']),
  ('Pagalba senjorams','Bendravimas, pirkinių atnešimas, knygų skaitymas.',            6, '15:00','18:00', 3, 5, ARRAY['Senjorai'])
) AS t(title, descr, day_off, st, et, hrs, spots, tags);

-- 4.2 Viena LAUKIANTI rezervacija (organizacijos „Patvirtinti" mygtuko demo)
INSERT INTO public.reservations
  (student_id, organization_id, reservation_date, start_time, end_time,
   hours_to_earn, status, location, address, note)
SELECT s.id, o.id, (CURRENT_DATE + 2), '10:00', '14:00', 4, 'pending',
       'Šeduva', 'Vytauto g. 1, Šeduva', 'Norėčiau padėti su šunimis.'
FROM public.profiles s, public.profiles o
WHERE s.email = 'demo.mokinys@socialinesvalandos.dev'
  AND o.email = 'demo.org@socialinesvalandos.dev';

-- 4.3 Viena PATVIRTINTA rezervacija → čia atsiras QR + 6 skaitmenų kodas
INSERT INTO public.reservations
  (student_id, organization_id, reservation_date, start_time, end_time,
   hours_to_earn, status, location, address, note)
SELECT s.id, o.id, CURRENT_DATE, '10:00', '14:00', 4, 'approved',
       'Šeduva', 'Vytauto g. 1, Šeduva', 'QR demo rezervacija'
FROM public.profiles s, public.profiles o
WHERE s.email = 'demo.mokinys@socialinesvalandos.dev'
  AND o.email = 'demo.org@socialinesvalandos.dev';
```

---

## 5. QR / 6 skaitmenų įsiregistravimas — demo receptas

### Kaip veikia (30 sek. paaiškinimas kamerai)

1. Mokinys atsidaro **`/checkin`** → mato **besisukantį QR** (naujas kas 30 s,
   pasirašytas HMAC-SHA256 su `CERT_SIGNING_SECRET`) ir po juo **statinį
   6 skaitmenų kodą** (`reservations.check_in_code`) — jis veikia be interneto.
2. Organizacija atsidaro **`/organization/scan`** → arba nuskaito QR kamera,
   arba įveda 6 skaitmenis ranka.
3. Serveris tikrina parašą + laiko langą, tada kviečia `check_in_by_code()`,
   kuris DB pusėje užtikrina, kad kodas priklauso **būtent tai organizacijai**.
4. Rezultatas: `checked_in_at` užpildomas, mokinio ekrane atsiranda
   „Įregistruota ✓".

### Prieš filmuojant patikrink

```sql
-- Ar patvirtinta rezervacija turi kodą? (turi būti 6 skaitmenys)
SELECT r.id, p.full_name, r.status, r.check_in_code, r.checked_in_at
FROM public.reservations r
JOIN public.profiles p ON p.id = r.student_id
WHERE p.email = 'demo.mokinys@socialinesvalandos.dev'
ORDER BY r.created_at DESC;
```

Jei `check_in_code` yra `NULL` (trigeris nesuveikė) — priskirk ranka:

```sql
UPDATE public.reservations
SET check_in_code = lpad((floor(random()*1000000))::int::text, 6, '0')
WHERE status = 'approved' AND check_in_code IS NULL;
```

Arba nustatyk **įsimenamą kodą filmavimui** (pvz. `482195`):

```sql
UPDATE public.reservations r SET check_in_code = '482195'
FROM public.profiles p
WHERE p.id = r.student_id
  AND p.email = 'demo.mokinys@socialinesvalandos.dev'
  AND r.status = 'approved';
```

### Perfilmuoti tą patį įsiregistravimą (atstatyti)

```sql
UPDATE public.reservations
SET checked_in_at = NULL, checked_in_by = NULL
WHERE check_in_code = '482195';

-- Grupės nariams
UPDATE public.reservation_participants
SET checked_in_at = NULL, checked_in_by = NULL
WHERE check_in_code IS NOT NULL;
```

### Būtina serverio paslaptis

`CERT_SIGNING_SECRET` turi būti Vercel env (ir `.env` lokaliai), kitaip
`/checkin` mes „Server misconfigured". Patikrinimas: Vercel → Settings →
Environment Variables.

> Kamera veikia tik per **HTTPS arba localhost**. Filmuojant naudok
> `https://www.socialinesvalandos.dev`, ne IP adresą.

---

## 6. Rezervacijos būsenos keitimas ranka (kadrams)

```sql
-- pending → approved (tarsi organizacija patvirtino)
UPDATE public.reservations SET status = 'approved' WHERE id = 'REZERVACIJOS-UUID';

-- approved → completed + valandos mokiniui
UPDATE public.reservations SET status = 'completed' WHERE id = 'REZERVACIJOS-UUID';
UPDATE public.profiles SET hours_earned = hours_earned + 4
WHERE id = (SELECT student_id FROM public.reservations WHERE id = 'REZERVACIJOS-UUID');

-- atgal į pending (perfilmavimui)
UPDATE public.reservations
SET status = 'pending', checked_in_at = NULL, checked_in_by = NULL
WHERE id = 'REZERVACIJOS-UUID';
```

Galimos būsenos: `pending`, `confirmed`, `declined`, `approved`, `completed`.

---

## 7. Filmavimo maršrutas (siūloma tvarka)

| # | Puslapis | Kaip prisijungęs | Ką rodyti |
|---|---|---|---|
| 1 | `/` | atsijungęs | Pagrindinis, animacijos, statistika |
| 2 | `/register` | atsijungęs | Rolių pasirinkimas, mokyklos kodas |
| 3 | `/student` | mokinys | Progreso juosta, artėjančios rezervacijos |
| 4 | `/tasks` | mokinys | Užduočių paieška, žemėlapis, rezervacija |
| 5 | `/organization` | organizacija | Laukiantis prašymas → „Patvirtinti" |
| 6 | `/checkin` | mokinys | Besisukantis QR + 6 skaitmenų kodas |
| 7 | `/organization/scan` | organizacija | Kodo įvedimas → „✓ Įregistruota" |
| 8 | `/organization` | organizacija | „Patvirtinti ir uždaryti" → valandos |
| 9 | `/student` | mokinys | Valandos padidėjo, sertifikato mygtukas |
| 10 | `/verify/<kodas>` | bet kas | Sertifikato viešas patikrinimas |
| 11 | `/school` | mokyklos admin | Klasių apžvalga, mokinių auditas |
| 12 | `/admin` | super admin | Analitika, Bug Radar, klaidų centras |

Pastaba: prieš filmuojant išjunk slapukų juostą (paspausk „Sutinku" kartą)
ir uždaryk onboarding turą, kad neuždengtų kadro.

---

## 8. Švarus atstatymas po įrašo

```sql
-- Tik demo duomenys, paskyros lieka
DELETE FROM public.reservations r USING public.profiles p
WHERE p.id = r.student_id AND p.email LIKE 'demo.%@socialinesvalandos.dev';

DELETE FROM public.tasks t USING public.profiles p
WHERE p.id = t.organization_id AND p.email = 'demo.org@socialinesvalandos.dev';

UPDATE public.profiles SET hours_earned = 0
WHERE email = 'demo.mokinys@socialinesvalandos.dev';
```

Pilnas demo paskyrų ištrynimas:

```sql
DELETE FROM auth.users WHERE email LIKE 'demo.%@socialinesvalandos.dev';
-- profiles ir susijusios eilutės išsitrina per ON DELETE CASCADE
```

---

## 9. Dažnos problemos

| Simptomas | Priežastis | Sprendimas |
|---|---|---|
| Po registracijos meta į `/login` | El. paštas nepatvirtintas | 1 skyriaus `UPDATE auth.users` |
| `/checkin` tuščias | Nėra `approved` rezervacijos su kodu | 4.3 + 5 skyriai |
| „Server misconfigured" | Trūksta `CERT_SIGNING_SECRET` | Pridėk Vercel env |
| Kamera nepasileidžia | Ne HTTPS | Naudok tikrą domeną |
| Rolė neteisinga po SQL | Sesija sena | Atsijunk ir prisijunk iš naujo |
| „Could not find the function..." | PostgREST kešas | `NOTIFY pgrst, 'reload schema';` |
