# Kaip pakeisti mokyklos registracijos kodą

Registracijos kodą (`signup_code`) reikia keisti kartą per mokslo metus arba kai jis nutekintas.

## Būdas per Super Admin skydelį (rekomenduojama)

1. Prisijunk kaip super admin.
2. Eik į `/admin/schools`.
3. Rask reikiamą mokyklą sąraše, spausk **„Redaguoti“**.
4. Pakeisk lauką **Registracijos kodas** — pvz. iš `SEDUVOS2026` į `SEDUVOS2027`.
5. Išsaugok.

Nuo šio momento:
- Seni bandymai užsiregistruoti su senu kodu — atmetami.
- Jau egzistuojantys mokiniai **nepaveikti** — jie jau prisijungę.
- Reikia išplatinti naują kodą tos mokyklos mokiniams (per klasės auklėtoją, mokyklos naujienlaiškį ir pan.).

## Būdas per SQL (jeigu skydelis neveikia)

```sql
UPDATE public.schools
SET signup_code = 'SEDUVOS2027'
WHERE name = 'Šeduvos gimnazija';
```

## Rekomendacijos kodo formai

- Tik didžiosios raidės ir skaičiai (funkcija `verify_school_signup_code` daro `upper(trim(...))`, taigi didžiosios/mažosios nesvarbu, bet vienoda forma atrodo profesionaliau).
- 8–16 simbolių.
- Be lietuviškų raidžių (mažiau klaidų telefone).
- Nenaudok akivaizdaus žodžio kaip `admin` ar `12345`.
- Pakeisk kodą kiekvienais mokslo metais.

## Kaip patikrinti, kad naujas kodas veikia

1. Atsijunk (arba atidaryk incognito langą).
2. Eik į `/register`.
3. Pasirink mokyklą, įvesk **naują** kodą — turi praeiti.
4. Įvesk **seną** kodą — turi būti klaida „Neteisingas mokyklos kodas“.
