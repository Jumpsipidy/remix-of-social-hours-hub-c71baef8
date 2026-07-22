# Discord Webhook — realaus laiko klaidų alertai

Kai svetainėje įvyksta kritinė klaida arba automatiškai įsijungia **lockdown**, sistema iškart pinguoja tavo Discord kanalą — greičiau nei email pasiekia telefoną.

## Ką pamatysi Discorde

- 🔒 **LOCKDOWN alertai** — kai auto-lockdown įsijungia (raudona embed)
- 🚨 **Kritinės klaidos** — kai fingerprint pasiekia P1 severity (oranžinė embed)
- 🔥 **Burst alertai** — kai ≥3 vartotojai gauna klaidas per 90s (roselinė)
- 📈 **Regression** — kai nauja fingerprint grupė pasirodo po deploy (violetinė)

Kiekvienoje embed matai: klaidos žinutę, kelią (`/checkin`, `/student`…), severity, fingerprint ID ir mygtuką „Atidaryti Error Center".

## Setup — 3 žingsniai

### 1. Sukurk webhook Discorde

1. Atidaryk kanalą, kur nori gauti alertus (rekomenduoju privatų `#alerts`)
2. **Channel Settings** → **Integrations** → **Webhooks** → **New Webhook**
3. Pavadink „Socialinės Valandos Monitor", nustatyk avatarą (nebūtinai)
4. Paspausk **Copy Webhook URL** — atrodys taip:
   ```
   https://discord.com/api/webhooks/1234567890/AbCdEfGh...
   ```

⚠️ **Šis URL yra slaptas** — bet kas jį turintis gali post'inti į tavo kanalą.

### 2. Įrašyk kaip secret'ą

Kai paklausiu — įklijuok URL į saugią formą. Vardas: `DISCORD_WEBHOOK_URL`.

Jei nori pridėti rankiniu būdu vėliau:
- Lovable projektas → **Settings** → **Secrets** → **Add secret**
- Name: `DISCORD_WEBHOOK_URL`
- Value: pilnas Discord webhook URL

### 3. Testas

Prisijungęs kaip super admin:
1. Eik į **`/admin/errors`** → **Nustatymai** → **Trigger test error**
2. Per ~3s turi ateiti geltona embed į tavo Discord kanalą
3. Jei neatėjo — patikrink Lovable logs (paieškos „discord")

## Kaip veikia (advanced)

- Webhook siunčiamas iš to paties `escalateAppError` server function, kur ir email
- Naudoja `fetch` be `keepalive` — Cloudflare Worker friendly
- Jei URL nenustatytas → tyliai praleidžia (nesugriauna email flow)
- Rate limit: tas pats 15 min dedupe kaip email — nesispam'ins
- Timeout: 3s (jei Discord lėtas, neblokuoja lockdown)
- Fingerprint ID įdedamas į embed footer — vienu žvilgsniu matai ar tas pats bug'as ar naujas

## Discord kanalo tvarkymas

**Rekomenduoju struktūrą:**
```
#alerts        ← visi P0/P1
#alerts-info   ← P3 warnings (jei nori)
#lockdown-log  ← tik lockdown įjungimai/išjungimai
```

Šiuo metu viskas eina į vieną kanalą (tą, kuriam sukūrei webhook). Nori atskirti? Sukurk kelis webhookus ir pasakyk — pridėsiu `DISCORD_WEBHOOK_URL_LOCKDOWN` atskirai.

## Išjungti alertus

Nenori Discord alertų? Tiesiog ištrink `DISCORD_WEBHOOK_URL` secret'ą Lovable Settings. Sistema automatiškai grįš prie email-only mode.

## Troubleshooting

**„Nieko neateina"**
- Patikrink secret'as išsaugotas: Settings → Secrets → `DISCORD_WEBHOOK_URL` matomas
- Trigger test error iš `/admin/errors`
- Discord kanale patikrink kad webhook nebuvo panaikintas (Integrations → Webhooks)

**„Ateina bet be embed, tik plain text"**
- Reiškia Discord API grąžino error — pažiūrėk `activity_log` `action=app.discord_fail`

**„Per daug spam'ina"**
- Sistema jau dedup'ina 15 min. Jei per daug — pakelk `EMAIL_DEDUPE_MIN` `error-escalation.functions.ts` (paveiks ir email)
