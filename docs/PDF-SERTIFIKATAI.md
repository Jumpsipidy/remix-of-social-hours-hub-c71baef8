# PDF sertifikatai — greitas gidas

Ši funkcija leidžia moksleiviams atsisiųsti oficialų PDF su QR kodu, kurį mokykla gali patikrinti realiu laiku.

## Kaip veikia

1. Moksleivis paspaudžia „📄 Atsisiųsti PDF sertifikatą" savo dashboarde.
2. Serveris:
   - sugeneruoja kodą `SV-XXXX-XXXX-XXXX`
   - suskaičiuoja SHA-256 turinio hash'ą
   - pasirašo HMAC-SHA256 su slaptu raktu (`CERT_SIGNING_SECRET`)
   - įrašo į `public.certificates` lentelę
3. Naršyklė generuoja PDF su QR kodu, nukreipiančiu į `/verify/{kodas}`.
4. Mokykla nuskaito QR → mato realaus laiko duomenis iš DB, ne iš PDF.

## Vercel — kokie ENV kintamieji reikalingi

Nueik į **Vercel → Project → Settings → Environment Variables** ir įdėk (jei dar neturi):

| Kintamasis | Aplinka | Reikšmė |
|-----------|---------|---------|
| `CERT_SIGNING_SECRET` | Production, Preview, Development | (64 baitų slaptas raktas — sugeneruotas per Lovable Cloud secrets; nurašyk iš Lovable Secrets panelės) |
| `SUPABASE_URL` | visos | `https://bacqlmhfokfnmoexijkj.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | visos | `sb_publishable_...` arba anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | visos | (iš tavo Supabase Dashboard → Settings → API) |
| `VITE_SUPABASE_URL` | visos | tas pats kaip `SUPABASE_URL` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | visos | tas pats kaip `SUPABASE_PUBLISHABLE_KEY` |
| `RECAPTCHA_SITE_KEY` | visos | (jei naudoji) |
| `RECAPTCHA_SECRET_KEY` | visos | (jei naudoji) |

**SVARBU:** `CERT_SIGNING_SECRET` **turi būti toks pats** visose aplinkose (Prod, Preview) — jei pakeisi, seni sertifikatai vis dar veiks (nes verifikacija tikrina DB, ne HMAC), bet audito hash'as neatitiks. Nesudalink jo su niekuo.

Po pakeitimų — spausk **Redeploy** Vercel'yje.

## Domain migracijai (`socialinesvalandos.vercel.app` → `socialinesvalandos.lt`)

1. Vercel → Project → Settings → Domains → Add `socialinesvalandos.lt` ir `www.socialinesvalandos.lt`.
2. DNS registratoriuje pridėk Vercel nurodytus A/CNAME įrašus.
3. **Nekeisk** `CERT_SIGNING_SECRET` — leisk sertifikatams veikti toliau.
4. Supabase Dashboard → Authentication → URL Configuration:
   - **Site URL:** `https://socialinesvalandos.lt`
   - **Redirect URLs:** pridėk `https://socialinesvalandos.lt/**` **ir palik** `https://socialinesvalandos.vercel.app/**` senosioms sesijoms.
5. Google/Discord OAuth Console → pridėk `https://socialinesvalandos.lt/auth/callback` prie leidžiamų redirect URI (senojo netrink 30 dienų).
6. QR kodai naujuose PDF'uose automatiškai naudos `window.location.origin`, taigi po domeno pakeitimo jie rodys `socialinesvalandos.lt/verify/...`. Seni PDF'ai vis dar veiks — Vercel gali palikti senąjį domeną kaip alias, arba pridėk 301 redirect `.vercel.app/verify/*` → `.lt/verify/*`.

## SQL — kas buvo pridėta

Žr. `docs/SQL-REFERENCE.md`, sekcija „Certificates". Migracija:

- `public.certificates` lentelė
- `public.verify_certificate(_code text)` — vieša RPC (anon + authenticated)
- `public.revoke_certificate(_code, _reason)` — admin only

## Kaip atšaukti sertifikatą (jei radai sukčių)

```sql
select public.revoke_certificate('SV-AAAA-BBBB-CCCC', 'Suklastotos valandos');
```

Po to `/verify/SV-...` iškart parodys raudoną „Atšauktas" būseną.

## Kaip pakeisti signing raktą

1. Vercel → Env vars → atnaujink `CERT_SIGNING_SECRET`.
2. Redeploy.
3. Seni sertifikatai vis dar galios (verifikacija tikrina DB, ne HMAC PDF viduje). HMAC PDF'e tampa istoriniu audito laukan.

## Kaip pridėti audito eksportą

```sql
select code, student_name, school_name, total_hours, generated_at, revoked_at
from public.certificates
where school_id = '<school uuid>'
order by generated_at desc;
```

## Kur paaiškinimas mokykloms

Vieša svetainė: `/verify` — paaiškina, kaip veikia sistema ir kodėl neįmanoma suklastoti.
