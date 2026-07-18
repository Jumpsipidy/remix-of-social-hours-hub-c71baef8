# OAuth (Google + Discord) prisijungimas

## Kaip veikia

Google ir Discord prisijungimas eina per `supabase.auth.signInWithOAuth` tiesiogiai į tavo Supabase projektą. **Jokių el. laiškų nesiunčiama**, jokio 6-ženklio kodo įvedimo — vartotojas paspaudžia mygtuką, patvirtina Google/Discord lange, ir grįžta į `/auth/callback`, kur automatiškai sukuriamas arba atnaujinamas profilis.

Failai:
- `src/routes/login.tsx` — mygtukai „Google“ ir „Discord“
- `src/routes/register.tsx` — tos pačios OAuth funkcijos registracijoje
- `src/routes/auth.callback.tsx` — po sėkmingo OAuth atidaromas profilio užbaigimo puslapis (mokykla, klasė, valandų kiekis)

## Ką reikia sukonfigūruoti Supabase pusėje

### Google

1. Google Cloud Console → **APIs & Services → Credentials → Create OAuth Client ID → Web application**.
2. **Authorized redirect URIs** pridėk:
   ```
   https://<tavo-supabase-projektas>.supabase.co/auth/v1/callback
   ```
   (Tikslų URL rasi Supabase → Auth → Providers → Google.)
3. Nukopijuok **Client ID** ir **Client Secret**.
4. Supabase → **Authentication → Providers → Google** — įjunk, įklijuok Client ID/Secret, išsaugok.

### Discord

1. https://discord.com/developers/applications → **New Application**.
2. **OAuth2 → Redirects** pridėk tą patį `https://<projektas>.supabase.co/auth/v1/callback`.
3. Nukopijuok **Client ID** ir **Client Secret** iš „OAuth2 → General“.
4. Supabase → **Authentication → Providers → Discord** — įjunk, įklijuok, išsaugok.

### Site URL / Redirect URLs Supabase pusėje

Supabase → **Authentication → URL Configuration**:
- **Site URL**: `https://tavodomenas.lt` (arba lovable preview URL).
- **Additional Redirect URLs**: pridėk `https://tavodomenas.lt/auth/callback` ir dev URL `http://localhost:8080/auth/callback`.

Be to Google/Discord grąžins vartotoją, bet Supabase pasakys „Invalid redirect URL“.

## Kaip patikrinti, kad veikia (ranka)

1. Atsijunk / incognito.
2. Eik į `/login`, spausk **Google**.
3. Turi atsidaryti Google account picker → po pasirinkimo grįžti į `/auth/callback` → tada į `/student` (arba `profile setup`, jei pirmas kartas).
4. Jokio laiško gauti neturi.
5. Tas pats su **Discord**.

## Dažniausios klaidos

| Klaida | Priežastis | Sprendimas |
|---|---|---|
| `Unsupported provider` | Providers neįjungtas Supabase | Įjunk pagal viršuje aprašytus žingsnius. |
| `redirect_uri_mismatch` (Google) | Callback URL nepridėtas Google Cloud | Pridėk tikslų `https://<projektas>.supabase.co/auth/v1/callback` |
| „Invalid redirect URL“ po grįžimo | `/auth/callback` neįrašytas Supabase Redirect URLs | Pridėk į „Additional Redirect URLs“. |
| Grįžta bet iškart iškrenta | Trūksta bearer middleware `src/start.ts` | Jau sukonfigūruota — neliesk. |

## El. paštu registracija (dėl aiškumo)

Klasikinis email/slaptažodis vis dar siunčia 6-ženklį OTP į el. paštą — tai atskira funkcija ir OAuth jos nepaliečia. OAuth vartotojai el. laiško **niekada** negauna.
