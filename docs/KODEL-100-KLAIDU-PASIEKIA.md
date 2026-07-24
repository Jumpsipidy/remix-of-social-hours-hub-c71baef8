# Kodėl 100% klaidų pasiekia mane 🎯

Trumpai: mokinys kažką daro (pvz. rezervuoja valandas), kažkas nulūžta jo telefone — tu **visada** apie tai sužinai. Net jei jam dingo internetas, uždarė tab'ą, ar Supabase tuo metu miega.

## Situacija

Mokinys `Jonas` spaudžia „Rezervuoti", ir jo naršyklėje išmeta klaidą (pvz. `Cannot read properties of undefined`). Anksčiau tokia klaida galėjo tyliai nueiti niekur. Dabar ji eina per **4 sluoksnius** — kad bent vienas suveiktų.

## 4 sluoksniai (belt & suspenders)

### 1️⃣ Tiesioginis įrašas į DB
Klaida iškart bandoma įrašyti į `activity_log` per Supabase. Jei internetas geras ir user prisijungęs — bum, per <1s ji jau tavo `/admin/errors` puslapyje ir per kelias sek. Discord'e.

**Kada gali nesuveikti:** offline, RLS klaida, expired token, Supabase down.

### 2️⃣ localStorage outbox (offline queue)
Jei 1-as žingsnis **fail'ino**, klaida įmetama į naršyklės `localStorage` (`sv_error_outbox_v1`). Iš ten:
- **Kas 15 sek.** bandoma iš naujo, kol pavyks
- **Kai atgauna internetą** (`online` event) — iškart bando
- **Kai Jonas kitą kartą atsidaro svetainę** — pirmiausia išsiunčia queued klaidas
- Bandys iki **10 kartų**, tada meta (kad neužkimšt localStorage)

Reiškia: net jei Jonas metro tuneliuose ir nulūžo — kai išeis lauk, klaida atskris pas tave.

### 3️⃣ sendBeacon prieš uždarant tab'ą
Jei Jonas uždaro tab'ą su likusiom queued klaidom, naršyklė paleidžia `navigator.sendBeacon()` — tai speciali API kur naršyklė **garantuoja** išsiuntimą net jau uždaromame lange. Klaidos iškeliauja į `/api/public/error-beacon` endpoint'ą, kuris per `supabaseAdmin` (bypass'ina RLS) įrašo tiesiai į DB.

Reiškia: nesvarbu kad Jonas panikoje uždarė tab'ą — beacon vis tiek pasiekia serverį.

### 4️⃣ Discord + Email alert
Kai klaida pasiekia DB, `error-escalation.functions.ts` iškart:
- Suskaičiuoja fingerprint'ą (sugrupuoja pagal tą pačią klaidą)
- Įvertina severity (critical / high / med / low)
- Jei **critical** arba **≥3 user'iai per 90s** → **auto-lockdown** + **Discord embed** + **email**
- Instant OpenAI analizė paleidžiama fone (kodėl įvyko + super-prompt copy-paste į mane)

Tu matai **AdminErrorHUD** blyksint bet kuriame `/admin/*` puslapyje realiu laiku (Supabase Realtime channel).

## Ką dar gaudom (ne tik JS `throw`)

Prieš tai kai kurios klaidos praslysdavo pro tinklelį. Dabar gaudom:

| Klaidos tipas | Kur pagavo |
|---|---|
| `throw new Error(...)` | `window.error` listener |
| Unhandled Promise rejection | `unhandledrejection` listener |
| `console.error(...)` | Monkey-patched `console.error` |
| Supabase query errors | `logSupabaseError()` wrapper |
| **`<img>` / `<script>` / `<link>` 404** | `error` listener capture phase 🆕 |
| **`fetch()` grąžina 5xx** | `window.fetch` wrapper 🆕 |
| **`fetch()` network failure** (offline, DNS, CORS) | `window.fetch` wrapper 🆕 |
| React ErrorBoundary | `friendly-error.tsx` |
| Lovable preview overlay | `lovable-overlay-bridge.tsx` |
| Rage clicks (5 spustelėjimai per 2s) | `user-breadcrumbs.ts` |
| Silent bugs (mygtukas nereaguoja) | `user-breadcrumbs.ts` |

## Kas pasiekia tave su klaida

Kartu su klaidos žinute gauni:
- **Breadcrumbs** — paskutinių 15 user veiksmų sąrašas (kur klikino, ką rašė)
- **Session replay** — paskutinės 60s DOM įvykių timeline (kaip mini video)
- **Route** — kokiam puslapy nutiko
- **Build SHA** — kurioje deploy versijoje
- **Device meta** — telefonas / naršyklė / OS / ekrano dydis
- **User ID + email** (jei prisijungęs)
- **Fingerprint** — kad sugrupuot su ankstesniais tos pačios klaidos atvejais
- **Impact count** — kiek unique user'ių tai jau paliestė
- **Auto OpenAI analizė** — priežastis + fix'as + super-prompt tau nukopijuoti

## Ką mokinys mato

Ne raudoną stack trace, o **friendly-error ekraną**: „Įvyko klaida. Jau taisoma. Incident ID: `ERR-2K9F3`". Jis žino, kad tu apie tai žinai, ir gali paminėti ID jei reik. Zero rage.

## Kada VIS TIEK galėtų nepasiekti

Būkim realistai:
- Jei Jonas **jėga uždaro naršyklę** (task killer) prieš beacon išsiunčiant — retas atvejis, next load vis tiek išsiųs iš outbox'o.
- Jei Jonas **išvalo localStorage** tarp session'ų — labai retas atvejis, tik technikas taip daro.
- Jei **Supabase visiškai numiręs valandom** — outbox laukia iki 10 bandymų (~2.5 min), po to meta.
- Jei mokinys **užblokavęs JS** — bet tada svetainė iš viso neveiktų.

Kitais atvejais: **100% pasieks tave.**

## Failai

- `src/lib/error-log.ts` — pagrindinis capture
- `src/lib/error-outbox.ts` — offline queue + retry + beacon
- `src/routes/api/public/error-beacon.ts` — beacon serverio endpoint
- `src/lib/error-escalation.functions.ts` — Discord + email + auto-analyze
- `src/lib/user-breadcrumbs.ts` — breadcrumbs + replay + rage/silent detection
- `src/components/admin-error-hud.tsx` — realtime HUD
- `src/components/friendly-error.tsx` — mokinio matomas ekranas

## Kaip testuoti

1. `/admin/errors` → paspausk „Test alert" — Discord/email turi ateiti per <5s
2. Chrome DevTools → Network → set to **Offline** → paleisk `throw new Error("test offline")` konsole → įjunk Online atgal → per 15s ateis
3. `/admin/errors` → paspausk „Trigger test error" → naujoje kortelėje uždaryk tab'ą greitai → per 30s beacon įrašas atsiras DB
