# 🕵️ Kaip Socialinės Valandos gaudo bug'us (Gen-Z gidas)

> TL;DR — mūsų svetainė turi **automatinį bug-hunter**, kuris veikia 24/7,
> žino kurie puslapiai svarbiausi mokiniams, ir pats užrakina svetainę
> jei kažkas rimtai lūžta. Šis dokumentas paaiškina **kaip** ir **kodėl**
> tai realiai pagauna klaidas, kurias matys tavo mokinys, ne tik random
> browser noise.

---

## 🎯 Kodėl tai iš tikrųjų veikia mokiniams

Pigus bug-tracker'is loguoja **viską** — kiekvieną scroll'ą, kiekvieną
random browser warning'ą, tūkstančius eilučių šlamšto. Rezultatas: admin
niekada nemato tikrų bug'ų, nes jie paskęsta noise'e.

Mūsų sistema veikia atvirkščiai — **filtruoja agresyviai, o tai kas lieka
grupuoja pagal poveikį mokiniui**. Kiekviena error grupė atsako į vieną
klausimą: „Kiek mokinių *realiai* užstrigo dėl šito ir ar tai nulaužia
kritinį srautą (pvz. QR check-in, rezervaciją, PDF sertifikatą)?"

---

## 🧠 7 sluoksnių pipeline

### 1️⃣ Client-side filtras (`src/lib/error-log.ts`)
Prieš siunčiant į DB, mes išmetame:

- **Browser noise** — `ResizeObserver loop`, `WebGL context lost`, aborted fetch'us.
- **Extensions** — Chrome plugin'ų klaidas (jos nėra mūsų kodo problema).
- **Vite HMR** — dev-only reload artefaktus.
- **Duplicates per 30s** — tas pats vartotojas, tas pats fingerprint = 1 įrašas.

**Kodėl svarbu:** be šito filtro Discord skambėtų kas 3 sekundes su
šlamštu ir tikrą kritinę klaidą praleistum.

### 2️⃣ Breadcrumbs + Silent Bugs (`src/lib/user-breadcrumbs.ts`)
Kiekvieno mokinio browser'yje mes tyliai įrašom **paskutinius 25
veiksmus**: mygtukų paspaudimai, puslapių navigacija, form input'ai,
scroll, network fail'ai.

Dar geriau — **Silent Bug Detection** stebi paspaudimus, po kurių UI
NEREAGUOJA per 800ms. Tai suveikia net kai nėra jokios error žinutės —
tiesiog mokinys spaudo, o niekas nevyksta.

Kai galiausiai įvyksta klaida, mes turime **filmą ką mokinys darė
paskutines 30s** prieš tai kaip užstrigo.

### 3️⃣ Rage-click detektorius
Jei mokinys spaudžia **≥4 kartus per 2s** į tą patį mygtuką, sistema
supranta „jis įsiutęs" ir sukuria error report'ą su visa breadcrumb
trace, net jei nebuvo jokio JS exception'o.

**Kodėl svarbu:** dažniausiai UX bug'ai (mygtukas neveikia, formos
nesubmitina) neišmeta JS klaidos — tik mokinys keikiasi. Rage-click yra
vienintelis signalas kad esamas UI element neveikia.

### 4️⃣ Fingerprint grupavimas (`src/lib/error-fingerprint.ts`)
Ta pati klaida iš 100 vartotojų = **1 grupė**, ne 100 eilučių. Formulė:

```
fingerprint = hash(normalize(message) + firstStackFrame)
```

`normalize()` išmeta:
- UUID'us (`abc-123-...` → `<uuid>`)
- Skaičius (`line 4823` → `line <n>`)
- Path'us (`/user/42/settings` → `/user/<n>/settings`)
- Timestamp'us

Todėl `Error at line 4823` ir `Error at line 4901` yra **ta pati grupė** —
tas pats bug'as, tik su skirtingu triggeriu.

### 5️⃣ Route-weighted severity
Ne visos klaidos vienodos. Klaida ant `/checkin` yra 100× svarbesnė nei
klaida ant `/blog`. Mūsų weight'ai:

| Route | Weight | Kodėl |
|-------|--------|-------|
| `/checkin`, `/organization/scan` | ×6 | QR įsiregistravimas — mokinys neprisiregistruoja = valandos negaunamos |
| `/reservation`, `/verify` | ×5 | Rezervacijos / PDF verifikacija |
| `/auth`, `/register`, `/login` | ×4 | Nauji vartotojai neįeina |
| `/student`, `/organization`, `/school` | ×3 | Pagrindiniai dashboard'ai |
| `/admin/*` | ×1 | Admin gali pats fiksint |
| `/`, `/blog`, `/terms` | ×2 | Landing / info |

Severity score = `count × users × routeWeight × (isCritical ? 2 : 1)`,
plus regression multiplier ×1.5.

### 6️⃣ Regression tracker (`src/lib/error-resolved.ts`)
Kai spaudi „Fixinta" mygtuką ant error grupės — sistema įsimena
localStorage'e. Jei ta pati klaida **vėl** pasirodo po 30s+ nuo pažymėjimo,
grupė automatiškai flag'inasi **🔁 REGRESSION** su padidintu severity.

**Kodėl svarbu:** regresija yra pati kenkėjiškiausia klaida — mokinys
tikėjosi kad veikia, o vėl sulūžo. Sistema tai išryškina fuchsia rėmelį
kortelėje, kad admin negalėtų prasilenkti.

### 7️⃣ Deploy tag (`vite.config.ts`)
Kiekvienas error report'as neša `commit_sha` iš to build'o, kur jis
įvyko. Error Center kortelėje matai `abc1234` chip'ą — spragtelėk tam,
kad pamatytum visus errors iš to konkretaus deploy'o. Jei grupė matoma
per **kelis skirtingus build'us** (`abc1234 +2`), chip pasidaro amber —
tai chroniška problema, ne vieno deploy'o regresija.

---

## 🚨 Kada suveikia auto-lockdown

Du triggeriai:

1. **Critical threshold** — ≥2 kritinės klaidos per 3 min → lockdown.
2. **Burst detection** — ≥3 skirtingi prisijungę vartotojai gauna
   klaidas per 90s → lockdown iš karto (nebelaukiam threshold'o).

Kai suveikia:
- Svetainė užrakinama lankytojams (kodas `E-5001`)
- Admin gauna **email** su glass-morphism UI, gradient severity bar,
  „Ką matys mokinys?" panele, top-15min digest'u, ir stack trace
- Admin gauna **Discord ping** su severity bar, impact line, ir
  fingerprint field
- Push notification į admin telefoną

**Auto-recovery:** jei per 10 min neįvyksta jokios naujos kritinės
klaidos, sistema pati atrakina svetainę.

---

## 🎨 Error Center kortelės legenda

| Ženklas | Ką reiškia |
|---------|------------|
| 🔁 REGRESSION | Ši grupė buvo pažymėta „fixinta", bet grįžo. Aukščiausias prioritetas. |
| 🆕 nauja | Pirmą kartą pasirodė per pastarąsias 24h. |
| 🔥 (šalia užrašo "vartotojų") | ≥5 skirtingi vartotojai palietė šią klaidą. |
| Severity 70+ | Raudona juostelė kairėje — reikia žiūrėti dabar. |
| Severity 40-69 | Amber — svarbu, bet dar ne krizė. |
| Severity <40 | Emerald — vizualus / retas. |
| `abc1234` chip | Build (commit) kur pirma pastebėta. Amber jei matoma keliuose build'uose. |

---

## 🧪 Testavimas

`/admin/errors` → **„Nustatymai"** turi 4 test mygtukus, kurie apeina
visus filtrus:

- **Discord ping** — tik Discord pranešimas
- **Email test** — tik email visiems adminams
- **Abu kanalai** — Discord + email
- **Lockdown simuliacija** — pilnas lockdown flow (bet be realaus
  užrakinimo — sistema po kelių sekundžių atrakina)

---

## 📚 Susiję failai

- `src/lib/error-log.ts` — client + Supabase klaidų logger'is, filtrai
- `src/lib/error-fingerprint.ts` — grupavimo hash, route weights, severity
- `src/lib/error-resolved.ts` — regression tracker
- `src/lib/error-escalation.functions.ts` — email + Discord + lockdown
- `src/lib/lockdown-recovery.functions.ts` — auto-recovery po 10 min
- `src/lib/user-breadcrumbs.ts` — session replay + rage/silent detektoriai
- `src/routes/admin.errors.tsx` — Error Center UI
- `src/components/admin-error-hud.tsx` — floating HUD kiekviename admin puslapyje
