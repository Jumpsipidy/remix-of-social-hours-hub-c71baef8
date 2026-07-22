# Klaidų grupavimas (Error Fingerprinting) — paprastai

Įsivaizduok, kad tavo svetainėje kažkas sulūžta. 47 skirtingi mokiniai
atsidaro tą patį puslapį, gauna tą pačią klaidą. **Klaidų centre** (`/admin/errors`)
tu matytum 47 raudonas eilutes viena po kitos. Neįmanoma suprasti:
„ar čia 47 skirtingos problemos, ar viena problema 47 kartus?"

**Fingerprinting** išsprendžia tai vienu kirčiu:

> Kiekvienai klaidai sugalvojame **7 raidžių ir skaičių ID** (pvz. `a3f2c19`).
> Jei dvi klaidos yra „iš esmės ta pati" — jos gauna **tą patį ID** ir yra
> sujungiamos į vieną **grupę**. Vietoj 47 eilučių matai **1 kortelę**:
> *„a3f2c19 · Cannot read 'id' of null · 47× · 12 vartotojų · pirmas kartas prieš 2d"*.

## Kaip mes „sugalvojame" tą ID?

Ne magija — receptas kaip virtuvėje:

1. Paimame klaidos žinutę: `Cannot read 'id' of null at UserCard:42`.
2. **Išvalome kintamas dalis**, kurios keičiasi tarp vartotojų:
   - Skaičiai (`user_id: 12345` → `<n>`)
   - UUID (`a3-4b-...` → `<uuid>`)
   - URL adresai (`https://...` → `<url>`)
   - Kavutėse esantis tekstas (`"labas rytas"` → `<str>`)
3. Paimame **pirmą eilutę iš stack trace** (kur funkcijoje įvyko klaida) —
   irgi išvalome.
4. Paimame šiuos du valymo rezultatus, sumaišome ir gauname 7 simbolių ID.

Rezultatas: klaida `Cannot read 'id' of null` puslapyje `/tasks/12345`
ir ta pati klaida puslapyje `/tasks/67890` gauna **tą patį fingerprint** —
nes `12345` ir `67890` abu tampa `<n>`.

## Kur tai matai svetainėje

Nueik į **/admin/errors → „Dažniausios" sekciją**. Ten:

- **Kortelė kiekvienai grupei** su ID (`#a3f2c19`), žinute, ir įvykių
  skaičiumi.
- **Unikalūs vartotojai** — kiek skirtingų žmonių pataikė. Jei 1 — tai
  gali būti keistas atvejis; jei 12 — tai realus bug'as.
- **Puslapiai** — ant kurių URL'ų ta grupė aptinkama.
- **Naršyklės** — ar tai tik Safari, ar visur.
- **Severity score (0–100)** — mūsų heuristika:
  daugiau vartotojų + daugiau puslapių + kritinės klaidos + neseniai
  matyta = didesnis skaičius. `>70` = raudonas, `>40` = geltonas.
- **Trend** — mini grafikas per 24h. Iš karto matai, ar klaida
  „bumpsta dabar" vs „nutiko vieną kartą prieš savaitę".
- **Mygtukas „Nutildyti"** — jei žinai, kad tai smulkmena, gali paslėpti
  visą grupę iš pagrindinio srauto.

## Kodėl tai geriau nei paprastas sąrašas

| Be grupavimo | Su grupavimu |
|--------------|-------------|
| 500 eilučių, viena kita ta pati | 20 grupių + realios problemos matomos |
| Neaišku kas nauja, kas sena | „Nauja šiandien" žymė ant kiekvienos grupės |
| Sunku matuoti impakto dydį | Aišku: 47× · 12 vartotojų |
| Klaidos „paskęsta" spam'e | Retesnės, bet kritinės matomos |

## Kur fingerprint saugomas

Kai klaida atsiranda (`src/lib/error-log.ts`), prieš rašydami į
`activity_log`, sukuriame `fingerprint`, `fingerprint_norm` ir
`fingerprint_frame` laukus `meta` JSON viduje. Nieko keisti duomenų
bazėje nereikia — viskas tilpo į esamą struktūrą.

## Kai kartu su fingerprint veikia kitos apsaugos

- **Auto-lockdown** — jei per 5 min ateina ≥3 kritinės klaidos
  (nesvarbu ar tos pačios grupės, ar skirtingų), svetainė užrakinama.
- **Burst detection** — jei ta pati grupė paliečia ≥3 skirtingus
  vartotojus per 90s, iškart lockdown.
- **Session Replay** — kiekviena klaida turi paskutinių 60s vartotojo
  veiksmų įrašą (klikai, scroll, fetch).
- **Discord/Email eskalacija** — kritinės klaidos siunčia email admin'ui.

Visos šios apsaugos naudoja **tą patį fingerprint** kai skaičiuoja
„ar tai ta pati klaida" — todėl vienas bug'as = viena email notifikacija,
ne 47.

## Techninė detalė (jei įdomu)

Fingerprint funkcija: `src/lib/error-fingerprint.ts`.

```
message + first stack frame
  → normalize (numbers/UUIDs/URLs/quotes → placeholder)
  → hash32 (FNV-1a) → 7-char base36
```

Stabilus tarp deploy'ų kol nesikeičia klaidos tekstas ar failo pavadinimas.
Jei build sistema pakeičia bundle failo pavadinimą (`assets/index-abc123.js`
→ `assets/index-def456.js`) — fingerprint pasikeis, nes stack frame
turi failo pavadinimą. Tai priimtina: naujas deploy = nauja klaidų grupė.
