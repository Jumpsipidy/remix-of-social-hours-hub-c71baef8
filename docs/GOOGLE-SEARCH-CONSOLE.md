# Google Search Console – Pilnas Vadovas

Šis vadovas paaiškina, kaip pridėti **Socialinės Valandos** svetainę į Google Search Console (GSC), patvirtinti nuosavybę, pateikti sitemap ir stebėti, kaip Google indeksuoja tavo puslapius.

---

## Kodėl to reikia?

Google Search Console yra **nemokamas** Google įrankis, kuris parodo:
- Kiek žmonių mato tavo svetainę Google paieškoje
- Kokių raktažodžių jie ieško
- Kokie puslapiai indeksuojami (arba kodėl ne)
- Mobilaus naudojimo problemos
- Saugumo įspėjimai
- Kaip Google „mato" tavo svetainę

**Be GSC svetainė vis tiek atsiras Google, bet be duomenų negalėsi optimizuoti.**

---

## 1 žingsnis – Prisijunk prie GSC

1. Atidaryk 👉 [https://search.google.com/search-console](https://search.google.com/search-console)
2. Prisijunk su ta pačia **Google paskyra**, kurią naudosi ilgą laiką (patariama – ne asmeninė mokyklos, o pastovi)
3. Spausk **„Start now"**

---

## 2 žingsnis – Pridėk savo svetainę (Property)

Yra 2 tipai:

| Tipas | Kada rinktis |
|---|---|
| **Domain** (rekomenduojama, jei turi savo domeną) | Jei naudoji `socialinesvalandos.lt` – reikės DNS TXT įrašo |
| **URL prefix** ✅ | Jei naudoji `socialinesvalandos.lovable.app` arba Vercel domeną – lengviausias variantas |

### URL prefix variantas (rekomenduojamas šiam projektui)

1. Spausk **„Add property"** → **URL prefix**
2. Įvesk pilną URL su `https://` ir be pasvirojo brūkšnio pabaigoje:
   ```
   https://socialinesvalandos.lovable.app
   ```
   arba jei turi Vercel:
   ```
   https://socialinesvalandos.vercel.app
   ```
3. Spausk **Continue**

---

## 3 žingsnis – Patvirtink nuosavybę (Verification)

Google turi įsitikinti, kad svetainė tikrai tavo. Yra 4 būdai – **HTML meta tag** yra lengviausias mūsų atveju.

### Būdas A – HTML meta tag ✅ (rekomenduojamas)

1. GSC parodys tokį kodą:
   ```html
   <meta name="google-site-verification" content="ABC123xyz..." />
   ```
2. **Nukopijuok tik `content` reikšmę** (be `<meta>` dalies).
3. Pasakyk man chat'e: *„Pridėk Google verification kodą: ABC123xyz..."* – aš įdėsiu jį į `src/routes/__root.tsx` `head()` funkciją.
4. Kai svetainė persideploys (Vercel padaro automatiškai per ~1 min), grįžk į GSC ir spausk **„Verify"**.
5. ✅ Turėtų parodyti „Ownership verified".

### Būdas B – DNS TXT įrašas (jei turi savo domeną)

1. GSC parodys TXT reikšmę: `google-site-verification=ABC123...`
2. Eik į savo domeno registratoriaus DNS nustatymus (Hostinger, Cloudflare, Namecheap...)
3. Pridėk naują **TXT** įrašą:
   - **Host/Name:** `@` (arba tuščia)
   - **Value:** `google-site-verification=ABC123...`
   - **TTL:** 3600
4. Palauk 5–30 minučių (kartais iki 24h)
5. Grįžk į GSC → **Verify**

---

## 4 žingsnis – Pateik sitemap.xml

Sitemap padeda Google greičiau surasti visus puslapius. Šis projektas **jau turi** sitemap!

1. GSC kairėje meniu → **Sitemaps**
2. Įrašyk:
   ```
   sitemap.xml
   ```
3. Spausk **Submit**
4. Po kelių minučių statusas turėtų būti ✅ **Success**

Patikrinti gali čia: `https://tavo-domenas.com/sitemap.xml`

---

## 5 žingsnis – Paprašyk indeksavimo (URL Inspection)

Kad Google greičiau indeksuotų svarbiausius puslapius:

1. GSC viršuje esančiame paieškos lauke įvesk pilną URL, pvz.:
   ```
   https://socialinesvalandos.lovable.app/
   ```
2. Spausk Enter
3. Spausk **„Request indexing"**
4. Palauk 1–2 min – Google užklaus puslapį

**Pakartok** su šiais URL:
- `/` (pagrindinis)
- `/tasks` (užduočių sąrašas)
- `/verify` (sertifikatų tikrinimas)
- `/login`
- `/register`

⚠️ Yra limitai (apie 10–20 užklausų per dieną).

---

## 6 žingsnis – Sekimo įsijungimas (Performance)

Po **3–7 dienų** GSC pradės rodyti duomenis:

- **Performance** → matai užklausas, spustelėjimus, CTR, poziciją
- **Coverage** → matai kurie puslapiai indeksuoti / neindeksuoti
- **Enhancements** → mobilus naudojimas, Core Web Vitals
- **Links** → kas linkina į tavo svetainę

---

## 7 žingsnis – Google Analytics ryšys (papildomai)

Projekte jau įdiegtas Google Tag `G-4HRBLS0E3G`. Kad GSC ir GA susijungtų:

1. GA4 → **Admin** → **Product Links** → **Search Console Links**
2. **Link** → pasirink savo GSC property
3. ✅ Dabar GA matys paieškos duomenis

---

## Dažnai užduodami klausimai

**K: Kiek laiko užtrunka, kol atsirasiu Google?**
A: 1–14 dienų nuo verifikavimo ir sitemap pateikimo. Nauji puslapiai – kelios valandos iki paros.

**K: Kodėl mano puslapis „Crawled – currently not indexed"?**
A: Google nusprendė, kad puslapis mažai vertingas. Sprendimas: unikalus turinys, geras `<title>` / `<meta description>`, vidinės nuorodos. Šis projektas jau turi geras meta žymes.

**K: Ar reikia atskiro verifikavimo Vercel ir Lovable domenui?**
A: Taip – kiekvienas skirtingas domenas = atskira property. Verta pridėti abu, kol nusprendi kurį naudoti ilgai.

**K: Ką daryti, jei ateityje pridėsiu savo domeną (pvz. `socialinesvalandos.lt`)?**
A: Pridėk jį kaip naują property, verifikuok per DNS, ir GSC senojoje property paspausk **Change of Address**, kad SEO reitingas persineštų.

---

## Ką jau padariau už tave

✅ `robots.txt` leidžia visiems Google crawler'iams  
✅ `sitemap.xml` automatiškai sugeneruotas su visais viešais puslapiais  
✅ Meta žymės (title, description, og:*, twitter:*) kiekvienam route  
✅ JSON-LD struktūriniai duomenys (SoftwareApplication, FAQ, Organization)  
✅ `hreflang="lt"` pažymėta kalba  
✅ `llms.txt` – atskiras vadovas AI paieškos varikliams

**Tau lieka tik:** verifikuoti nuosavybę + pateikti sitemap. Viską kitą Google padarys pats.

---

## Verifikacijos kodo pridėjimas – trumpai

Kai turėsi GSC meta tag kodą, atsiųsk man jį taip:

> „Pridėk į svetainę Google verification kodą: `abc123XYZ...`"

Aš per 30 sek. įdėsiu jį į `<head>`, tu persideploy'insi, ir spausi Verify.

Sėkmės! 🚀
