# Environment kintamieji (Vercel / hosting)

Visi raktai, kuriuos kodas realiai skaito. Pažymėti **BŪTINA** — be jų svetainė
neveiks arba lūš dalis funkcijų.

## 1. Kliento pusė (matomi naršyklėje — tik vieši raktai!)

| Raktas | Statusas | Reikšmė |
|---|---|---|
| `VITE_SUPABASE_URL` | **BŪTINA** | `https://bacqlmhfokfnmoexijkj.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | **BŪTINA** | Supabase anon (publishable) raktas |
| `VITE_SUPABASE_PROJECT_ID` | BŪTINA | `bacqlmhfokfnmoexijkj` |
| `VITE_SUPABASE_ANON_KEY` | pasirinktinai | atsarginis aliasas anon raktui |
| `VITE_MAPILLARY_TOKEN` | pasirinktinai | gatvės vaizdų peržiūra prie užduočių |

## 2. Serverio pusė (NIEKADA su `VITE_` prefiksu)

| Raktas | Statusas | Kam |
|---|---|---|
| `SUPABASE_URL` | **BŪTINA** | serverio funkcijos |
| `SUPABASE_PUBLISHABLE_KEY` | **BŪTINA** | vieši serverio skaitymai |
| `SUPABASE_SERVICE_ROLE_KEY` | **BŪTINA** | admin operacijos, mokyklos duomenys |
| `SB_URL` / `SB_PUBLISHABLE_KEY` / `SB_SERVICE_ROLE_KEY` | pasirinktinai | atsarginiai aliasai tiems patiems raktams |
| `CERT_SIGNING_SECRET` | BŪTINA sertifikatams | PDF sertifikatų HMAC parašas (32+ hex) |
| `LOCKDOWN_BYPASS_CODE` | BŪTINA lockdown'ui | super admin apėjimo kodas |
| `RESEND_API_KEY` | BŪTINA el. paštui | laiškų siuntimas |
| `RECAPTCHA_SITE_KEY` | rekomenduojama | captcha (kliento pusė perduodama per serverį) |
| `RECAPTCHA_SECRET_KEY` | rekomenduojama | captcha patikra |
| `OPENAI_API_KEY` | pasirinktinai | AI klaidų analizė `/admin/errors` |
| `DISCORD_WEBHOOK_URL` | pasirinktinai | kritinių klaidų pranešimai |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_JWK`, `VAPID_SUBJECT` | pasirinktinai | push pranešimai |
| `SESSION_SECRET` | pasirinktinai | vidinė sesijų pasirašymo paslaptis |
| `SENTRY_AUTH_TOKEN` | **BŪTINA Sentry source maps** | tik Vercel build metu įkelia source map failus; pridėti Vercel → Project Settings → Environment Variables ir pažymėti Production + Preview |

## 3. Patikra po deploy

1. `/status` — turi rodyti „Supabase: OK“.
2. Prisijunk kaip mokinys — skydelis turi užsikrauti be balto ekrano.
3. `/admin` → Lockdown — bypass kodas turi suveikti (reiškia `LOCKDOWN_BYPASS_CODE` matomas serveryje).
4. Sertifikato atsisiuntimas — jei krenta, trūksta `CERT_SIGNING_SECRET`.
