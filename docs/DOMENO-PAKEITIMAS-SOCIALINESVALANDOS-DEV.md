# Domeno pakeitimas → `socialinesvalandos.dev`

Perėjimo checklist iš `socialinesvalandos.vercel.app` į naują domeną `https://socialinesvalandos.dev` (host'inama vis dar Vercel).

---

## ✅ Ką jau padariau kode

Atnaujinau visas nuorodas kodų bazėje – nieko papildomai keisti nereikia:

- `src/routes/__root.tsx` – `hreflang`, JSON-LD (`WebSite`, `SoftwareApplication`, `Organization`, `FAQPage`) `url` laukai
- `src/routes/index.tsx`, `login.tsx`, `register.tsx`, `tasks.tsx`, `terms.tsx`, `blog.kas-yra-socialines-valandos.tsx` – `canonical` ir `og:url`
- `src/lib/email-templates/_shell.ts` – `APP_URL` (visi email'ai dabar linkina į `.dev`)
- `src/lib/error-escalation.functions.ts` – emergency email nuorodos į `/admin/lockdown` ir `/admin/errors`
- `public/sitemap.xml` – visi `<loc>` įrašai
- `public/robots.txt` – `Sitemap:` direktyva
- Docs (`GOOGLE-SEARCH-CONSOLE.md`, `PDF-SERTIFIKATAI.md`, `RECAPTCHA-SETUP.md`, `FULL-SETUP-SQL.md`, `GOOGLE-ANALYTICS-CONNECT.md`, `socialinesvalandosoverview.md`)

Deploy Vercel'yje (git push) – ir kodas gyvas per ~1 min.

---

## 🔧 Ką TAU reikia sukonfigūruoti (ne kode)

Šie dalykai gyvena už kodo ribų – juos keisti reikia ranka trečiųjų šalių pultuose.

### 1) Supabase → Authentication → URL Configuration

Būtina, kitaip OAuth'as (Google, Discord) ir email verifikacijos linkai grąžins „Invalid redirect URL".

- **Site URL**: `https://socialinesvalandos.dev`
- **Additional Redirect URLs** (pridėk visus, senų netrink kol pilnai perėjai):
  ```
  https://socialinesvalandos.dev/auth/callback
  https://socialinesvalandos.dev/update-password
  https://socialinesvalandos.dev/*
  https://socialinesvalandos.vercel.app/auth/callback   ← senas, gali laikinai palikti
  http://localhost:8080/auth/callback                   ← dev
  ```

### 2) Google Cloud Console → OAuth 2.0 Client (Google prisijungimas)

**APIs & Services → Credentials → tavo Web OAuth client ID → Edit**:

- **Authorized JavaScript origins**: pridėk
  ```
  https://socialinesvalandos.dev
  ```
- **Authorized redirect URIs**: pasilieka Supabase callback (nekeičiam):
  ```
  https://<projekto-ref>.supabase.co/auth/v1/callback
  ```
  (Šis URL keičiasi TIK jei keistum Supabase projektą – tavo atveju liks toks pat.)

### 3) Discord Developer Portal → Application → OAuth2

- **Redirects**: turi būti tas pats Supabase callback:
  ```
  https://<projekto-ref>.supabase.co/auth/v1/callback
  ```
  Discord'ui domeno pakeitimas įtakos neturi – jam svarbus tik Supabase callback.

### 4) Google Search Console

Naujas domenas = nauja **property**. Senos duomenys nepersikels automatiškai.

1. GSC → **Add property** → **URL prefix** → `https://socialinesvalandos.dev`
2. Verifikuok per HTML meta tag (atsiųsk man `content=...` reikšmę – įdėsiu į `<head>`)
3. Pateik sitemap: `sitemap.xml`
4. Senoje property (`socialinesvalandos.vercel.app`) → **Settings → Change of address** → pasirink naują property. Tai perkels SEO reitingą per ~180 d.

### 5) Google Analytics (GA4)

- **Admin → Data Streams** → atidaryk esamą stream → pakeisk **Stream URL** į `https://socialinesvalandos.dev` (Measurement ID `G-4HRBLS0E3G` **NEsikeičia** – jokių kodo pataisymų nereikia)
- **Admin → Product Links → Search Console Links** → prijunk naują GSC property

### 6) Resend (email siuntimas)

Jei siunti per `pagalba@socialinesvalandos.lt` – DNS įrašai lieka `.lt` domene. Nekeičia.

Jei nori siųsti iš `@socialinesvalandos.dev`:
- Resend → **Domains → Add Domain** → `socialinesvalandos.dev`
- Pridėk DKIM/SPF TXT įrašus į `.dev` DNS (Vercel Domains arba kur bebūtų registruotas)
- Kai statusas = **Verified**, atnaujink `from:` reikšmę `src/lib/email.functions.ts`

### 7) Vercel domeno konfigūracija (patikra)

Vercel → Project → **Settings → Domains**:
- ✅ `socialinesvalandos.dev` – **Primary**
- ✅ `www.socialinesvalandos.dev` – redirect į primary
- 🔁 `socialinesvalandos.vercel.app` – palik veikiantį kol viskas migruos, po ~1 mėn. gali išimti

### 8) reCAPTCHA (jei naudoji)

Google reCAPTCHA admin → **Settings → Domains** → pridėk `socialinesvalandos.dev`. Site key nesikeičia.

---

## 🧪 Kaip patikrinti, kad viskas veikia

Po deploy'o (git push → Vercel automatiškai):

1. Atidaryk `https://socialinesvalandos.dev` incognito – turi krautis normaliai
2. **Google prisijungimas**: `/login` → „Google" → grąžina į `/auth/callback` → toliau į dashboard'ą. Jei metasi „Invalid redirect URL" – dar nepridėta į Supabase Redirect URLs (žingsnis 1)
3. **Discord** – tas pats
4. **Email registracija** – ateinantis kodas / laiškas turi linkinti į `socialinesvalandos.dev`
5. `https://socialinesvalandos.dev/sitemap.xml` – URL'ai turi būti su nauju domenu
6. `curl -I https://socialinesvalandos.vercel.app` – dar veikia, bet vėliau 308 redirect'insi į `.dev` (Vercel Settings → Domains → Redirect)

---

## 📋 Trumpa priminimų forma (kad nepamirštum)

- [ ] Supabase → Site URL + Redirect URLs
- [ ] Google Cloud OAuth → Authorized JavaScript origins
- [ ] Google Search Console → nauja property + Change of address
- [ ] GA4 → Data Stream URL
- [ ] Resend domenas (jei siųsi iš `.dev`)
- [ ] Vercel primary domain patvirtintas
- [ ] reCAPTCHA domenas pridėtas

Kai pasiruoši OAuth'ą (Google/Discord/Supabase redirect'us) – rašyk, padėsiu žingsnis po žingsnio.
