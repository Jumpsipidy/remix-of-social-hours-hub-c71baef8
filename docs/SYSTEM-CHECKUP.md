# Supabase SQL Reference & Feature Audit

Toliau pateikiama informacija apie esamą duomenų bazės būseną ir būtinus raktus.

## 1. Reikalingi API raktai (Environment Variables)

Šie raktai turi būti nustatyti Lovable „Secrets“ skiltyje, kad visos funkcijos veiktų:

| Raktas | Kam naudojamas | Statusas |
|--------|--------------|----------|
| `OPENAI_API_KEY` | AI klaidų analizė (`/admin/errors`) | Privalomas AI analizei |
| `RESEND_API_KEY` | El. laiškų siuntimas (patvirtinimai, registracija) | Privalomas komunikacijai |
| `RECAPTCHA_SITE_KEY` | reCAPTCHA apsauga (kliento pusė) | Rekomenduojamas apsaugai |
| `RECAPTCHA_SECRET_KEY` | reCAPTCHA apsauga (serverio pusė) | Rekomenduojamas apsaugai |
| `DISCORD_WEBHOOK_URL` | Pranešimai apie kritines klaidas į Discord | Pasirinktinis |
| `VAPID_PUBLIC_KEY` | Naršyklės Push pranešimai | Jau sugeneruotas |
| `VAPID_PRIVATE_JWK` | Naršyklės Push pranešimai | Jau sugeneruotas |
| `CERT_SIGNING_SECRET` | PDF sertifikatų HMAC pasirašymas | Jau sugeneruotas (32+ hex) |

---

## 2. Pagrindinės SQL funkcijos (Patikra)

Visos funkcijos jau yra įdiegtos tavo Supabase projekte (`bacqlmhfokfnmoexijkj`).

### 2.1. Valandų skyrimas (`award_reservation_hours`)
Naudojama organizacijų, kai jos užbaigia užduotį.
```sql
-- Statusas: ĮDIEGTA
-- Funkcija perkelia hours_to_earn į mokinio profilį ir uždaro rezervaciją.
SELECT * FROM public.award_reservation_hours('reservation_uuid');
```

### 2.2. Pasikartojančių užduočių generavimas (`generate_recurring_tasks`)
Generuoja užduotis 14 dienų į priekį pagal šablonus.
```sql
-- Statusas: ĮDIEGTA (pg_cron: 03:15 UTC kasdien)
SELECT public.generate_recurring_tasks();
```

### 2.3. Sveikatos patikra (`run_deep_health_scan`)
Tikrina RLS, orfaniškus įrašus ir sistemos vientisumą.
```sql
-- Statusas: ĮDIEGTA (pg_cron: kas 10 min)
SELECT public.run_deep_health_scan();
```

---

## 3. pg_cron Užduotys

Patikrink ar šios užduotys aktyvios tavo Supabase:
```sql
SELECT jobname, schedule, active FROM cron.job;
```
1. `purge-messages-hourly` - kas valandą (trina >12 d. žinutes).
2. `purge-dm-15m` - kas 15 min (trina >2 d. DM).
3. `recurring-tasks-daily` - kasdien 03:15.
4. `health-scan-auto` - kas 10 min.

---

## 4. Admin paskyros statusas
- **El. paštas:** `gamingdooper0@gmail.com`
- **Rolė:** `admin` (visos teisės).
