# Google Analytics / Google Cloud Console → Socialinės Valandos

Klausimas: *"Ar galiu prijungti Google Cloud Console prie savo Analytics puslapio, kad duomenys būtų dar tikslesni?"*

Trumpas atsakymas: **taip, bet ne per "Cloud Console" — reikia Google
Analytics 4 (GA4) + BigQuery arba Data API.** Cloud Console yra tik
prieigos/valdymo skydelis; realūs analitikos duomenys gyvena **GA4**.

Yra **3 lygiai**, nuo lengviausio iki galingiausio.

---

## Lygis 1 — GA4 skriptas (5 min., nemokamai)

Prijungi Google Analytics 4 kaip **antrą duomenų šaltinį**. Mano
vidinis `activity_log` toliau lieka pagrindinis (jame turime sesijų
kelius ir realų laiką), o GA4 duoda:

- tikslų geografinį buvimą (miestas/šalis) — mums to trūksta
- automatinį botų filtravimą
- konversijų piltuvus per Google Ads / Search Console susiejimą
- 14 mėn. istoriją nemokamai

### Kaip prijungti

1. `https://analytics.google.com` → **Admin → Create Property**
2. Pridėti **Web data stream** → nurodyti `jumpsipidy.online`
3. Nukopijuoti **Measurement ID** (`G-XXXXXXXXXX`)
4. Į `.env`:
   ```
   VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
   ```
5. Į `src/routes/__root.tsx` `head()` funkciją pridėti skriptą:
   ```tsx
   scripts: [
     { src: `https://www.googletagmanager.com/gtag/js?id=${import.meta.env.VITE_GA_MEASUREMENT_ID}`, async: true },
     { children: `window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${import.meta.env.VITE_GA_MEASUREMENT_ID}');` },
   ]
   ```

Duomenys pasirodys per ~24 val. GA4 realaus laiko rodinys veikia iškart.

**Trūkumas:** duomenys **nepasirodo** mano analytics puslapyje —
tenka atsidaryti GA4. Todėl yra lygis 2.

---

## Lygis 2 — GA4 Data API embed'as (~2 val., nemokamai iki 50k užklausų/parą)

Įtraukiu GA4 skaičius **tiesiai** į mano `admin.analytics.tsx` — greta
mano `activity_log` duomenų. Vartotojas mato:

- kairė pusė: mano tikslūs realaus laiko duomenys iš Supabase
- dešinė pusė: GA4 širdis (šalys, miestai, kanalai, konversijos)

### Ką reikia iš Cloud Console

1. `console.cloud.google.com` → **APIs & Services → Enable APIs**
2. Įjungti **"Google Analytics Data API v1"**
3. **Credentials → Create → Service Account** → suteikti rolę
   `Viewer`
4. **Keys → Add key → JSON** → atsisiųsti raktą
5. `analytics.google.com` → Admin → **Property Access** → pridėti tą
   service account el. paštą kaip **Viewer**

### Kaip prijungti prie apps

Nauja server funkcija:

```typescript
// src/lib/ga4.functions.ts
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const ga4Report = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // 1) verify admin (like admin-super.functions.ts does)
    // 2) call GA4 Data API
    const res = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${process.env.GA4_PROPERTY_ID}:runReport`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${await getGoogleAccessToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
          dimensions: [{ name: "country" }, { name: "city" }, { name: "deviceCategory" }],
          metrics: [{ name: "activeUsers" }, { name: "screenPageViews" }, { name: "averageSessionDuration" }],
        }),
      },
    );
    return await res.json();
  });
```

`getGoogleAccessToken()` mainų JSON raktą į OAuth bearer'į
(`google-auth-library` npm paketas, ~15 eilučių).

Secrets:

```
GA4_PROPERTY_ID=            # nuo GA4 Admin → Property Settings
GA4_SERVICE_ACCOUNT_JSON=   # visas raktas JSON turinys (vieno eilute)
```

Tada mano `admin.analytics.tsx` prideda naują `<ChartCard>` "Geografija
(GA4)" ir viskas.

---

## Lygis 3 — BigQuery Export (mokama, ~$5/mėn., neribotai)

Kai norėsi **žaisti su neapdorotais GA4 eilutėmis SQL** (pvz. suplakti
GA4 sesijas su savo `reservations` lentele, kad matytum "kiek rezervacijų
per Google Ads kampaniją"), tai daroma per BigQuery export'ą.

1. Google Cloud → **Enable Billing** (butinas, bet naudos ~$1-5/mėn.)
2. **BigQuery API** → įjungti
3. GA4 Admin → **BigQuery Links → Link** → pasirinkti savo GCP projektą
4. GA4 kasdien mesta neapdorotus event'us į `analytics_XXXXX.events_YYYYMMDD` lentelę
5. Prijungiam BigQuery per `@google-cloud/bigquery` npm į naują server fn
6. Rašom SQL join'us tarp GA4 ir Supabase (per `user_id` ar `session_id`)

Šitas žingsnis **niekam nereikalingas**, kol nedarai marketing'o
kampanijų arba nesuprati unit economics'o.

---

## Rekomendacija

| Situacija | Lygis |
|---|---|
| "Noriu tik geografijos ir tikslesnio bot'ų filtravimo" | **1** |
| "Noriu, kad GA4 duomenys būtų mano analytics puslapyje" | **2** |
| "Turiu ~500€/mėn. marketing budget'ą ir noriu ROI SQL" | **3** |

Šiuo metu turi ~20 event'ų. Su tokiu srautu **Lygis 1** yra tobulas —
GA4 pritraukia tik tada, kai srautas viršija ~1000 vartotojų/mėn.

### Ar reikia Cloud Console per se?

**Ne.** Cloud Console yra tik "durys" į:
- API įjungimą (Lygis 2)
- Billing (Lygis 3)
- Service account raktus (Lygis 2, 3)

GA4 pats gyvena `analytics.google.com`, ne `console.cloud.google.com`.

---

## Alternatyva be Google (jei privatumas svarbu)

- **Plausible.io** — 9€/mėn., open-source, GDPR safe, 1 skriptas,
  turi Stats API — prijungimas identiškas Lygis 2 procesui
- **Umami** — nemokama, self-hosted, jau turi Vercel deploy button
- **PostHog** — nemokama iki 1M event'ų/mėn., turi ir feature flag'us

Visi trys turi geresnį privatumą nei GA4 ir nereikalauja cookies consent
banner'io.
