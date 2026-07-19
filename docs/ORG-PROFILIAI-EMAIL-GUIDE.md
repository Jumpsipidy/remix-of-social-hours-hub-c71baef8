# 🚀 Organizacijų profiliai + Google Maps + Email notifikacijos

Pilnas gidas kaip įdiegti tris naujas funkcijas į **Socialinės Valandos**:

1. **Organizacijų profiliai** (logo, nuotraukos, aprašymas, kontaktai, adresas)
2. **Google Maps / Street View** integracija (rodo kur organizacija yra Radviliškio r.)
3. **Email notifikacijos** su gražiu HTML dizainu (kai patvirtinamos valandos + kitos)

> Nieko dar nekeičiau kode. Šitas failas = tavo planas + visi SQL/env žingsniai. Kai pasakysi „darom" — pradedu koduoti.

---

## 📦 1 DALIS — Organizacijų profiliai

### 1.1 Ką pridedam

Kiekviena organizacija (`profiles.role = 'organization'`) turės:
- **Logo** (kvadratinis, ~256×256)
- **Cover / hero nuotrauka** (16:9, viršus profilio)
- **Galerija** (iki 6 nuotraukų iš veiklos)
- **Aprašymas** (`bio`, iki 1000 simbolių, palaiko eilutes)
- **Kontaktai**: telefonas, el. paštas (viešas), FB/IG/tinklapio nuoroda
- **Adresas + koordinatės** (lat/lng — reikia Google Maps'ui)
- **Miestas** (Radviliškis, Šeduva, Baisogala, Sidabravas, Grinkiškis, Šeduva, Tyruliai ir t.t.)
- **Veiklos tagai** (senjorai, gyvūnai, aplinkosauga, renginiai…)

### 1.2 SQL — nauji stulpeliai `profiles` lentelėje

```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS logo_url          TEXT,
  ADD COLUMN IF NOT EXISTS cover_url         TEXT,
  ADD COLUMN IF NOT EXISTS gallery_urls      TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS bio               TEXT,
  ADD COLUMN IF NOT EXISTS public_email      TEXT,
  ADD COLUMN IF NOT EXISTS phone             TEXT,
  ADD COLUMN IF NOT EXISTS website_url       TEXT,
  ADD COLUMN IF NOT EXISTS facebook_url      TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url     TEXT,
  ADD COLUMN IF NOT EXISTS address           TEXT,
  ADD COLUMN IF NOT EXISTS city              TEXT,
  ADD COLUMN IF NOT EXISTS latitude          NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS longitude         NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS activity_tags     TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS profile_verified  BOOLEAN NOT NULL DEFAULT false;

-- Anon skaitymas jau apribotas per `can_view_profile` — nauji stulpeliai
-- automatiškai paklūsta esamai RLS. Papildomų policies nereikia.

NOTIFY pgrst, 'reload schema';
```

### 1.3 SQL — Supabase Storage bucketai

Naudojam **du bucketus** (viešus — tai marketing turinys, ne asmens duomenys):

```sql
-- Bucketai kuriami per Supabase Dashboard → Storage → New bucket
-- ARBA per SQL:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('org-logos',  'org-logos',  true, 2097152,  ARRAY['image/png','image/jpeg','image/webp']),
  ('org-photos', 'org-photos', true, 5242880,  ARRAY['image/png','image/jpeg','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- RLS: tik pati organizacija gali įkelti į savo aplanką (path prefix = user id)
CREATE POLICY "Org can upload own logo"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('org-logos','org-photos')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Org can update own logo"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id IN ('org-logos','org-photos')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Org can delete own logo"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id IN ('org-logos','org-photos')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Public read org media"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id IN ('org-logos','org-photos'));
```

Failo path'as: `{user_id}/logo.webp`, `{user_id}/gallery/{uuid}.jpg`.

### 1.4 UI — kur atsiras

- **`/organization` dashboard** → naujas tab „Mano profilis" su forma (upload + text fields + map picker)
- **`/tasks`** → kortelė rodo org logo + miestą + tagus
- **`/org/$id`** *(naujas viešas route)* → pilnas profilis: hero cover, logo, bio, galerija, žemėlapis, aktyvios užduotys

---

## 🗺️ 2 DALIS — Google Maps + Street View

### 2.1 Kodėl Google Maps (o ne OpenStreetMap)

- Street View. Radviliškio rajone yra visur. Atrodo pro. OSM to neturi.
- „Iš dėžutės" gražus dark mode stilius
- Address autocomplete kai org veda savo adresą

### 2.2 Ką reikia iš tavęs

**Google Cloud Console → APIs & Services → Credentials:**

1. Sukurk projektą (arba naudok esamą)
2. Enable šiuos API:
   - **Maps JavaScript API** (žemėlapiui)
   - **Places API (New)** (adreso autocomplete)
   - **Street View Static API** (statiškas street view kortelėse)
3. Sukurk **API key** → apriboj HTTP referrer'ais:
   ```
   https://socialinesvalandos.lt/*
   https://*.vercel.app/*
   http://localhost:*
   ```
4. Įdek į **Vercel → Settings → Environment Variables**:
   ```
   VITE_GOOGLE_MAPS_API_KEY = AIza...
   ```

> ⚠️ Šitas **publikinis** raktas — jis skirtas naršyklei. Ne server-side. Referrer apribojimai apsaugo nuo abuse.

### 2.3 Kaip naudosim

**Org profilyje** (`/org/$id`):
```
┌─────────────────────────────────────┐
│  [Interaktyvus žemėlapis su pin'u]  │  ← Maps JavaScript API
├─────────────────────────────────────┤
│  [Street View "peek" nuotrauka]     │  ← Street View Static API
│  „Pažiūrėk kaip atrodo vietoje →"   │
└─────────────────────────────────────┘
```

**Užduočių kortelėse** (`/tasks`) — mažas static map thumbnail (labai pigus, 1 tile).

**Adreso vedimas** — Places Autocomplete → grąžina `lat`/`lng` → įrašom į `profiles.latitude/longitude` (nebereikia geocoding'o vėliau).

### 2.4 Radviliškio r. bounds

Autocomplete apribosim į Radviliškio rajoną (nebus atsitiktinių Vilniaus adresų):
```ts
componentRestrictions: { country: 'lt' }
bounds: { north: 56.10, south: 55.55, east: 24.10, west: 23.20 }
strictBounds: true
```

### 2.5 Kaina

- Maps JS API: **$7 / 1000 loads** — pirmi $200/mėn nemokami (≈28k peržiūrų)
- Street View Static: **$7 / 1000**
- Places Autocomplete: **$2.83 / 1000 sessions**

Realiai: Radviliškio r. projektui — **0 EUR/mėn** (telpa į free tier).

---

## 📧 3 DALIS — Email notifikacijos

### 3.1 Kokį provider'į naudojam

**Resend** — tinkamiausias:
- 3000 email/mėn nemokamai
- HTML palaiko puikiai
- Custom domain (`no-reply@socialinesvalandos.lt`)
- Paprastas REST API, iš TanStack server function'o

Alternatyvos: Mailgun (šiek tiek sudėtingiau), SendGrid (per didelis šitam).

### 3.2 Ką reikia iš tavęs

1. **Susikurk Resend paskyrą** → https://resend.com
2. **Pridėk savo domain** (arba naudok jų `onboarding@resend.dev` testam)
   - Reikia pridėti 3 DNS TXT/MX/CNAME įrašus savo domain registrar'e
   - Resend duoda tikslius įrašus
3. **Sukurk API raktą** → Dashboard → API Keys → New
4. Įdek į **Vercel**:
   ```
   RESEND_API_KEY = re_...
   EMAIL_FROM = "Socialinės Valandos <no-reply@socialinesvalandos.lt>"
   PUBLIC_APP_URL = https://socialinesvalandos.lt
   ```

### 3.3 SQL — email eilė + suppression list

```sql
-- Kokie tipai kviečia email'us
CREATE TYPE public.email_kind AS ENUM (
  'hours_confirmed',       -- „Tavo X val. patvirtintos"
  'reservation_approved',  -- „Tavo rezervacija priimta"
  'reservation_declined',  -- „Rezervacija atmesta"
  'new_message',           -- „Nauja žinutė pokalbyje" (throttle!)
  'certificate_ready',     -- „Sertifikatas paruoštas"
  'org_access_granted',    -- „Tavo org paskyra sukurta"
  'weekly_digest'          -- opciona: savaitės santrauka
);

CREATE TABLE public.email_outbox (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  to_email       TEXT NOT NULL,
  kind           public.email_kind NOT NULL,
  payload        JSONB NOT NULL DEFAULT '{}'::jsonb,
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','sent','failed','skipped')),
  attempts       INT NOT NULL DEFAULT 0,
  last_error     TEXT,
  scheduled_for  TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON public.email_outbox (status, scheduled_for) WHERE status = 'pending';
CREATE INDEX ON public.email_outbox (user_id, kind, created_at DESC);

GRANT SELECT ON public.email_outbox TO authenticated;
GRANT ALL    ON public.email_outbox TO service_role;
ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own emails"
  ON public.email_outbox FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Vartotojo prefs (unsubscribe per email tipą)
CREATE TABLE public.email_preferences (
  user_id  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  hours_confirmed       BOOLEAN NOT NULL DEFAULT true,
  reservation_status    BOOLEAN NOT NULL DEFAULT true,
  new_message           BOOLEAN NOT NULL DEFAULT true,
  certificate_ready     BOOLEAN NOT NULL DEFAULT true,
  weekly_digest         BOOLEAN NOT NULL DEFAULT false,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.email_preferences TO authenticated;
GRANT ALL ON public.email_preferences TO service_role;
ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own prefs" ON public.email_preferences
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Bounce/complaint suppression (Resend webhook rašys)
CREATE TABLE public.email_suppressions (
  email       TEXT PRIMARY KEY,
  reason      TEXT NOT NULL,   -- 'bounce' | 'complaint' | 'unsubscribe'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.email_suppressions TO service_role;
ALTER TABLE public.email_suppressions ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
```

### 3.4 Kaip veikia flow'as

```
[Org paspaudžia „Patvirtinti valandas"]
        ↓
[award_reservation_hours() RPC — jau egzistuoja]
        ↓
[Naujas trigger AFTER UPDATE ON reservations WHEN status→'completed']
        ↓
[INSERT INTO email_outbox (kind='hours_confirmed', payload={...})]
        ↓
[pg_cron kas 1 min → server function `/api/public/email/drain`]
        ↓
[Server fn: paima 20 pending, siunčia per Resend, žymi 'sent']
```

### 3.5 SQL — trigger'is „valandos patvirtintos"

```sql
CREATE OR REPLACE FUNCTION public.enqueue_hours_confirmed_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  student_email TEXT;
  org_name TEXT;
  student_prefs BOOLEAN;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    SELECT p.email INTO student_email FROM public.profiles p WHERE p.id = NEW.student_id;
    SELECT COALESCE(p.organization_name, p.full_name) INTO org_name
      FROM public.profiles p WHERE p.id = NEW.organization_id;
    SELECT COALESCE(ep.hours_confirmed, true) INTO student_prefs
      FROM public.email_preferences ep WHERE ep.user_id = NEW.student_id;

    IF student_email IS NOT NULL AND COALESCE(student_prefs, true) = true THEN
      INSERT INTO public.email_outbox (user_id, to_email, kind, payload)
      VALUES (
        NEW.student_id,
        student_email,
        'hours_confirmed',
        jsonb_build_object(
          'hours', NEW.hours_to_earn,
          'org_name', org_name,
          'reservation_id', NEW.id,
          'reservation_date', NEW.reservation_date
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_email_hours_confirmed ON public.reservations;
CREATE TRIGGER trg_email_hours_confirmed
  AFTER UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_hours_confirmed_email();
```

Panašiai kursim: `reservation_approved`, `reservation_declined`, `certificate_ready`.

### 3.6 SQL — pg_cron drain

```sql
SELECT cron.schedule(
  'email-drain',
  '* * * * *',  -- kas 1 min
  $$
  SELECT net.http_post(
    url := 'https://socialinesvalandos.lt/api/public/email/drain',
    headers := jsonb_build_object(
      'content-type','application/json',
      'x-drain-secret', current_setting('app.email_drain_secret', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Nustatom bendrą DB secret'ą (rankomis vieną kartą):
ALTER DATABASE postgres SET app.email_drain_secret = 'sugalvok-random-32-char-string';
```

*(Į Vercel taip pat pridedam tą patį `EMAIL_DRAIN_SECRET` — server fn tikrina header'į.)*

### 3.7 HTML email dizainas — „valandos patvirtintos"

Bazinis stilius (mano stiliaus, dark navy + emerald accent, matching tavo web):

```html
<!DOCTYPE html>
<html lang="lt">
<body style="margin:0;background:#0b1220;font-family:'Inter',system-ui,sans-serif;color:#e2e8f0;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
    <div style="text-align:center;margin-bottom:24px;">
      <img src="https://socialinesvalandos.lt/logo.png" width="56" height="56" alt="SV"
           style="border-radius:16px;"/>
      <div style="font-weight:800;font-size:14px;letter-spacing:.15em;color:#60a5fa;margin-top:8px;">
        SOCIALINĖS VALANDOS
      </div>
    </div>

    <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);
                border:1px solid rgba(96,165,250,.25);border-radius:20px;padding:28px;">
      <div style="display:inline-block;background:rgba(16,185,129,.15);color:#34d399;
                  padding:6px 12px;border-radius:999px;font-size:12px;font-weight:600;">
        ✅ VALANDOS PATVIRTINTOS
      </div>
      <h1 style="font-size:24px;margin:16px 0 8px;color:#f8fafc;">
        Sveikas, tavo {{hours}} valandos {{org_name}} buvo sėkmingai patvirtintos! 🎉
      </h1>
      <p style="color:#94a3b8;line-height:1.6;margin:0 0 20px;">
        Puikus darbas! Valandos jau įskaitytos į tavo progresą. Kai surinksi visas
        reikalingas — galėsi atsisiųsti oficialų sertifikatą PDF formatu.
      </p>

      <div style="background:rgba(15,23,42,.6);border-radius:14px;padding:16px;margin:20px 0;">
        <div style="display:flex;justify-content:space-between;font-size:13px;color:#94a3b8;">
          <span>Organizacija</span><span style="color:#e2e8f0;font-weight:600;">{{org_name}}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:13px;color:#94a3b8;">
          <span>Data</span><span style="color:#e2e8f0;font-weight:600;">{{reservation_date}}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:13px;color:#94a3b8;">
          <span>Valandos</span><span style="color:#34d399;font-weight:700;">+{{hours}} val.</span>
        </div>
      </div>

      <a href="{{app_url}}/student"
         style="display:block;text-align:center;background:linear-gradient(135deg,#3b82f6,#8b5cf6);
                color:#fff;text-decoration:none;padding:14px 20px;border-radius:12px;
                font-weight:700;font-size:14px;">
        Peržiūrėk savo progresą →
      </a>
    </div>

    <p style="text-align:center;font-size:11px;color:#64748b;margin-top:24px;">
      Šį laišką gavai nes esi Socialinės Valandos vartotojas.<br/>
      <a href="{{app_url}}/settings/notifications" style="color:#60a5fa;">Pakeisti pranešimus</a> ·
      <a href="{{app_url}}/unsubscribe?token={{unsub_token}}" style="color:#60a5fa;">Atsisakyti</a>
    </p>
  </div>
</body>
</html>
```

Kiti template'ai (`reservation_approved`, `new_message` ir t.t.) atrodys panašiai — tas pats layout, skirtingas badge + turinys.

### 3.8 Rate limiting

- **`new_message`**: max 1 email per 30 min per user (kad chat'as neužtvindytų inbox'ą)
- **Kitos**: real-time, be limitų
- Suppressed email → automatiškai `status='skipped'`

---

## 🗂️ 4 DALIS — Ką užkoduosiu (kai duosi ženklą)

### Frontend
- [ ] `src/routes/org.$id.tsx` — viešas org profilis
- [ ] `src/components/org-profile-editor.tsx` — form'a org dashboarde
- [ ] `src/components/image-upload.tsx` — drag&drop + resize prieš įkeliant
- [ ] `src/components/google-map-card.tsx` — Maps JS API wrapper
- [ ] `src/components/street-view-preview.tsx` — static street view kortelė
- [ ] `src/components/address-autocomplete.tsx` — Places autocomplete
- [ ] `src/routes/settings.notifications.tsx` — email prefs

### Backend (server functions)
- [ ] `src/lib/email/send.functions.ts` — pagrindinis siuntimas per Resend
- [ ] `src/lib/email/templates/*.tsx` — React → HTML render'inimas
- [ ] `src/routes/api/public/email.drain.ts` — cron'as kviečia
- [ ] `src/routes/api/public/email.webhook.ts` — Resend bounce/complaint
- [ ] `src/routes/unsubscribe.$token.tsx` — 1-click unsub

### Secrets Vercel'yje
```
VITE_GOOGLE_MAPS_API_KEY   = AIza...
RESEND_API_KEY             = re_...
EMAIL_FROM                 = Socialinės Valandos <no-reply@socialinesvalandos.lt>
EMAIL_DRAIN_SECRET         = <random 32 char>
PUBLIC_APP_URL             = https://socialinesvalandos.lt
```

### Supabase secret (per SQL, vieną kartą)
```sql
ALTER DATABASE postgres SET app.email_drain_secret = 'tas pats string kaip Vercel'yje';
```

---

## ✅ Tavo TO-DO prieš pradedant

1. [ ] Google Cloud → sukurk API raktą (Maps JS + Places + Street View)
2. [ ] Resend paskyra → API raktas + verified domain (arba pradžiai `onboarding@resend.dev`)
3. [ ] Vercel env vars sukišti (5 aukščiau išvardinti)
4. [ ] Pasakyk man „darom" → aš:
   - Paleisiu visas migracijas iš karto
   - Sukoduosiu visus komponentus, route'us, template'us
   - Prijungsiu triggerius
   - Ištestuosiu vieną valandų patvirtinimo flow'ą end-to-end

Kai turėsi raktus paruoštus — cook time. 🍳
