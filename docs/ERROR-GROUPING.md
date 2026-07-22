# 🕵️ Klaidų medžioklė — Socialinių Valandų error paieškos sistema

> **Gen-z TL;DR:** Kai kažkas lūžta — sistema pati susieškos, sugrupuos, priskirs prioritetą ir, jei rimta, uždarys svetainę kol tu ateisi fixinti. Nereikia žiūrėti į logus rankomis kaip dinozaurams. Viskas veikia automatiškai. **Zero SQL, zero setup.**

---

## 🧠 Kaip apskritai randame klaidas

Klaidos į sistemą ateina iš **7 skirtingų vietų**. Kiekviena vieta turi savo mažą „šnipą" kuris pagauna ir siunčia į `activity_log`:

### 1. **Browser JS errors** (`window.onerror` + `unhandledrejection`)
Kai lūžta React komponentas arba Promise `.catch()` niekas nepagavo — mūsų globalus hook'as pagauna. Fiksuojama: žinutė, stack trace, path, browser, OS.

Failas: `src/lib/error-log.ts` → `installGlobalErrorHandlers()`.

### 2. **Vite / Lovable overlay bridge**
Kartais dev-server'is arba Lovable preview parodo savo raudoną overlay'ų su klaida — bet ta klaida nebuvo iš mūsų JS. Būdavo, matai overlay, bet log tuščias. **Fix:**

`LovableOverlayBridge` (`src/components/lovable-overlay-bridge.tsx`) kas 500ms tikrina DOM'e ar yra `vite-error-overlay` ar `[data-lovable-error-overlay]` elementas. Jei yra — automatiškai išsiurbia tekstą + stack ir įkiša į mūsų log'ą. Bonus: prideda mygtuką „Siųsti adminams" tiesiai ant overlay'aus, jei kažkodėl tekstas nebuvo pagautas.

### 3. **Rage clicks** (frustracijos detekcija)
Jei vartotojas per 1.5s spusteli tą patį mygtuką ≥3 kartus — vadinasi kažkas neveikia arba jis pyksta. Tai fiksuojam kaip `ui.rageclick`. Failas: `src/lib/user-breadcrumbs.ts`.

### 4. **Fetch klaidos + failed responses**
Kiekvienas `fetch()` yra apvyniotas — jei atsakymas `>=500` arba `network error`, log'as gauna `fetch.error` su statusu, URL'u ir latency.

### 5. **Server function errors**
TanStack `createServerFn` handleriai apvyniojami `try/catch` — jei mesta klaida, siunčia `server.error` su fingerprintu.

### 6. **Auto health scan** (SQL funkcija `run_deep_health_scan`)
Kas 10 min pati DB paleidžia 18 patikrų: ar RLS įjungta ant kritinių lentelių, ar `has_role` egzistuoja, ar seniai neatnaujintų žinučių, ar admin egzistuoja, ir t.t. Jei randa `critical_failures > 0` — automatiškai įjungia lockdown.

### 7. **Manual reports** (bug report widget)
Vartotojas gali paspausti mažą bug'o piktogramą apačioje ir pats parašyti. Šie eina į `bug_reports` lentelę atskirai.

---

## 🧬 Fingerprint — magija kaip 1000 klaidų tampa 1 grupe

**Problema:** Ta pati klaida (`Cannot read properties of null (reading 'id')`) gali pasitaikyti 200 vartotojų. Log'e — 200 eilučių. Neįmanoma suprasti kas svarbu.

**Sprendimas:** Kiekviena klaida gauna 7-simbolių `#fingerprint` ID pagal jos **rūšį**, ne pagal konkretų atvejį. Failas: `src/lib/error-fingerprint.ts`.

### Kaip skaičiuojasi (5 žingsniai):

**1. Normalizuojam žinutę** — pašalinam viską, kas keičiasi tarp atvejų:

| Iš | Į |
|---|---|
| `Cannot find user 4f8a-abc1-...` | `Cannot find user <uuid>` |
| `Timeout after 3000ms` | `Timeout after <n>ms` |
| `Failed fetch /api/tasks/42` | `Failed fetch <url>` |
| `Error at line 145 in file.js` | `Error at <file>` |
| `Hash: a1b2c3d4e5f6789...` | `Hash: <hash>` |

**2. Paimam pirmą stack kadrą** (be eilutės numerių):
- `at StudentDashboard (student.tsx:142:15)` → `StudentDashboard student.tsx`

**3. Sujungiam:** `Cannot find user <uuid> | StudentDashboard student.tsx`

**4. Hash'inam FNV-1a → base36 → paimam 7 simbolius:** → `#a3f9c2b`

**5. Voila.** Dvi klaidos gauna tą patį `#a3f9c2b` jei rūšis ta pati, net jei UUID skirtingas.

### Ką tai reiškia praktiškai:
- ✅ Vietoj 200 eilučių — matai **1 grupę su count=200**.
- ✅ Nedelsdamas matai, kad tai daug vartotojų paveikia, ne tik vieną.
- ✅ Kai pataisai — visa grupė uždaroma iš karto.

---

## 🎯 Severity — kaip nusprendžiam, kas rimta

Ne visos klaidos vienodos. Vienam vartotojui vieną kartą lūžo `ResizeObserver` = whatever. Bet 30 vartotojams lūžo `TypeError` prieš checkout = **YIKES**. Formulė (`severityScore` funkcija):

```
severity = min(100, round(
    users     × 15    +   // kiek unikalių žmonių pataikė
    paths     × 5     +   // kiek skirtingų puslapių
    critical  × 10    +   // kritinių įvykių (escalation/burst/lockdown)
    log(count) × 8    +   // bendras kiekis (log kad nepersistengtų)
    (≤1h  ? 20 : ≤24h ? 10 : 0)  // šviežumo bonus
))
```

### Spalvų kodavimas:
- 🟢 **0–39** — chill, žemas prioritetas
- 🟡 **40–69** — pažiūrėti verta
- 🔴 **70–100** — **FIX NOW** (raudona kortelė + spalvota juostelė)

---

## 🚨 Burst detekcija — kada sistema pati užsidaro

Kai kartas nuo karto kokia klaida — norm. Bet jei **≥3 skirtingi vartotojai per 90 sekundžių** susiduria su ta pačia klaida (tas pats fingerprintas) — tai **burst**. Reiškia:
- Kažkoks svarbus feature'as lūžo
- Deploy'as sugriuvo
- Regresija po pakeitimo

Sistema tada:
1. Įjungia **auto-lockdown** su kodu `E-4002`
2. Vartotojai mato „Sistema stabilizuojama, grįžk už 10 min"
3. Adminui siunčia **prioritetinį email** (X-Priority: 1) su top klaidomis
4. Push notification (jei įjungęs)
5. Rodo raudoną alertą admin HUD'e realtime

Failas: `src/lib/error-escalation.functions.ts` → funkcija `notifySecurityEvent`.

---

## 🔄 Auto-recovery — kada sistema pati atsirakina

Būtų lame, jei lockdown'as liktų amžinai kai jau nieko blogo nebūna. Todėl `lockdown-recovery.functions.ts` kas 60 sek. tikrina:
- Ar per pastaras **10 min** nebuvo NAUJŲ kritinių klaidų grupių?
- Ar `run_deep_health_scan()` grąžina `critical_failures = 0`?

Jei taip — automatiškai `UPDATE site_settings SET lockdown_enabled = false`. Vartotojai grįžta be admin įsikišimo.

Aišku, super adminas visada gali rankiniu būdu atrakinti per `/admin/lockdown` bet kada.

---

## 🎛️ Admin Error HUD — realtime widget

Visose `/admin/*` puslapiuose kampe (bottom-right) plaukioja mažas widget'as (`src/components/admin-error-hud.tsx`):

- **Skaitiklis:** kiek unikalių grupių per pastarą val.
- **Pulsuoja** (raudonai) kai atsiranda nauja klaida
- **Spustelėjus** → nuveda tiesiai į `/admin/errors`
- **Slepiasi** kai lockdown išjungtas ir 0 klaidų → nekemša ekrano

---

## 🔍 Kaip ieškoti klaidos rankiniu būdu (`/admin/errors`)

Puslapyje yra 6 skiltys:

| Skiltis | Ką rasi |
|---|---|
| **Live** | Real-time feed'as, kiekvienoje eilutėje `#fp` chip'as |
| **Top** | **Grupuota pagal fingerprintą** + severity + trend sparkline |
| **Sources** | Breakdown pagal puslapį / naršyklę / OS |
| **Trends** | 24h srauto grafikai |
| **Health** | Sveikatos patikros rezultatai |
| **Escalation** | Burst įvykiai + lockdown istorija |

### Trick'ai paieškai:
1. **Įrašyk `#a3f9c2b`** filtre → matai visus tos grupės eilutes.
2. Įjunk **Regex mode** → pvz. `TypeError.*null` — matys visas panašias.
3. Pasirink laiko langą (`1h`, `24h`, `7d`) — sumažins triukšmą.
4. Rikiuok grupes pagal **Severity / Kiekis / Vartotojai / Naujausia**.
5. Įjunk **🆕 Tik nauja (24h)** — matys tik REGRESIJAS, ne senas žinomas problemas.
6. **Nutildyk** žinomą triukšmingą grupę (pvz. `ResizeObserver loop`) → dingsta iš sąrašo, bet skaičiuojasi.

---

## 📧 Ką email'as sako, kai kažkas lūžta

Adminui gaunamas email atrodo taip (glassmorphism dizainas):

```
🚨 KRITINĖ KLAIDA · Socialinės Valandos
────────────────────────────────────
Kodas: E-4002 · Burst (5 vartotojai / 90s)
Fingerprint: #a3f9c2b (Severity 87)

TOP 3 grupės:
• #a3f9c2b  TypeError: null.id  · 47× · 12 usr
• #b7e1904  Failed fetch /api  · 15× · 8 usr
• #c2d8517  Timeout after <n>ms · 9× · 3 usr

Sistema užsirakino automatiškai.
[Peržiūrėti /admin/errors →]
```

Su `X-Priority: 1` header'iu — telefonas garsiai pypsės.

---

## 🎬 Session Replay — matai KAS vartotojas veikė prieš crash'ą

Kiekvieno vartotojo naršyklėje `user-breadcrumbs.ts` fiksuoja paskutines **25 veiksmus** (in-memory, ne DB):
- Kliksai (su ARIA label)
- Navigacijos (route changes)
- Scrollai
- Tab visibility (perėjo į kitą kortelę?)
- Fetch success/fail
- Resize (pakeitė orientaciją?)

Kai įvyksta klaida — visa breadcrumb istorija siunčiama kartu su klaida. `/admin/errors` klaidos detalėse matai **timeline**:

```
14:23:01  → /tasks
14:23:05  click "Rezervuoti"
14:23:07  fetch OK /api/reservations (240ms)
14:23:08  click "Patvirtinti"
14:23:08  fetch FAIL /api/verify (500, 890ms)  ⚠
14:23:08  💥 TypeError: null.id  ← CRASH
```

Iš šio timeline'o iškart matai, kad `/api/verify` grąžino 500 ir NEXT millisec'ą lūžo UI. Reiškia problema serveryje, ne UI. **Debug'as be minčių skaitymo.**

---

## 🧹 Ką NEreikia daryti

- ❌ Nereikia rašyti jokio SQL — `activity_log.meta` yra `jsonb`.
- ❌ Nereikia jokių trečių šalių (Sentry, Datadog, LogRocket) — pilnai savarankiška.
- ❌ Nereikia migrucijų — viskas jau paruošta.
- ❌ Nereikia diegti npm paketų — viskas built-in.

---

## 🎯 Verifikacija — ar veikia

1. Atidaryk browser'io DevTools console, įrašyk: `throw new Error("test-fp-check")`.
2. Per 5 sek eik į `/admin/errors` → „Top" skiltis.
3. Turėtum matyti naują grupę su fingerprintu, „🆕 nauja" žymu, severity ~40 (1 usr, 1 path).
4. Įrašyk tą pačią klaidą dar 2x su skirtingais suffix'ais: `throw new Error("test-fp-check foo")`, `throw new Error("test-fp-check bar")`.
5. **Ta pati grupė** turi tapti `count=3`, severity padidėti. Fingerprintas nepasikeičia.

Jei taip veikia — sistema OK. 🎉

---

## 📂 Failai kurie viską daro

| Failas | Rolė |
|---|---|
| `src/lib/error-fingerprint.ts` | Normalizavimas, fingerprint, severity |
| `src/lib/error-log.ts` | Global handlers + logging pipeline |
| `src/lib/user-breadcrumbs.ts` | Session replay + rage click |
| `src/components/lovable-overlay-bridge.tsx` | Vite/Lovable overlay pagavimas |
| `src/components/admin-error-hud.tsx` | Real-time widget |
| `src/routes/admin.errors.tsx` | UI: Live/Top/Sources/Trends/Health/Escalation |
| `src/lib/error-escalation.functions.ts` | Burst detekcija + email + lockdown trigger |
| `src/lib/lockdown-recovery.functions.ts` | Auto-atrakinimas |
| DB funkcija `run_deep_health_scan()` | 18 patikrų + auto-lockdown |
| DB funkcija `auto_lockdown_if_unhealthy()` | Cron wrapper |

**Sistema pilnai advanced, pilnai autonominė, pilnai vizualiai suprantama.** 🚀
