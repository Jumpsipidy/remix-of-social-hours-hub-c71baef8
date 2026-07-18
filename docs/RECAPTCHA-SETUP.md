# Google reCAPTCHA (nemokamas) — pilnas nustatymo gidas

Šis projektas jau turi CAPTCHA sistemą:

- **Automatinis matematinis fallback** — veikia iš karto, be jokio nustatymo. Naudotojas turi išspręsti paprastą uždavinį (pvz. `3 + 7 = ?`).
- **Google reCAPTCHA v2 "I'm not a robot" checkbox** — įsijungia automatiškai, kai tik nustatysi `RECAPTCHA_SITE_KEY` ir `RECAPTCHA_SECRET_KEY` secretus. Naudojame v2, nes ji nemokama neribotai (v3 taip pat nemokama iki 1M užklausų/mėn).

Kur CAPTCHA veikia:

1. **Prisijungimo puslapyje** (`/login`) — pasirodo po 3 nesėkmingų slaptažodžio bandymų.
2. **Lockdown bypass modaliniame lange** — pasirodo po 3 nesėkmingų `jumpsipidy` kodo bandymų. Prieš tai — 350ms uždelsimas + augantis penalty už kiekvieną nesėkmę. Po 5 bandymų — 15 min visiškas blokavimas.

---

## 1 žingsnis — Sukurk reCAPTCHA raktus (nemokamai)

1. Eik į **https://www.google.com/recaptcha/admin/create**
2. Prisijunk su savo Google paskyra (ta pačia kaip Cloud Console).
3. Užpildyk formą:
   - **Label** (etiketė): `Socialinės Valandos` (arba bet koks pavadinimas).
   - **reCAPTCHA type**: pasirink **reCAPTCHA v2** → **"I'm not a robot" Checkbox**.
   - **Domains**: pridėk **kiekvieną** domainą iš kurio bus naudojama:
     ```
     socialinesvalandos.lovable.app
     id-preview--b12c58a1-1550-4e6a-93e7-8505f8674e00.lovable.app
     localhost
     ```
     Jei turi custom domain — pridėk ir jį.
   - **Owners**: paliek save (galima pridėti daugiau el. paštų).
   - Pažymėk **"Accept the reCAPTCHA Terms of Service"**.
   - Nepažymėk **"Send alerts to owners"** jeigu nenori spam'o.
4. Paspausk **Submit**.

Gausi du raktus:

- **Site Key** (viešas, dedamas į HTML) — atrodo maždaug taip: `6Lc_XXXXXXXXXXXXXXXXXXXXXXXXXXX`
- **Secret Key** (privatus, tik serveryje!) — atrodo maždaug taip: `6Lc_YYYYYYYYYYYYYYYYYYYYYYYYYYY`

**⚠️ NIEKADA neatskleisk Secret Key. Neįkelk jo į kodo bazę, neišspausdink, nepublikuok.**

---

## 2 žingsnis — Įrašyk raktus į Lovable Cloud

Chat'e parašyk man:

> "Įrašyk RECAPTCHA_SITE_KEY ir RECAPTCHA_SECRET_KEY į secretus"

Aš atidarysiu saugią formą, kur galėsi tiesiog įklijuoti abu raktus. Jie bus išsaugoti backend'e ir bus prieinami tik serverio kodui — niekada nebus išsiųsti į naršyklę.

Arba jei nori padaryti pats:
1. Atidaryk **Lovable Cloud Secrets** panelį (Settings → Secrets).
2. Sukurk du secretus:
   - `RECAPTCHA_SITE_KEY` → įklijuok Site Key
   - `RECAPTCHA_SECRET_KEY` → įklijuok Secret Key
3. Išsaugok.

---

## 3 žingsnis — Patikrink, kad veikia

1. Perkrauk savo dev preview (arba palauk kol atsiskleis prod).
2. Eik į `/login`.
3. Įvesk teisingą el. paštą bet neteisingą slaptažodį **3 kartus**.
4. Po 3-io bandymo turėtų pasirodyti Google reCAPTCHA checkbox ("I'm not a robot") vietoj matematinio klausimo.
5. Paspausk checkbox → jei matai žalią varnelę, viskas veikia ✅.

Jei matai matematinį klausimą vietoj Google widget'o:
- Patikrink, kad `RECAPTCHA_SITE_KEY` yra išsaugotas (`fetch_secrets` mano pusėje).
- Patikrink, kad domain'as sutampa su tuo, kurį pridėjai reCAPTCHA admin puslapyje.
- Atidaryk browser DevTools → Console. Jei matai `ERR_BLOCKED_BY_CLIENT` — kažkas turi ad-blockerį, kuris blokuoja Google reCAPTCHA. Tai normalu (jiems parodys math fallback).

Jei matai "Invalid site key" naršyklės tinkle:
- Patikrink, kad Site Key nukopijuotas be tarpų.
- Patikrink, kad domain'as YRA prijungtas reCAPTCHA admin puslapyje.

---

## Kaip veikia security stack'as (nuo silpniausio iki stipriausio sluoksnio)

1. **HMAC-pasirašytas math challenge** (fallback). Serveris generuoja klausimą + HMAC signature. Naudotojas negali atspėti atsakymo užklausiai, kurios neišdavė serveris.
2. **reCAPTCHA v2 Google patikrinimas**. Serveris siunčia token'ą į `https://www.google.com/recaptcha/api/siteverify` su Secret Key. Google atsako `success: true/false`.
3. **IP-bound HMAC proof**. Sėkmingai išsprendus CAPTCHA, serveris išduoda 10 min galiojantį token'ą pririštą prie IP fingerprint (HMAC-SHA256 su service role key). Kitas request'as (pvz. bypass kodo įvedimas) turi pridėti šį proof, kuris verifikuojamas server-side.
4. **Rate limiting**. 5 nesėkmingi kodo bandymai per 10 min → 15 min lockout. Kiekvienas nesėkmingas bandymas prideda 250ms uždelsimą.
5. **Timing-safe compare**. Visi HMAC ir kodo palyginimai naudoja `crypto.timingSafeEqual` — negalima brute-force'inti pagal atsako laiką.

Rezultatas: net jeigu botas apeitų front-end'ą ir siųstų POST užklausas tiesiogiai, jam vis tiek reikėtų:
- **išspręsti Google reCAPTCHA** (arba HMAC-pasirašytą math challenge), kad gautų proof token'ą,
- **turėti tą patį IP** iš kurio buvo išduotas proof,
- **spėti per 10 minučių** (proof TTL),
- **neviršyti 5 bandymų per 10 min** (rate limit).

---

## Kur galima pridėti CAPTCHA daugiau vietų

Komponentas `<Captcha onVerify={(proof) => ...} />` iš `@/components/captcha` yra plug-and-play. Prideda tur vietose kur norisi žmogaus patvirtinimo:

- Slaptažodžio atkūrimo formoje (`/forgot-password`)
- Registracijos formoje jei bijai bot signup'ų
- Bug report formoje jei kas nors ją spam'ina

Jei norėsi kurioje nors iš šių vietų — pasakyk man ir prijungsiu per vieną žinutę.

---

## Kaina

- **reCAPTCHA v2** — 100% nemokama, jokio limit'o.
- **reCAPTCHA v3** — nemokama iki 1M užklausų/mėn. Jei norėtum score-based (be checkbox) — praneški.
- **Lovable Cloud secretai** — nemokami.
- **Google `siteverify` API** — nemokamas.

Jokių papildomų mokesčių nėra.
