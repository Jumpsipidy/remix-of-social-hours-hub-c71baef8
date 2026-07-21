# QR + 6-skaitmenų kodo įsiregistravimo sistema

## Kam to reikia

Iki šiol organizacija galėjo paspausti „Patvirtinti valandas" niekada nemačiusi savanorio. QR įsiregistravimas įrodo, kad mokinys **realiai atvyko** į vietą, ir prideda dar vieną apsaugos sluoksnį prieš sukčiavimą.

## Kaip veikia (3 sluoksniai)

### 1 sluoksnis — Sukamas QR kodas (numatytas)
- Mokinys `/checkin` puslapyje mato didelį QR kodą.
- QR kodas keičiasi **kas 30 sekundžių** — ekrano nuotrauka negalioja.
- QR viduje: `SVCI|<reservation_id>|<student_id>|<time_window>|<HMAC parašas>`
- Parašas generuojamas serveryje su `CERT_SIGNING_SECRET` — negalima suklastoti be serverio.
- Organizacija atidaro `/organization/scan`, įjungia kamerą → nuskaito → mokinys pažymėtas atvykęs.

### 2 sluoksnis — 6 skaitmenų kodas (interneto nėra)
- Toje pačioje kortelėje po QR yra didelis kodas, pvz. `482 195`.
- Kodas **statiškas ir unikalus** kiekvienai rezervacijai (irgi kiekvienam grupės nariui).
- Sukuriamas automatiškai kai rezervacija patvirtinama (`approved`).
- Mokinys gali padaryti ekrano nuotrauką **prieš** išeidamas iš namų arba užsirašyti popieriuje.
- Organizacija `/organization/scan` perjungia į režimą „6 skaitmenų kodas", įveda 6 skaičius → mokinys pažymėtas.

### 3 sluoksnis — Rankinis (visai be telefono)
Šiuo metu užrakintas — jei jo prireiks, mokyklos administratorius gali patvirtinti valandas iš `/school` (visi tokie veiksmai keliauja į audit žurnalą).

## Kas gali įregistruoti
`check_in_by_code(_code)` RPC leidžia įregistruoti tik jei:
- Kviečiantis vartotojas = rezervacijos `organization_id`, **arba** super-admin (`has_role admin`).
- Rezervacijos statusas yra `approved` arba `completed`.

Kodas kitos organizacijos rezervacijai — atmetamas.

## Grupinės rezervacijos
Kiekvienas priimtas draugas (`reservation_participants.status = 'accepted'`) turi **savo** 6-skaitmenų kodą ir savo QR. Organizacija skenuoja po vieną. Panelėje matoma: „3/5 atvykę".

## Duomenų bazės pokyčiai

| Lentelė | Naujas stulpelis | Reikšmė |
|---|---|---|
| `reservations` | `check_in_code` | 6 skaitmenys, `NULL` kol nepatvirtinta |
| `reservations` | `checked_in_at` | Kada mokinys pažymėtas atvykęs |
| `reservations` | `checked_in_by` | Organizacijos `profiles.id` |
| `reservation_participants` | `check_in_code` | Kiekvienam grupės nariui atskiras |
| `reservation_participants` | `checked_in_at` | — |
| `reservation_participants` | `checked_in_by` | — |

Automatika:
- Trigeris `reservations_assign_checkin_code` — sugeneruoja kodą kai statusas tampa `approved`.
- Trigeris `participants_assign_checkin_code` — tas pats, kai draugas priima kvietimą.
- Funkcija `generate_check_in_code()` — 6 skaitmenų unikalus generatorius su kolizijos apsauga.
- Funkcija `check_in_by_code(_code)` — vienintelis būdas įregistruoti, tikrina org priklausomybę.

## Kaip testuoti be antro telefono

1. **Prisijunk kaip savanoris** (studento paskyra) viename naršyklės lange.
2. Sukurk rezervaciją kur nors → paprašyk organizacijos savininko patvirtinti (arba prisijunk kaip ta organizacija ir patvirtink).
3. Kai statusas taps **„Vykdoma" (approved)**, atidaryk `/checkin` — pamatysi QR + 6 skaitmenis.
4. **Kitame naršyklės lange (arba incognito)** prisijunk kaip organizacija.
5. Atidaryk `/organization/scan` → paspausk „6 skaitmenų kodas" tab'ą → įvesk kodą iš studento ekrano → `Įregistruoti`.
6. Studento pusėje kodas persijungs į „Įregistruota ✓".
7. Toliau organizacija gali paspausti „Patvirtinti ir uždaryti" — valandos suskaičiuos į abiejų profilius kaip anksčiau.

Testuoti kamerą — atsidaryk `/checkin` telefone, `/organization/scan` kompiuteryje (arba atvirkščiai). Kamera veikia tik per HTTPS arba `localhost`.

## Saugumo apibendrinimas

| Rizika | Ką daro sistema |
|---|---|
| Studentas duoda kodą draugui, kad tas nueitų vietoj jo | QR sukasi kas 30s — ekrano nuotrauka nebeveiks kai atvyks |
| Ekrano nuotrauka anksčiau | HMAC parašas + time window (±30s) |
| Svetima organizacija bando panaudoti kitos org kodą | RPC atmeta — `organization_id` privalo sutapti |
| Kodas nutekintas per pokalbį | Galioja tik vienai rezervacijai; po įregistravimo — beprasmis |
| Organizacija pati bando išgalvoti kodą | 1 000 000 galimybių, unikalumas per DB indeksą, RPC apsauga |

## SQL nuoroda
Migracija: `20260721_qr_checkin` (žr. migracijų failų sąrašą Supabase valdymo skyde). Pagrindiniai objektai:

```sql
-- Stulpeliai
ALTER TABLE public.reservations
  ADD COLUMN check_in_code TEXT,
  ADD COLUMN checked_in_at TIMESTAMPTZ,
  ADD COLUMN checked_in_by UUID REFERENCES public.profiles(id);

ALTER TABLE public.reservation_participants
  ADD COLUMN check_in_code TEXT,
  ADD COLUMN checked_in_at TIMESTAMPTZ,
  ADD COLUMN checked_in_by UUID REFERENCES public.profiles(id);

-- Unikalumas (leidžia daug NULL)
CREATE UNIQUE INDEX reservations_check_in_code_key
  ON public.reservations (check_in_code) WHERE check_in_code IS NOT NULL;

-- RPC (naudoja tik organizacija)
public.check_in_by_code(_code TEXT) RETURNS jsonb  -- SECURITY DEFINER

-- Trigeris
public.tg_reservations_assign_checkin_code  -- prieš INSERT/UPDATE status
public.tg_participants_assign_checkin_code  -- prieš INSERT/UPDATE status
```
