# Socialinės Valandos — pilna platformos apžvalga

Šis dokumentas paprasta kalba paaiškina **kiekvieną** platformos funkciją: kaip veikia prisijungimai, registracija, kiekvienas vartotojo vaidmuo, kiekvienas mygtukas super admin skydelyje ir kaip visi puslapiai jungiasi tarpusavyje. Skirtas savininkui (tau), kad greitai suprastum bet kurią vietą sistemoje.

---

## 1. Kas yra „Socialinės Valandos“?

Tai mokyklų platforma, kurioje **moksleiviai** susiranda savanoriškas veiklas, **organizacijos** siūlo užduotis, **mokyklos administratoriai (auklėtojai)** kontroliuoja savo klases, o **super administratorius** valdo visą sistemą. Užduotys duoda „socialines valandas“, kurios kaupiasi mokinio profilyje ir generuoja PDF sertifikatą pasiekus tikslą.

Techniškai — TanStack Start (React) frontendas + Lovable Cloud (Supabase) backendas su RLS (Row Level Security) taisyklėmis, kurios užtikrina, kad kiekvienas mato tik tai, ką turi matyti.

---

## 2. Vaidmenys (rolės)

Sistemoje yra **penki** vaidmenys:

1. **Svečias (guest)** — neprisijungęs žmogus. Mato tik viešus puslapius.
2. **Moksleivis (student)** — pagrindinis vartotojas. Kaupia valandas.
3. **Organizacija (organization)** — siūlo užduotis, tvirtina/uždaro rezervacijas.
4. **Mokyklos administratorius (school_admin)** — mokytojas/auklėtojas, prižiūri klases.
5. **Super administratorius (admin)** — TU. Visagalis. Vienas ar keli žmonės.

Rolė saugoma `profiles` lentelėje ir dubliuojama `user_roles` (privilegijų eskalacijos prevencijai). Rolės pakeisti kliento pusėje **negalima**.

---

## 3. Registracija (`/register`)

Registracija turi tik du režimus: **Moksleivis** ir **Mokyklos administratorius**. Organizacijų viešos registracijos **nėra** — jas kuria super admin arba mokyklos administratorius (žr. 8 ir 9 sk.).

### 3.1 Moksleivio registracija

Reikia:
- Vardo ir pavardės (privaloma **bent du žodžiai**, kitaip formos nepraleis).
- El. pašto + slaptažodžio (arba Google/Discord — žr. 4 sk.).
- Pasirinktos **mokyklos** iš išskleidžiamo sąrašo.
- Pasirinktos **klasės** (5, 6, 7, 8, 9/I gimn., 10/II gimn., 11/III gimn., 12/IV gimn.).
- **Valandų tikslo**:
  - 5–7 klasėms — **fiksuota 20 val.**, mokinys keisti negali.
  - 8+ klasėms — mokinys pats įrašo (min. 8 val., pagal mokyklos reikalavimą).
- **Mokyklos prisijungimo kodo** (`signup_code`) — kad atsitiktiniai žmonės iš gatvės neužsiregistruotų svetimai mokyklai. Kodą duoda klasės auklėtojas.
- Varnelės „patvirtinu, kad duomenys tikri“.

Kodą tikrina serverio RPC `verify_school_signup_code`. Blogas kodas — paskyra **nesukuriama** (nustatoma Supabase Auth pusėje tik po sėkmingo tikrinimo).

### 3.2 Mokyklos administratoriaus registracija

Panašiai kaip moksleivio, tik dar pasirenka **kokias klases** prižiūrės (`assigned_classes`, pvz., `["9 / I gimn.", "10 / II gimn."]`). Jei paliekama tuščia — mato visas mokyklos klases (senų paskyrų suderinamumas).

### 3.3 Google / Discord OAuth registracija

Vartotojas nespaudžia „Registruotis“ — jis spaudžia **„Google“** arba **„Discord“** mygtuką prisijungimo lange. Grįžus atgal į svetainę, jei profilis dar neturi mokyklos, klasės, valandų tikslo — moksleivis matys **profilio užbaigimo formą** (`student.tsx` sekcija), kur privalo tuos laukus užpildyti (su tuo pačiu mokyklos kodu). Kol neužpildo — negali naudoti sistemos.

---

## 4. Prisijungimas (`/login` ir `/auth`)

- El. paštas + slaptažodis — standartinis Supabase Auth flow.
- **Google** — spausk „Prisijungti su Google“. Naudojamas `supabase.auth.signInWithOAuth`. Redirect grįžta į svetainę.
- **Discord** — spausk „Prisijungti su Discord“. Tas pats mechanizmas.
- **Slaptažodžio priminimas** — mygtukas „Pamiršau slaptažodį“. Nusiunčia atstatymo laišką (jei el. paštų siuntimas įjungtas). Vartotojas patenka į `/reset-password`.
- **CAPTCHA** — po kelių nesėkmingų bandymų atsiranda paprastas iššūkis (matematika/paveiksliukas), kad botai negalėtų brute-force'inti.
- **Lockdown režimas** — jei super admin įjungė lockdown, prisijungimas užrakintas visiems, išskyrus super admin (žr. 8.10).

Po sėkmingo prisijungimo — hard navigation (`window.location.assign`) į dashboardą pagal rolę (išvengia sesijos race condition su React #310 klaida).

---

## 5. Svečio (guest) patirtis

Neprisijungęs žmogus mato:

- **`/`** — pagrindinis puslapis su realiu laiku atnaujinamais statistikos rodikliais (bendras valandų skaičius, mokinių skaičius, aktyvių užduočių skaičius). Jei neprisijungęs — hero kortelėje rodo pavyzdinį „0/20 val.“.
- **`/tasks`** — visas viešų užduočių sąrašas su 3D fonu, filtrais pagal miestą, tag'us, datą.
- **`/organizations`** (sujungta su `/tasks`) — organizacijų sąrašas.
- **`/verify/$code`** — bet kas gali įvesti sertifikato kodą ir patikrinti jo autentiškumą (žr. 12 sk.).
- **`/terms`** — naudojimo taisyklės.
- **`/blog/*`** — SEO tinklaraštis.

Meniu **neturi** „Skydelis / Dashboard“ nuorodų — jos rodomos tik prisijungus.

---

## 6. Moksleivio (student) patirtis (`/student`)

### 6.1 Dashboard'as

Rodo:
- **KPI kortelės** — sukauptos valandos / tikslas, laukiančių rezervacijų skaičius, artimiausio įvykio data.
- **Progreso žiedas** — kiek procentų iki tikslo.
- **Statistikos diagramos** (recharts) — valandų augimas per mėnesius, veiklų kategorijos.
- **Artimiausios rezervacijos** — kortelės su „Chat“ ir „Detalės“ mygtukais.
- **Draugų srautas** — kas iš klasės neseniai gavo valandų (motyvacija).

### 6.2 Rezervacijų kūrimas

Du būdai:
1. **„Rezervuoti“ užduotį** iš `/tasks` — atsidaro modalas, mokinys pasirenka datą, laiką iš siūlomų slot'ų, patvirtina.
2. **„Pasiūlyti savo“ (custom)** — jei organizacijos ten nėra, mokinys aprašo veiklą, uždeda tag'us, siūlo laiką. **Valandos automatiškai ribojamos iki 8 val. vienai sesijai** ir aiškiai parašyta: „Organizacija turi patvirtinti — negalima susikurti valandų be jos sutikimo.“

### 6.3 Rezervacijos gyvenimo ciklas

`pending` → `approved` (vykdoma) → `completed` (užbaigta, valandos įskaičiuotos). Yra dar `declined` (atmesta). Statusas keičiasi automatiškai su sistemos žinutėmis chate.

### 6.4 Draugai

- `/friends` — draugystės užklausos, priėmimas/atmetimas.
- **DM chat'as tarp draugų** — asmeninės žinutės, automatiškai **triname po 2 dienų** (`purge_dm_messages` cron), kad neaugtų DB.
- **Grupinės rezervacijos** — mokinys gali pakviesti draugą prisidėti; organizacijai patvirtinus ir uždarius, valandos duodamos **visiems dalyviams**.

### 6.5 PDF sertifikatas

Pasiekus tikslą (`hours_earned >= hours_needed`) — atsiranda mygtukas **„Generuoti sertifikatą“**. QR kodas nukreipia į `/verify/$code`, kur mokytojas ar universitetas gali patikrinti autentiškumą. Serveris HMAC-pasirašo turinį; kliento pusė **negali** suklastoti. Jei valandų neužtenka — mygtukas neaktyvus.

---

## 7. Organizacijos patirtis (`/organization`)

### 7.1 Dashboard'as

- **KPI** — aktyvios užduotys, laukiantys mokiniai, šio mėnesio uždarytos valandos.
- **Analitika** — savanorių skaičiaus dinamika, populiariausi tag'ai (recharts).
- **Rezervacijų sąrašas** — su filtrais (laukia / vykdomos / užbaigtos).

### 7.2 Užduočių kūrimas („Nauja užduotis“)

Formos laukai: pavadinimas, aprašymas, data, laiko intervalas, valandos, vieta, tag'ai, spot'ų skaičius, ar tai vienkartinis renginys (event), pakartojimas (`none` / `weekly` / `biweekly` / `monthly`). Pasikartojančios užduotys automatiškai generuojamos `generate_recurring_tasks` funkcijos (pg_cron kas naktį).

### 7.3 Rezervacijos tvirtinimas

Kai mokinys užsirezervuoja, organizacija mato „Patvirtinti“ / „Atmesti“. Patvirtinus — statusas tampa `approved`, chat'e atsiranda sistemos žinutė.

### 7.4 „Verify & Close Task“

Kai darbas atliktas, spaudžia **„Uždaryti su patvirtinimu“**. Modalas reikalauja:
- Aprašyti, ką mokinys nuveikė.
- **Privaloma teisinė varnelė**: „Patvirtinu, kad mokinys iš tiesų atliko šį darbą; suprantu, kad melagingi liudijimai gali užtraukti teisinę atsakomybę.“

Šis tekstas saugomas `reservations.legal_disclosure` — mokykla vėliau audite mato tikslų pareiškimą.

Uždarius — kviečiama `award_reservation_hours` SECURITY DEFINER RPC, kuri atomiškai priskiria valandas mokiniui (ir visiems grupės dalyviams).

### 7.5 Laiko derybos chate

Modalas „Keisti rezervacijos laiką“ leidžia organizacijai pasiūlyti kitą laiką; mokinys chate mato mygtukus **„Priimti“ / „Atmesti“**.

---

## 8. Mokyklos administratorius (`/school`)

Dashboard'as suskirstytas į **tabus**:

### 8.1 „Mokiniai“

Sąrašas visų priskirtos klasės (`assigned_classes`) mokinių: vardas, klasė, valandos, tikslas, statuso juostelė. Mygtukas **„Auditas“** atveria mokinio istoriją — visas rezervacijas su sukurtais teisiniais patvirtinimais, chat'ų peržiūra (3-way).

### 8.2 „Peržiūros eilė“

**Naujas funkcionalumas.** Rodo visas paskutines rezervacijas kaip lentelę su:
- **Filtrais pagal klasę** (pvz., tik „9 / I gimn.“).
- **Įtarimo žymėmis** (fraud flags) — automatiškai aptinka:
  - Labai daug valandų (≥10) — didelė rizika.
  - Ilga sesija (8–9 val.) — vidutinė.
  - Naktinės valandos (prieš 6:00 arba po 22:00).
  - Ateities data, bet jau pažymėta užbaigta.
  - Persidengiančios rezervacijos tam pačiam mokiniui tą pačią dieną.
  - Sukurta ir užbaigta beveik akimirksniu.
  - Vyko darbo dieną pamokų metu (informacinis).
- **Bulk veiksmais** — pažymėti visas, „Pažymėti peržiūrėtomis“, „Nuimti peržiūrą“, **eksportuoti CSV**.
- **Filtrais** — „Tik įtartinos“, „Tik neperžiūrėtos“.
- Numeriniai badge'ai tab'e: kiek dar neperžiūrėta, kiek įtartinų.

Peržiūros būsena saugoma naršyklės `localStorage` — greitas ir be DB nepakraunantis mechanizmas.

### 8.3 „Organizacijos partneriai“

Sąrašas organizacijų, dirbančių su tavo mokykla. Mygtukas atveria tiesioginį pokalbį.

### 8.4 „Vienkartiniai renginiai“

Mokyklos administratorius pats gali sukurti vienkartinį renginį (pvz., miesto akcija) kaip užduotį, be atskiros organizacijos.

### 8.5 „Naujos paskyros“

Mokyklos administratorius gali kurti **organizacijų paskyras** (iki 10) — kai atsiranda nauja bendruomenė, mokykla nenori laukti super admin.

---

## 9. Super administratorius (`/admin`)

**Sidebar** su 12+ puslapių. Kiekvienas — atskira, pilnai veikianti sekcija.

### 9.1 Pagrindinis (Overview)

- KPI: viso vartotojų, mokinių, organizacijų, mokyklų, atviros užduotys, valandos šį mėnesį.
- Live diagramos: augimo grafikas (Area chart), pasiskirstymas pagal rolę (Pie), naujausi įrašai.

### 9.2 Analitika (`/admin/analytics`)

Pilnai interaktyvūs recharts diagramos:
- Valandų suma per mėnesį (Bar).
- Aktyvių mokinių trend'as (Line).
- Populiariausios tag'ų kategorijos (donut).
- Vidutinis atsako laikas (organizacijos → mokinys).

### 9.3 Mokiniai (Students)

Globali paieška visų sistemoje esančių mokinių. Rolės keitimas, valandų taisymas, ištrynimas.

### 9.4 Rezervacijos (Global reservations)

Visos rezervacijos iš visų mokyklų su filtrais pagal statusą, datą, mokyklą.

### 9.5 Lyderiai (Leaderboard)

Top mokiniai pagal valandas per savaitę / mėnesį / metus. Motyvacinis rodiklis.

### 9.6 Mokyklos (`/admin/schools`)

Sąrašas visų mokyklų. **„Prideti mokyklą“** — įveda pavadinimą, miestą, `signup_code`, `is_active`. Kai mokinys registracijoje ieško mokyklos — įrašius pavadinimą, autocomplete rodo šitas. Kodą galima keisti bet kada (žr. `docs/README-school-code-update.md`).

### 9.7 Paskyros (Accounts) (`/admin/accounts`)

- **„Sukurti paskyrą“** — bet kokiam vaidmeniui, greitai debug'ui.
- **„Bulk import“** — dar planuojama (žr. 15 sk.).
- **„Ištrinti paskyrą“** — kaskadinis trynimas per `deleteAccount` server function (auth.users → profiles → rezervacijos → žinutės → viskas išvalyta).

### 9.8 Įrankiai (`/admin/tools`)

- **DB sveikatos patikra** (`run_deep_health_scan`) — 18 testų: pasiekiamos lentelės, RLS įjungtas visur, funkcijos egzistuoja, purge dirba, adminas egzistuoja, orphan žinutės, senos DM žinutės. Rezultatas — spalvota kortelių sienelė su kritinių gedimų skaičiumi.
- **PDF sertifikatų testavimas** — trys mygtukai:
  - „🎭 Fake Demo PDF“ — sugeneruoja pavyzdinį sertifikatą „Jonas Petraitis“ su 20 val.
  - „🧪 Debug PDF“ — sugeneruoja realiam prisijungusiam admin'ui apeinant valandų check'ą.
  - „Verifikuoti kodą“ — įvedi bet kokį kodą, matai backend'o atsakymą.
- **Mass reset** — ištrinti visas rezervacijas / visas žinutes / visus mokinius. Tik ekstremaliais atvejais.

### 9.9 Bug pranešimai (`/admin/bugs`)

Kiekvienas puslapis turi „BugReportWidget“ — mažas mygtukas apačioje. Vartotojas rašo pranešimą, ekrano URL ir user agent'as automatiškai pridedami. Čia matai visą sąrašą, gali pažymėti kaip išspręstą.

### 9.10 Lockdown (`/admin/lockdown`)

- **Master toggle** — įjungti/išjungti visos svetainės lockdown režimą.
- Kai įjungta, visi vartotojai mato „maintenance“ ekraną su tavo pranešimu ir klaidos kodu.
- **Slaptas apėjimas** — būdamas lockdown ekrane, klaviatūra įrašyk žodį `jumpsipidy` (jokių input laukų). Atsiras kodo laukas — įvesk `7851`. Serveris išduoda HMAC-SHA256 token'ą, kuris leidžia super admin toliau dirbti kaip įprasta.
- Po kelių nepavykusių bandymų — aktyvuojasi CAPTCHA prieš kodo tikrinimą.
- **Auto-lockdown** — jei `run_deep_health_scan` randa kritinių gedimų, `auto_lockdown_if_unhealthy` automatiškai įjungia lockdown su pranešimu „[auto] Sistemos patikra rado X kritinių gedimų“.

### 9.11 Onboarding turas

Pirmą kartą prisijungęs super admin (arba bet kuris vartotojas) mato tour'ą — spotlight'ai ant pagrindinių mygtukų su paaiškinimais. Galima praleisti.

### 9.12 Debug panel (visai kitiems vaidmenims impersonuoti)

Super admin skydelyje matomas kampinis panelis su mygtukais:
- „Sukurti + Login kaip Student“
- „Sukurti + Login kaip Organization“
- „Sukurti + Login kaip School Admin“

Vieno paspaudimo debug — sukuriama mock paskyra (per `dev-tools.functions`), impersonuojamas, gauni pilną tos rolės patirtį. Nematomas kitiems.

---

## 10. Chat sistema

- **3-way chat** — kiekviena rezervacija turi savo `chat_room`, kurioje mato mokinys, organizacija ir (jei priskirta) mokyklos administratorius.
- **Sisteminės žinutės** — status keitimai (patvirtinta, atmesta, uždaryta) automatiškai įrašomi kaip sisteminės žinutės chate.
- **12 dienų autopurge** — `purge_old_messages` cron trina žinutes senesnes nei 12 d. (privatumas + DB dydžio kontrolė). Chate rodomas įspėjamasis label'as „Žinutės automatiškai trinamos po 12 d.“
- **DM chat'ai tarp draugų** — atskira `dm_rooms` / `dm_messages` lentelė. Trynimas — 2 dienos.
- **Live** — Supabase Realtime subscriptions, žinutės atsiranda be perkrovimo.

---

## 11. Pranešimų varpelis (notification bell)

Viršuje dešinėje. Rodo:
- Naujos rezervacijos.
- Statuso pasikeitimai.
- Nauji chat pranešimai.
- Draugystės užklausos.

Su animacijomis, hash URL'ais (paspaudus atveria konkretų item'ą).

---

## 12. PDF sertifikatai — kaip apsaugoti nuo klastojimo

Kiekvienas sertifikatas turi:
- **Unikalų kodą** (`code`, upper-case).
- **SHA-256 hash'ą** turinio (`content_hash`).
- **HMAC parašą** su `CERT_SIGNING_SECRET` (Lovable Cloud ir Vercel env).
- **QR kodą**, nukreipiantį į `https://socialinesvalandos.lt/verify/{code}` (arba `socialinesvalandos.vercel.app` dabar).

Verifikacijos puslapis vieša — bet kas įveda kodą arba nuskaito QR — mato: vardas, klasė, mokykla, valandos generavimo momentu, dabartinis kiekis DB, ar sertifikatas atšauktas.

Klastojimas neįmanomas: nesukurdamas įrašo DB, negausi teisingo kodo; parašo be secret'o neatkursi.

Plačiau — `docs/PDF-SERTIFIKATAI.md` ir `docs/PDF-VERIFIKACIJA.md`.

---

## 13. Saugumas ir privatumas

- **RLS visose vartotojo lentelėse** — mokinys mato tik savo duomenis, organizacija — tik savo rezervacijų mokinius, mokyklos administratorius — tik priskirtos mokyklos, super admin — viską.
- **`can_view_profile`** funkcija centralizuoja profilio matomumo logiką (išveng permissive policy).
- **`has_role`** SECURITY DEFINER funkcija — anti-privilege-escalation.
- **`user_roles`** — atskira lentelė, ne `profiles.role` — kad kliente pakeista rolė netaptų realiu leidimu.
- **CAPTCHA** — prisijungime po kelių fail'ų, lockdown apėjime.
- **Bearer token middleware** — kiekvieną protected server function auth patikra.
- **Cookie-Script** — GDPR banner viešuose puslapiuose.

---

## 14. Techninių problemų diagnostika

- **DB sveikatos patikra** (žr. 9.8) — 18 testų.
- **BugReportWidget** — vartotojai patys praneša klaidas.
- **Sentry / logs** — server function logs pasiekiami per Lovable dashboard.
- **Auto-lockdown** — jei sistema kritiškai nesveika, automatiškai užrakinama, kad nesukurtų daugiau žalos.

---

## 15. Ateities planai (dar neįdiegta)

- Email notifikacijos (registracija, statuso keitimai).
- Bulk student import iš CSV.
- 2FA super admin paskyroms.
- PWA (offline režimas telefone).
- Kalendoriaus vaizdas rezervacijoms.
- Organizacijų atsiliepimai (reviews).

---

## 16. Failų struktūros gido santrauka

- `src/routes/index.tsx` — pagrindinis.
- `src/routes/register.tsx`, `login.tsx` — auth.
- `src/routes/student.tsx`, `organization.tsx`, `school.tsx`, `admin.tsx` — dashboard'ai.
- `src/routes/admin.*.tsx` — super admin sub-puslapiai.
- `src/routes/verify.$code.tsx` — sertifikato tikrinimas.
- `src/components/` — modalai, chat, varpelis, 3D fonai.
- `src/lib/*.functions.ts` — server functions (createServerFn).
- `src/integrations/supabase/` — DB klientai (neredaguoti rankomis).
- `docs/` — atskiri gidai (mokyklos, OAuth, PDF, SQL).

---

## 17. Kaip pridėti naują mokyklą (trumpai)

1. Įeik į `/admin/schools`.
2. Spausk „Pridėti mokyklą“.
3. Įrašyk pavadinimą, miestą, sugalvok kodą (pvz., `KAUNAS2027`), pažymėk `is_active`.
4. Duok kodą tos mokyklos administratoriui / auklėtojui.
5. Jie registruodamiesi pasirenka mokyklą + įveda kodą + priskiria klases.

Pilnas gidas — `docs/README-add-school.md`.

---

**Pabaiga.** Šis dokumentas atnaujinamas kartu su platforma. Klausk manęs bet ko — visa architektūra dabar tavo rankose.
