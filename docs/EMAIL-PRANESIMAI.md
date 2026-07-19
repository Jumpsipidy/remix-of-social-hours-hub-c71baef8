# 📧 Email pranešimai — 3 dalis (Resend)

Šis vadovas paaiškina **žingsnis po žingsnio** kaip įjungti automatinius email pranešimus, kai organizacija patvirtina mokinio valandas.

> **Kontekstas:** Tavo Supabase Auth jau naudoja Resend paskyros SMTP slaptažodžio priminimui ir email patvirtinimui. Tai yra kitas dalykas — čia mes siunčiam **savus custom email'us** iš savo kodo (ne per Supabase Auth). Reikia atskiro API rakto.

---

## ✅ Kas jau padaryta (kodas)

Aš jau sukūriau visą infrastruktūrą:

| Failas | Ką daro |
|---|---|
| `src/lib/email.functions.ts` | TanStack server function `sendHoursConfirmedEmail` |
| `src/lib/email-templates/hours-confirmed.ts` | Modernus HTML template (gradientai, "3D" medalė, progreso juosta) |
| `src/routes/organization.tsx` | Automatiškai kviečia email siuntimą po `finalizeCompleted` |

Kai organizacija paspaudžia **„Patvirtinti ir uždaryti užduotį"** modaliniame lange:
1. RPC `award_reservation_hours` prideda valandas
2. Automatinė sistemos žinutė nueina į pokalbį
3. **📧 Email nueina mokiniui** (šis žingsnis)

Jei `RESEND_API_KEY` nenustatytas — funkcija tyliai praleidžia siuntimą (nekrenta), tad kodas veikia ir be rakto.

---

## 🚀 Ką TU turi padaryti (5 minutės)

### 1️⃣ Sukurk Resend API raktą

1. Eik į [resend.com/api-keys](https://resend.com/api-keys)
2. Paspausk **„Create API Key"**
3. Pavadinimas: `socialinesvalandos-app` (bet koks)
4. Permission: **Sending access** (užtenka)
5. Nukopijuok raktą (`re_...`) — jis rodomas tik vieną kartą!

### 2️⃣ Verifikuok savo domeną Resend'e

Jei dar neverifikavai domeno (dažniausiai jau turi, nes veikia password reset):

1. Resend → **Domains** → **Add Domain**
2. Įvesk `socialinesvalandos.lt`
3. Pridėk parodytus DNS įrašus (SPF, DKIM, DMARC) savo domeno tiekėjui
4. Palauk ~10 min. → statusas **„Verified"** ✅

> ⚠️ **Svarbu:** jeigu domenas dar neverifikuotas, gali laikinai naudoti `onboarding@resend.dev`, bet tie email'ai eis **tik tavo paties inbox'ą** (Resend account owner). Realiam vartotojui reikalingas verifikuotas domenas.

### 3️⃣ Pridėk API raktą į Lovable secrets

Aš pasiruošiau formą — įvesk raktą į saugų laukelį (žr. žinutę žemiau).

### 4️⃣ Pakoreguok `from` adresą (jei reikia)

`src/lib/email.functions.ts`, 6 eilutė:
```ts
const FROM = "Socialinės Valandos <noreply@socialinesvalandos.lt>";
```

Pakeisk į savo verifikuotą adresą. Rekomendacija:
- `noreply@` — automatiniams pranešimams
- `labas@` arba `info@` — jei nori atsakymų

### 5️⃣ Vercel'yje pridėk env kintamąjį

Kad email veiktų ir production'e:

1. Vercel Dashboard → tavo projektas → **Settings → Environment Variables**
2. Add: `RESEND_API_KEY` = `re_...` (tas pats raktas)
3. Environments: **Production, Preview, Development**
4. Redeploy

---

## 🧪 Kaip testuoti

1. Prisijunk kaip **organizacija**
2. Turėk aktyvią rezervaciją su moksleiviu (statusas `approved` / "Vykdoma")
3. Paspausk **„Užbaigti ir patvirtinti"** → įskaityk žymos langelį → **„Patvirtinti"**
4. Per ~5 sekundes mokinio inbox'e turi atsirasti email

**Nemato email'o?** Patikrink:
- [ ] `RESEND_API_KEY` teisingai išsaugotas (nėra spaces, prasideda `re_`)
- [ ] Domenas Resend'e statusas **Verified**
- [ ] `from` adresas naudoja verifikuoto domeno subdomeną
- [ ] Naršyklės konsolėje nėra klaidų
- [ ] Resend Dashboard → **Logs** rodo issiųstą pranešimą
- [ ] Mokinio spam folderyje

---

## 🎨 Kaip atrodo email

Email dizainas atitinka appso stiliu:

- **Tamsi paletė** (`#0a0f1e`) su ambient gradient švytėjimu (indigo + emerald)
- **3D medalė** su layered gradient + inset shadow (atrodo iškilus)
- **Didelis „+X val." chip** su gradient border (indigo→cyan→emerald) ir gradient text
- **Progreso juosta** rodo `earned/needed` su glowing fill
- **Meta grid** — data + vieta
- **CTA button** su 3D shadow (indigo→violet→cyan)

Email klientų palaikymas:
- ✅ Apple Mail / iOS Mail — pilnas gradient + shadow
- ✅ Gmail web — pilnas gradient
- ✅ Gmail mobile app — gradient
- ⚠️ Outlook desktop — fallback į plokščias spalvas (bet vis dar gražu)

---

## 🔧 Kaip pridėti daugiau email tipų

Struktūra jau paruošta plėtimui. Pvz. nori „Rezervacija patvirtinta" email'o:

**1)** Sukurk `src/lib/email-templates/reservation-approved.ts` (kopijuok `hours-confirmed.ts`, pakoreguok tekstą)

**2)** `src/lib/email.functions.ts` — pridėk naują server function:
```ts
export const sendReservationApprovedEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ reservationId: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    // ... panaši logika kaip sendHoursConfirmedEmail
  });
```

**3)** Iškviesk iš atitinkamo vietos (pvz. `organization.tsx` → `approveReservation`):
```ts
sendReservationApprovedEmail({ data: { reservationId: r.id } }).catch(console.warn);
```

**Idėjos ateityje:**
- Nauja rezervacija (orgai gauna) — kviečia `handleReserve` po insert
- Rezervacija atmesta (mokinys gauna) — kviečia `declineReservation`
- Priminimas 24h prieš darbą — Supabase cron + edge function
- Certifikatas paruoštas — kai `hours_earned >= hours_needed`

---

## 🛡️ Saugumo pastabos

- Server function turi `.middleware([requireSupabaseAuth])` — reikalauja prisijungusio vartotojo
- Papildoma check'ina, kad kviečiantis būtų **organizacijos savininkas** arba **admin**
- Mokinio email gaunamas per RLS-scoped query (ne per admin client)
- `RESEND_API_KEY` gyvena tik server-side (`process.env`) — niekada nepatenka į naršyklę
- Klaidos loginamos, bet **niekada** neblokuoja UI (fire-and-forget)

---

## 💰 Kainos

Resend nemokamas planas:
- **3,000 email/mėn** — daugiau nei pakankamai mokyklos dydžio projektui
- **100 email/dieną** — apribojimas
- Jei viršys — €20/mėn 50k email'ų

Realiam skaičiavimui: 1 mokykla × 100 mokinių × 5 patvirtinimai/mėn = 500 email. Telpi.

---

## 📚 Nuorodos

- [Resend Dashboard](https://resend.com/emails)
- [Resend API dokumentai](https://resend.com/docs/api-reference/emails/send-email)
- [DNS setup guide](https://resend.com/docs/dashboard/domains/introduction)
