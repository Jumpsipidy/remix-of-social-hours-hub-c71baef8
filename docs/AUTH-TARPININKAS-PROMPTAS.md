# Promptas `auth.socialinesvalandos.dev` projektui

Nukopijuok viską žemiau ir įklijuok į ANTRĄJĮ Lovable projektą (saugumo tarpininką).

---

Tu esi `auth.socialinesvalandos.dev` — saugumo tarpininko svetainė. Ji naudoja **tą pačią
Supabase duomenų bazę** kaip pagrindinė svetainė (`socialinesvalandos.dev`), project ref
`bacqlmhfokfnmoexijkj`. Lentelės `public.auth_tickets` ir `public.auth_security_events`
JAU EGZISTUOJA su RLS — nekurk ir nekeisk jų schemos.

## Ką ši svetainė daro

Tik viena funkcija: patvirtinti jautrų veiksmą, kurį inicijavo pagrindinė svetainė.
Titulinis puslapis `/` — tuščias, tik trumpas tekstas „Čia nieko nėra. Šis adresas
naudojamas tik saugumo patikroms.“ Jokios navigacijos, jokio SEO (`noindex, nofollow`).

## Vienintelis funkcinis maršrutas: `/verify/$ticketId`

Įeinanti nuoroda:
```
https://auth.socialinesvalandos.dev/verify/<ticketId>?cb=<encodedReturnUrl>&ref=<REF>#k=<nonce>
```
`nonce` yra TIK hash fragmente — jis niekada nesiunčiamas kaip query parametras.

### Žingsniai puslapyje
1. Perskaityk `nonce` iš `window.location.hash` (`#k=`), tada IŠVALYK hash
   (`history.replaceState`), kad jis nepasiliktų istorijoje.
2. Serverio funkcija `loadTicket({ ticketId, nonce })`:
   - service-role klientu paimk tikietą,
   - patikrink `status = 'pending'` ir `expires_at > now()`,
   - palygink `sha256(nonce)` su `nonce_hash` **constant-time** būdu,
   - blogas nonce → `attempts + 1`, įrašyk `auth_security_events` įvykį
     `ticket.bad_nonce`; po 5 bandymų → `status = 'denied'`,
   - sėkmė → įrašyk `ticket.viewed`, užpildyk `ip` ir `user_agent`,
   - grąžink TIK saugius laukus: `action`, `description`, `payload`, `expires_at`, `ref`.
     NIEKADA negrąžink `nonce_hash` ar `user_id`.
3. Patikrink `cb` allowlist: leidžiamas tik hostas, kuris baigiasi
   `socialinesvalandos.dev`. Kitaip — klaidos ekranas, jokio redirect.
4. reCAPTCHA (v3 arba invisible) prieš prisijungimo formą.
5. Prisijungimas iš naujo (step-up), du būdai viename ekrane:
   - **Slaptažodis** — `supabase.auth.signInWithPassword`
   - **El. pašto kodas (OTP)** — `supabase.auth.signInWithOtp({ email })` →
     `supabase.auth.verifyOtp({ email, token, type: 'email' })`.
     Tai VIENINTELIS būdas Google/Discord vartotojams — jie slaptažodžio neturi,
     todėl OTP variantas turi būti pirmas ir aiškiai matomas.
6. Po prisijungimo serveryje patikrink, kad `user.id === ticket.user_id`.
   Nesutampa → `auth_security_events` įvykis `ticket.identity_mismatch`,
   `status = 'denied'`, aiškus raudonas ekranas.
7. Ekrane parodyk: veiksmo pavadinimą lietuviškai, `description`, `payload` detales,
   likusį galiojimo laiką (gyvas countdown), `REF: A1B2C3D4` mono šriftu.
8. Du mygtukai: **„Patvirtinu“** (destructive, su AlertDialog) ir **„Atmesti“**.
9. Atominis atnaujinimas:
   ```sql
   update auth_tickets set status = 'confirmed', decided_at = now()
   where id = $1 and status = 'pending' and expires_at > now()
   ```
   Jei paveikta 0 eilučių — tikietas jau panaudotas / pasibaigęs, rodyk klaidą.
   Įrašyk `ticket.confirmed` arba `ticket.denied`.
10. Nukreipk atgal: `<cb>?ticket=<id>&status=confirmed` (arba `denied`).
    Prieš tai 1 s ekranas „Patvirtinta ✓ — grįžtame atgal“.

## Ko NEDARYTI
- Nevykdyk paties veiksmo (netrink paskyros, negeneruok eksporto) — tai daro
  pagrindinė svetainė per `consumeAuthTicket`. Ši svetainė tik keičia `status`.
- Nekeisk `auth_tickets` / `auth_security_events` schemos, nekurk joms migracijų.
- Neperduok service role rakto į naršyklę — visos DB operacijos serverio funkcijose
  (`createServerFn`, `supabaseAdmin` importuojamas VIDUJE handlerio).
- Nedaryk viešos navigacijos, sitemap ar nuorodų į šią svetainę.

## Klaidų ekranai (visi lietuviškai, su REF kodu)
`Tikietas nerastas` · `Nuoroda nebegalioja (10 min.)` · `Tikietas jau panaudotas` ·
`Neteisinga nuoroda` (blogas nonce) · `Prisijungei ne ta paskyra` · `Per daug bandymų`.

## Dizainas
Lietuvių kalba, semantiniai dizaino tokenai (jokių `text-white` / `bg-black`).
Tamsus, minimalus, „saugumo terminalo“ pojūtis: `ShieldCheck` ikona, subtilus grid fonas,
mono šriftas REF kodui. Skeleton loaderiai, ne spinner'iai.

## Supabase nustatymai, kuriuos privalo padaryti savininkas
- Auth → Providers → **Email OTP įjungtas**.
- Auth → URL Configuration → Redirect URLs pridėti `https://auth.socialinesvalandos.dev/**`.
Jei to nėra — el. pašto kodas neateis; parašyk apie tai vartotojui.
