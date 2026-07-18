# PDF valandų sertifikatai — kaip mokyklos gali juos verifikuoti

Šis dokumentas paaiškina, **kaip veiks PDF eksportas** (kai jis bus įjungtas) ir kaip mokyklos gali patikrinti, kad dokumentas tikras — be popierinių parašų.

---

## Kokie yra 3 būdai gauti valandas?

| # | Būdas | Kaip veikia | Kaip mokykla patikrina? |
|---|-------|------------|--------------------------|
| 1 | **Pilnas ciklas platformoje** | Mokinys užsirezervuoja → org patvirtina → val. įskaitomos į profilį | Mokyklos admin mato viską realtime savo panelėje. Nieko papildomai daryti nereikia. |
| 2 | **PDF eksportas (šis dokumentas)** | Mokinys išsisiunčia PDF sertifikatą su QR kodu ir atspausdina / išsiunčia el. paštu | Mokykla nuskaito QR kodą → atsidaro verifikacijos puslapis mūsų svetainėje → matoma, kad dokumentas tikras. |
| 3 | **Legacy popierinis** | Mokinys popieriuje pasirašo su organizacija ir atneša popierių mokyklai | Mokykla tikrina fizinį parašą / antspaudą kaip anksčiau |

---

## Kaip veikia PDF verifikacija (be fizinių parašų)

### 1. Kas PDF viduje?

Kiekvienas PDF sertifikatas turi:

- **Mokinio vardas** ir klasė
- **Mokykla**
- **Organizacija** (kur savanoriavo)
- **Sąrašas rezervacijų** — data, valandų kiekis, aprašymas
- **Bendras valandų kiekis**
- **Unikalus verifikacijos kodas** (pvz. `SV-9F3K-A21B-7E4D`)
- **QR kodas**, kuris nukreipia į:
  `https://socialinesvalandos.lt/verify/SV-9F3K-A21B-7E4D`
- **Skaitmeninio parašo blokas** (žr. žemiau)

### 2. Kaip mokykla patikrina?

**A. Paprasčiausias būdas — nuskaitymas telefonu**

1. Mokytojas / mokyklos admin nuskaito QR kodą telefono kamera
2. Naršyklė atveria verifikacijos puslapį `socialinesvalandos.lt/verify/SV-...`
3. Puslapis rodo:
   - ✅ **Tikras dokumentas** (žalias badge)
   - Mokinio vardas
   - Mokykla, klasė
   - Organizacija ir patvirtinęs asmuo
   - Rezervacijų sąrašas su datomis
   - **Sugeneravimo laikas** (kad matytų, ar PDF senas)
   - Statusai: "Val. įskaitytos į mokyklos sistemą" arba "Atmestas"

**B. Rankinis būdas — įrašomas kodas**

Jeigu QR neveikia, mokykloje yra puslapis `socialinesvalandos.lt/verify`, kur galima įrašyti kodą ranka.

### 3. Kodėl to pakanka be fizinių parašų?

**Skaitmeninis parašas = eIDAS-compatible principai:**

1. **Šaltinio autentiškumas**: Kodas `SV-...` sugeneruojamas mūsų serveryje su HMAC-SHA256 pagal privatų raktą. Niekas kitas negali sugeneruoti tokio kodo.
2. **Turinio integralumas**: Kodas užšifruoja PDF turinio hash. Jei kas nors PDF pakeičia (pvz. valandų skaičių), QR nukreipia į kitą įrašą arba klaidos puslapį.
3. **Nepaneigiamumas**: Kiekvienas verifikacijos kodas turi tikslų sugeneravimo timestamp DB, todėl neįmanoma vėliau paneigti, kad dokumentas buvo išduotas.
4. **Fizinis parašas nereikalingas** — pagal Lietuvos eIDAS reglamentą (Nr. 910/2014), **kvalifikuotas elektroninis parašas turi tokią pačią teisinę galią** kaip ir ranka rašytas parašas. Čia mes naudojame paprastą elektroninį parašą, bet **kombinuotą su realaus laiko verifikacijos DB** — tai stipresnė garantija nei paprastas popierinis parašas, kurį galima suklastoti.

**Kas negalima suklastoti:**
- Kas nors negali "sukurti" PDF sertifikato be prieigos prie DB
- Kas nors negali "pakeisti" PDF valandų skaičiaus, nes verifikacijos puslapis rodys tikrus duomenis iš DB, ne PDF
- Kas nors negali "kopijuoti" kito mokinio kodo — kiekvienas kodas susietas su konkrečiu mokiniu

### 4. Vizualus parašo blokas PDF apačioje

PDF apačioje bus tekstas:

```
──────────────────────────────────────────────────
Elektroninis parašas / Electronic signature

Šis dokumentas yra elektroniškai pasirašytas ir
verifikuojamas realiu laiku svetainėje
socialinesvalandos.lt/verify

Verifikacijos kodas: SV-9F3K-A21B-7E4D
Sugeneravimo laikas: 2026-07-18 14:32:11 UTC
SHA-256 hash: a4f8...c2e1

Pagal eIDAS Nr. 910/2014, elektroninis parašas
turi tokią pačią teisinę galią kaip ir ranka
rašytas parašas.
──────────────────────────────────────────────────

     [QR kodas]      Nuskaityk QR arba įrašyk kodą
                     puslapyje socialinesvalandos.lt/verify
```

---

## Ką reikia sukurti (kai patvirtinsi šitą planą)

### DB pusėje
- Nauja lentelė `certificates`: `id, code, student_id, hash, payload_json, generated_at, revoked_at`
- Funkcija `generate_certificate(student_id)` — kuria įrašą + grąžina kodą + hash
- Funkcija `verify_certificate(code)` — grąžina duomenis viešai (be el. pašto, tik vardas + klasė + org + valandų sąrašas)
- RLS: `certificates` — mokinys mato savo, admin mato visus. Viešas `verify_certificate` RPC (be login) grąžina saugius laukus.

### Priedai
- PDF generavimas: `@react-pdf/renderer` arba serverio pusėje `puppeteer` → HTML → PDF. **Rekomenduoju `pdf-lib` + `qrcode` biblioteka** — veikia Cloudflare Workers runtime.
- Verifikacijos puslapis: `/verify/$code` route

### UI
- Mokinio dashboard'e mygtukas "Atsisiųsti PDF valandų sertifikatą"
- Viešas puslapis `/verify` (be login) — leidžia įrašyti kodą arba QR nuskaityti
- Mokyklos admin dashboard'e — sąrašas visų sertifikatų, kuriuos mokykla išdavė

---

## DUK

**K: Ar mokyklos priims tai realiai?**
A: Taip, jeigu su jomis suderinsi šitą metodą. Rekomenduoju pirmiausia paklausti Šeduvos gimnazijos administracijos, ar jiems tinka. Daug mokyklų jau priima el. dokumentus su QR verifikacija (pvz. e-dienynas, Manodienynas).

**K: O jei mokinys atspausdins seną PDF ir sakys, kad tai naujas?**
A: PDF matosi sugeneravimo laikas. Be to, verifikacijos puslapis rodo tikrus DB duomenis realiu laiku — jei valandos vėliau buvo panaikintos ar mokinys pašalintas, puslapis parodys "atmestas / negalioja".

**K: Ką daryti, jei mokinys nepatvirtinės, kad tai jo dokumentas?**
A: DB laiko įrašą, kas ir kada sugeneravo. Login logai + IP + timestamp. Jei prireiks, admin gali eksportuoti audito log.

**K: Ar reikia QES (kvalifikuoto elektroninio parašo su Dokobit / eID)?**
A: Kol kas — ne. Tai brangus (~500 EUR/metus per Dokobit) ir netiktų realiam moksleivių srautui. Mūsų HMAC + DB verifikacijos schema pakankama savanoriškų val. srityje. Jei ateityje švietimo ministerija reikalaus QES — galėsime prijungti Dokobit API.

---

## Kada tai bus paruošta?

Šis dokumentas — plano paaiškinimas. Kai patvirtinsi:

1. Sukursiu `certificates` lentelę + SQL
2. Sukursiu PDF generavimo server funkciją
3. Sukursiu `/verify/$code` puslapį
4. Įdėsiu mygtuką mokinio dashboard'e
5. Parodysiu tau demo su realiu PDF

Numatomas darbo laikas: ~2 iteracijos.
