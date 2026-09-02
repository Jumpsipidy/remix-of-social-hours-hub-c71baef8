# El. pašto gidas (siuntimas ir gavimas) — be painiavos

Trumpai: **siuntimas** ir **gavimas** yra dvi skirtingos sistemos. Resend siunčia.
Resend NEGAUNA laiškų. Todėl `pagalba@socialinesvalandos.dev` tau neateina.

---

## 1. Kaip veikia dabar

| Dalis | Reikšmė | Kas tvarko |
|---|---|---|
| Siuntėjas (From) | `Socialinės Valandos <noreply@jumpsipidy.online>` | Resend (`RESEND_API_KEY`) |
| Atsakymai (Reply-To) | `pagalba@socialinesvalandos.dev` | tavo pašto dėžutė (dar nesukonfigūruota) |
| Įspėjimai adminui | `alerts@jumpsipidy.online` | Resend |

Kodas: `src/lib/email.functions.ts` (`FROM`, `REPLY_TO`),
šablonai `src/lib/email-templates/*`, `SUPPORT_EMAIL` yra `_shell.ts`.

---

## 2. Kodėl laiškas į `pagalba@socialinesvalandos.dev` niekur nenukeliauja

Domenas `socialinesvalandos.dev` neturi **MX įrašo**, t. y. nėra serverio, kuris
priimtų gaunamus laiškus. Resend duoda tik SMTP siuntimą (API), gavimo nėra.

### Sprendimas A (rekomenduojamas, nemokamas) — persiuntimas į Gmail
1. Registruokis https://improvmx.com (arba Cloudflare Email Routing).
2. Pridėk domeną `socialinesvalandos.dev`.
3. DNS (ten kur pirkai domeną) pridėk jų duotus MX įrašus, pvz.:
   - `MX  @  mx1.improvmx.com  10`
   - `MX  @  mx2.improvmx.com  20`
4. Sukurk alias: `pagalba@socialinesvalandos.dev → gamingdooper0@gmail.com`.
5. Po 5–30 min. išbandyk: parašyk iš telefono į `pagalba@socialinesvalandos.dev`.

### Sprendimas B — Google Workspace
Mokamas (~6 €/mėn.), bet gauni tikrą dėžutę ir gali siųsti IŠ `pagalba@…`.

> Norint atsakinėti IŠ `pagalba@socialinesvalandos.dev` per Gmail:
> Gmail → Settings → Accounts → „Send mail as“ → pridėk adresą su ImprovMX SMTP.

---

## 3. Kodėl siunčiam iš `jumpsipidy.online`, o ne iš `socialinesvalandos.dev`

Tas domenas jau **verifikuotas Resend** (SPF + DKIM), todėl laiškai nekrenta į spam.
Kai norėsi siųsti iš pagrindinio domeno:
1. Resend → Domains → Add `socialinesvalandos.dev`.
2. Įdėk jų SPF (`TXT`), DKIM (`CNAME` x3) ir DMARC (`TXT _dmarc`) įrašus.
3. Kai statusas „Verified“ — pakeisk `FROM` faile `src/lib/email.functions.ts` į
   `Socialinės Valandos <noreply@socialinesvalandos.dev>`.
4. MX įrašai (2 skyrius) ir SPF/DKIM (siuntimas) VIENAS KITAM NETRUKDO — gali turėti abu.

---

## 4. Kokie laiškai siunčiami automatiškai

Lentelė `public.email_outbox` (statusai: `queued` → `sent` / `failed`),
tipai iš enum `email_kind`:

| Tipas | Kada | Šablonas |
|---|---|---|
| `hours_confirmed` | organizacija patvirtina valandas (DB trigeris `enqueue_hours_confirmed_email`) | `hours-confirmed.ts` |
| `reservation_approved` | organizacija priima rezervaciją | `reservation-approved.ts` |
| `reservation_declined` | organizacija atmeta | `reservation-declined.ts` |
| `new_message` | nauja žinutė pokalbyje | shell |
| `certificate_ready` | sugeneruotas PDF sertifikatas | shell |
| `org_access_granted` | super admin patvirtina organizaciją | `org-invite.ts` |
| `weekly_digest` | savaitinė santrauka | shell |

Vartotojas gali išjungti kiekvieną tipą: lentelė `public.email_preferences`.
Atmesti/bounce adresai — `public.email_suppressions` (daugiau nesiunčiam).

### Patikra SQL
```sql
-- kas laukia eilėje
select kind, status, count(*) from public.email_outbox group by 1,2;

-- paskutinės klaidos
select to_email, kind, last_error, attempts, created_at
from public.email_outbox where status = 'failed'
order by created_at desc limit 20;
```

---

## 5. Kaip išbandyti rankomis

1. Prisijunk kaip super admin → `/admin/tools`.
2. Skiltis „El. laiškai“ → įvesk savo adresą → „Peržiūrėti HTML“ (nesiunčia) arba „Siųsti testą“.
3. Patikrink `/admin/emails` — ten matysi outbox eilutes ir klaidas.

Jei gauni `401` iš Resend — `RESEND_API_KEY` neteisingas arba nenustatytas.

---

## 6. Trumpas patikros sąrašas

- [ ] `RESEND_API_KEY` nustatytas
- [ ] `jumpsipidy.online` verifikuotas Resend (siuntimas veikia)
- [ ] MX įrašai `socialinesvalandos.dev` (gavimas — dabar TRŪKSTA)
- [ ] `pagalba@…` alias nukreiptas į tavo Gmail
- [ ] Testinis laiškas iš `/admin/tools` atėjo į Inbox, ne Spam
