# Socialinės Valandos — pilna platformos apžvalga (kiekvienas mygtukas ir funkcija)

Šis dokumentas paprasta kalba paaiškina **kiekvieną** mygtuką, laukelį, puslapį ir funkciją visoje platformoje. Skirtas tau, savininkui, kad greitai suprastum bet kurią vietą sistemoje — net jei nesi programuotojas.

**Techninis pagrindas** (trumpai): TanStack Start (React) frontendas + Lovable Cloud (Supabase) backendas su RLS taisyklėmis. Vercel hosting. Domenas šiuo metu `socialinesvalandos.vercel.app`, vėliau bus `socialinesvalandos.lt`.

---

## Turinys

1. Kas yra platforma
2. Vaidmenys (rolės)
3. Bendri UI elementai (visur matomi)
4. Pagrindinis puslapis `/`
5. Registracija `/register`
6. Prisijungimas `/login`
7. Slaptažodžio atstatymas
8. Užduočių sąrašas `/tasks`
9. Verifikacijos puslapis `/verify/$code`
10. Moksleivio dashboard'as `/student`
11. Organizacijos dashboard'as `/organization`
12. Mokyklos administratoriaus dashboard'as `/school`
13. Super admin dashboard'as `/admin` (kiekvienas sidebar mygtukas)
14. Chat sistema (3-way + DM)
15. Pranešimų varpelis
16. Draugystės sistema
17. PDF sertifikatai
18. Lockdown režimas ir slaptas apėjimas
19. Debug panelis
20. Saugumas ir privatumas
21. Automatiniai cron darbai
22. Failų struktūra
23. Kaip pridėti mokyklą / keisti kodą
24. Ateities planai

---

## 1. Kas yra „Socialinės Valandos“?

Mokyklų platforma, kurioje:
- **Moksleiviai** susiranda savanoriškas veiklas ir renka valandas.
- **Organizacijos** siūlo užduotis, tvirtina rezervacijas, uždaro darbus.
- **Mokyklos administratoriai (auklėtojai)** kontroliuoja savo klases, audituoja, aptinka apgaules.
- **Super administratorius (tu)** valdo viską — mokyklas, paskyras, saugumą, lockdown.

Pasiekus valandų tikslą, mokinys generuoja **HMAC-pasirašytą PDF sertifikatą** su QR kodu, kurį universitetai gali patikrinti.

---

## 2. Vaidmenys

1. **Svečias (guest)** — neprisijungęs. Mato viešus puslapius.
2. **Moksleivis (student)** — renka valandas.
3. **Organizacija (organization)** — siūlo užduotis.
4. **Mokyklos administratorius (school_admin)** — mokytojas/auklėtojas.
5. **Super administratorius (admin)** — visagalis.

Rolė saugoma dviejose vietose: `profiles.role` (rodymui) ir `user_roles` (leidimų patikrai per `has_role` SECURITY DEFINER funkciją). Kliento pusėje pakeisti — neįmanoma.

---

## 3. Bendri UI elementai (visur matomi)

### 3.1 Viršutinė navigacija (`layout.tsx`)

- **Logotipas kairėje** — spustelėjus grįžta į `/`.
- **Navigacijos mygtukai** — dinamiškai keičiasi pagal rolę:
  - Svečias: „Užduotys“, „Prisijungti“, „Registruotis“.
  - Moksleivis: „Užduotys“, „Mano skydelis“, „Draugai“, varpelis, profilis.
  - Organizacija: „Skydelis“, „Užduotys“, varpelis, profilis.
  - Mokyklos admin: „Mokyklos skydelis“, varpelis, profilis.
  - Super admin: „Admin skydelis“ + visi kiti mygtukai.
- **Pranešimų varpelis** (žr. 15 sk.).
- **Profilio meniu** — dropdownas su „Nustatymai“, „Atsijungti“.
- **Mobiliajame** — mygtukai suglaudžiami į „hamburger“ meniu (sliding sheet).

### 3.2 Bug Report Widget (`bug-report-widget.tsx`)

Mažas mygtukas apatiniame dešiniame kampe visuose puslapiuose. Paspaudus:
- Atsidaro formos modalas.
- Automatiškai užpildoma: dabartinis URL, user agent, laiko žymė.
- Vartotojas rašo pranešimą.
- Įrašas keliauja į `bug_reports` lentelę.
- Super admin mato juos `/admin/bugs`.

### 3.3 Cookie Consent (`cookie-consent.tsx`)

GDPR baneris apačioje pirmo apsilankymo metu. Mygtukai:
- **„Sutinku“** — įrašo į `localStorage`, baneris dingsta.
- **„Sužinoti daugiau“** — nukreipia į `/terms`.

### 3.4 3D fono efektai (`background-fx.tsx`, `tasks-background.tsx`, `auth-3d-background.tsx`)

- Naudoja Three.js dalelėms ir parallax efektams.
- Skirtingi fonai skirtinguose puslapiuose (login turi aurora, tasks — OpenGL dalelės).
- Automatiškai išjungiami mobiliuose telefonuose taupant baterija ir performance.

### 3.5 Onboarding turas (`onboarding-tour.tsx`)

Pirmą kartą prisijungęs bet kuris vartotojas mato **spotlight tour** — apšviečia svarbiausius mygtukus, paaiškina ką jie daro. Mygtukai:
- **„Kitas“** — kitas žingsnis.
- **„Atgal“** — ankstesnis.
- **„Praleisti“** — uždaro, įrašo į `localStorage` kad daugiau nerodytų.

### 3.6 Error Monitor (`error-monitor.tsx`)

Fone gaudo JavaScript klaidas, siunčia į `incident_reports` per `incident.functions.ts`. Vartotojas nieko nemato — tai skirta tau debug'inti.

---

## 4. Pagrindinis puslapis `/` (`routes/index.tsx`)

### 4.1 Hero sekcija
- **Antraštė** — „Socialinės valandos, kurios veikia“.
- **Sub-tekstas** — trumpas platformos pristatymas.
- **3D interaktyvi kortelė** su tavo statistika:
  - Jei prisijungęs mokinys — rodo **realias** `hours_earned / hours_needed`.
  - Jei neprisijungęs — rodo pavyzdinį „0/20 val.“.
- **CTA mygtukai**: „Pradėti dabar“ (→ `/register`), „Peržiūrėti užduotis“ (→ `/tasks`).

### 4.2 Live statistika (visai svetainei)
Trys skaitikliai atnaujinami realiu laiku:
- **Bendras valandų skaičius** (visų mokinių sukauptos).
- **Aktyvių mokinių** skaičius.
- **Atvirų užduočių** skaičius.

### 4.3 „Kaip veikia?“ sekcija
Trys žingsniai su tilt-3D kortelėmis: „Rask veiklą“ → „Užsirezervuok“ → „Gauk valandas“.

### 4.4 Featured užduotys
Trys naujausios užduotys iš DB — spusi ir patenki į `/tasks` su ta užduotimi atidaryta.

### 4.5 Footer
Nuorodos: `/terms`, `/verify`, kontaktai, socialiniai tinklai.

---

## 5. Registracija `/register` (`routes/register.tsx`)

**Du režimai** (tab'ai): **Moksleivis** ir **Mokyklos administratorius**. Organizacijų viešos registracijos NĖRA.

### 5.1 Moksleivio forma — laukai

| Laukas | Taisyklė |
|---|---|
| Vardas ir pavardė | Privaloma **bent 2 žodžiai** (validacija) |
| El. paštas | Standartinė validacija |
| Slaptažodis | Min 6 simboliai |
| Mokykla (dropdownas) | Iš `schools` lentelės, tik `is_active = true` |
| Klasė | 5, 6, 7, 8, 9/I gimn., 10/II gimn., 11/III gimn., 12/IV gimn. |
| Valandų tikslas | 5-7 kl. — **fiksuota 20** (readonly); 8+ kl. — įvedi pats (min 8) |
| Mokyklos kodas | Kodą duoda auklėtojas; tikrina RPC `verify_school_signup_code` |
| „Duomenys tikri“ checkbox | Privaloma pažymėti |

**Mygtukai**:
- **„Registruotis“** — validuoja viską; jei kodas blogas, paskyra NEsukuriama.
- **„Prisijungti su Google“** / **„Prisijungti su Discord“** — OAuth flow. Grįžus, jei profilis nepilnas, `/student` parodo profilio užbaigimo formą.
- **„Turi paskyrą? Prisijunk“** — nuoroda į `/login`.

### 5.2 Mokyklos admin forma — papildomas laukas

**Priskirtos klasės** (multi-select checkbox'ai) — kokias klases prižiūrės (`assigned_classes` masyvas). Jei tuščias — mato visą mokyklą.

### 5.3 Google/Discord onboarding

Vartotojas nespaudžia „Registruotis“ — spausdinasi OAuth mygtuką. Grįžus:
- Jei pirmas kartas — `/student` parodo **profilio užbaigimo formą** (mokykla, klasė, tikslas, kodas).
- Kol neužpildo — sistemos naudoti negali.

---

## 6. Prisijungimas `/login` (`routes/login.tsx`)

### 6.1 Formos laukai
- El. paštas.
- Slaptažodis.

### 6.2 Mygtukai
- **„Prisijungti“** — Supabase Auth. Po sėkmės — `window.location.assign('/{role-dashboard}')` (hard navigation, kad išvengtų React #310 race condition).
- **„Google“** — `supabase.auth.signInWithOAuth({ provider: 'google' })`.
- **„Discord“** — tas pats su `discord`.
- **„Pamiršau slaptažodį“** — → `/forgot-password`.
- **„Neturi paskyros? Registruokis“** — → `/register`.

### 6.3 CAPTCHA (`components/captcha.tsx`)

Po **3 nesėkmingų bandymų** — atsiranda paprastas iššūkis (matematika arba paveiksliukas). Serveris išduoda proof token'ą per `captcha.functions.ts`; be jo tolimesnės pastangos atmetamos.

### 6.4 Lockdown režimas

Jei super admin įjungė lockdown — visi mato maintenance ekraną (žr. 18 sk.). Tik super admin gali apeiti su slaptu kodu.

### 6.5 Aurora fonas

Animuotas 3D fonas, kurį galima išjungti automatiškai jei įrenginys silpnas.

---

## 7. Slaptažodžio atstatymas

- `/forgot-password` — įvedi el. paštą, spaudi **„Siųsti nuorodą“**. Supabase siunčia atstatymo laišką.
- `/reset-password` (arba `/update-password`) — įvedi naują slaptažodį, patvirtini, **„Išsaugoti“**.
- `/verify-email` — patvirtinimo landing puslapis po email verification.
- `/auth/callback` — OAuth callback route, tvarko token'ą ir redirect'ą.

---

## 8. Užduočių sąrašas `/tasks` (`routes/tasks.tsx`)

### 8.1 Filtrai (kairė pusė arba viršus mobile)
- **Paieška pagal tekstą** — pavadinimas / aprašymas.
- **Miesto filtras** — dropdownas.
- **Tag'ų filtras** — checkbox'ai (senelių namai, aplinkosauga, renginys ir t.t.).
- **Datos intervalas** — nuo/iki.
- **Rūšiavimas** — naujausios / valandos↓ / valandos↑ / arčiausiai.
- **„Išvalyti filtrus“** mygtukas.

### 8.2 Užduočių kortelės
Kiekviena kortelė rodo:
- Pavadinimą + organizacijos vardą.
- Datą, laiką, valandas, likusias vietas.
- Tag'us.
- **„Rezervuoti“** mygtuką (jei moksleivis prisijungęs).
- **„Detalės“** — atveria pilną modalą.

### 8.3 Rezervacijos modalas (`reservation-dialog.tsx`)

Kai spaudi „Rezervuoti“:
- Datos pasirinkimas.
- Laiko slotas (`08:00-12:00` tipo).
- **Live trukmės skaičiuoklė** — automatiškai parodo, kiek valandų gausi.
- **Pastabos** laukas organizacijai.
- **„Patvirtinti“** — įrašo į `reservations` su statusu `pending`.
- **„Atšaukti“**.

### 8.4 Custom rezervacija (`custom-reservation-dialog.tsx`)

Jei organizacijos nėra sąraše — mokinys spaudžia **„Pasiūlyti savo veiklą“**:
- Aprašymas, tag'ai, data, laikas.
- **Valandos apribotos iki 8 per sesiją** (spam prevencija).
- Aiškus tekstas: „Organizacija turi patvirtinti — savavališkai valandų negausi.“

### 8.5 3D fonas
Specialus OpenGL/Three.js fonas su animuotomis dalelėmis.

---

## 9. Verifikacijos puslapis `/verify/$code` ir `/verify` (`routes/verify.*.tsx`)

**Viešas** puslapis — bet kas gali patikrinti PDF sertifikatą.

### 9.1 `/verify` (index)
- Input laukas: „Įvesk sertifikato kodą“.
- **„Patikrinti“** mygtukas → nukreipia į `/verify/$code`.
- Paaiškinimas kaip sistema veikia ir kodėl klastojimas neįmanomas.

### 9.2 `/verify/$code` (dinamiškas)
Kviečia `verify_certificate` RPC. Rodo:
- ✅ Galioja / ❌ Neegzistuoja / ⚠️ Atšauktas.
- Mokinio vardas, klasė, mokykla.
- Valandos generavimo momentu.
- Dabartinis valandų kiekis DB.
- QR kodo hash'as.

---

## 10. Moksleivio dashboard'as `/student` (`routes/student.tsx`)

### 10.1 KPI kortelės (viršus)
- **Sukauptos valandos** — `hours_earned / hours_needed` + progreso juosta.
- **Laukiančios rezervacijos** — skaičius.
- **Artimiausia veikla** — data + pavadinimas.
- **Draugų skaičius**.

### 10.2 Progreso žiedas
Animuotas SVG žiedas rodo % iki tikslo.

### 10.3 Diagramos (recharts)
- **Valandų augimas per mėnesius** — Area chart.
- **Veiklų kategorijos** — Pie chart pagal tag'us.

### 10.4 Rezervacijų sąrašas
Skirtukai (tabs): **„Laukiančios“**, **„Vykdomos“**, **„Užbaigtos“**, **„Atmestos“**. Kiekvienoje kortelėje:
- Užduoties pavadinimas, data, valandos, statusas.
- **„Chat“** — atveria 3-way chat'ą su organizacija + mokyklos admin.
- **„Detalės“** — pilna info.
- **„Atšaukti“** — jei dar `pending`.

### 10.5 Profilio užbaigimo forma (jei nepilnas)
Rodoma tik pirmą kartą po OAuth registracijos. Laukai: mokykla, klasė, tikslas, kodas. Mygtukas **„Užbaigti profilį“**.

### 10.6 PDF sertifikato mygtukas (`certificate-button.tsx`)
- **Rodomas tik jei** `hours_earned >= hours_needed`.
- Paspaudus — generuojamas PDF su QR kodu.
- **Serveris HMAC-pasirašo** turinį; kliento klastoti negalima.
- Jei valandų neužtenka — mygtukas grey/disabled.

### 10.7 Draugų srautas
Rodo, kas iš klasės neseniai gavo valandų (motyvacija).

---

## 11. Organizacijos dashboard'as `/organization` (`routes/organization.tsx`)

### 11.1 KPI kortelės
- Aktyvių užduočių skaičius.
- Laukiančių mokinių skaičius.
- Šio mėnesio uždarytos valandos.
- Vidutinis atsako laikas.

### 11.2 Analitika (recharts)
- Savanorių dinamika (Line).
- Populiariausi tag'ai (donut).
- Uždarymo greitis.

### 11.3 „Nauja užduotis“ mygtukas → `create-task-panel.tsx`
Formos laukai:
- Pavadinimas, aprašymas.
- Data, laiko intervalas.
- Valandos, spot'ų skaičius.
- Vieta (miestas + adresas).
- **Tag'ai** (`tags-input.tsx` — chip-style input).
- Ar tai vienkartinis renginys (event checkbox).
- **Pakartojimas**: `none` / `weekly` / `biweekly` / `monthly` — pg_cron automatiškai generuoja instances.
- **„Sukurti“** / **„Atšaukti“**.

### 11.4 Rezervacijų valdymas
Kiekvienai `pending` rezervacijai:
- **„Patvirtinti“** — statusas → `approved`, chat'e sisteminė žinutė.
- **„Atmesti“** — → `declined` su priežastimi.
- **„Chat“** — atveria pokalbį.

### 11.5 „Uždaryti su patvirtinimu“ (`verify-close-dialog.tsx`)
Kai darbas atliktas:
- Aprašymas ką mokinys nuveikė.
- **Privaloma teisinė varnelė**: „Patvirtinu, kad mokinys iš tiesų atliko šį darbą; suprantu, kad melagingi liudijimai užtraukia teisinę atsakomybę.“
- Tekstas saugomas `reservations.legal_disclosure`.
- **„Uždaryti“** — kviečia `award_reservation_hours` RPC, atomiškai priskiria valandas mokiniui (ir visiems grupės dalyviams).

### 11.6 Laiko derybos (`change-reservation-dialog.tsx`)
Organizacija siūlo kitą laiką → chat'e mokinys mato **„Priimti“ / „Atmesti“** mygtukus.

---

## 12. Mokyklos administratoriaus dashboard'as `/school` (`routes/school.tsx`)

Skirtukai:

### 12.1 „Mokiniai“
Sąrašas priskirtos klasės mokinių: vardas, klasė, valandos, tikslas, statuso juostelė. Mygtukas **„Auditas“** — atveria mokinio istoriją: visos rezervacijos, teisiniai patvirtinimai, chat'ai.

### 12.2 „Peržiūros eilė“ (fraud detection)
Lentelė su visomis paskutinėmis rezervacijomis. Kolonos: mokinys, klasė, užduotis, data, valandos, statusas, **fraud flags**.

**Fraud flags** (iš `lib/fraud-flags.ts`):
- 🔴 Labai daug valandų (≥10) — didelė rizika.
- 🟠 Ilga sesija (8-9 val.) — vidutinė.
- 🟡 Naktinės valandos (prieš 6:00 arba po 22:00).
- 🔴 Ateities data, jau pažymėta užbaigta.
- 🟠 Persidengia su kita tą pačią dieną.
- 🔴 Sukurta ir užbaigta beveik akimirksniu.
- 🟡 Vyko darbo dieną pamokų metu.

**Mygtukai virš lentelės**:
- Filtras pagal klasę (dropdown).
- „Tik įtartinos“ checkbox.
- „Tik neperžiūrėtos“ checkbox.
- **„Pažymėti visas peržiūrėtomis“** (bulk).
- **„Nuimti peržiūrą“** (bulk).
- **„Eksportuoti CSV“**.

Peržiūros būsena — `localStorage` (greita, DB neapkrauna).

### 12.3 „Organizacijos partneriai“
Sąrašas + **„Rašyti“** mygtukas → chat.

### 12.4 „Vienkartiniai renginiai“ (`create-event-panel.tsx`)
Mokykla pati kuria vienkartinę užduotį (pvz., miesto akcija) be atskiros organizacijos. Panašūs laukai kaip organizacijos formoje.

### 12.5 „Naujos paskyros“ (`school-create-org-panel.tsx`)
Mokyklos admin gali sukurti **iki 10 organizacijų paskyrų** — kai atsiranda nauja bendruomenė ir nenori laukti super admin.

---

## 13. Super admin dashboard'as `/admin`

Sidebar su daug puslapių. Kiekvienas — atskira sekcija.

### 13.1 `/admin` (Overview / `admin.index.tsx`)
- KPI: viso vartotojų, mokinių, organizacijų, mokyklų, atviros užduotys, valandos šį mėnesį.
- Diagramos: augimo Area chart, rolių Pie chart.
- Naujausi įrašai.

### 13.2 `/admin/analytics` (`admin.analytics.tsx`)
Pilnai interaktyvios recharts diagramos:
- Valandų suma per mėnesį (Bar).
- Aktyvūs mokiniai (Line trend).
- Tag'ų kategorijos (donut).
- Vidutinis org → mokinys atsako laikas.

### 13.3 `/admin/manage` (Mokiniai) (`admin.manage.tsx`)
Globali paieška visų mokinių. Mygtukai:
- **„Keisti rolę“** — dropdown.
- **„Redaguoti valandas“** — inline edit.
- **„Ištrinti“** — kaskadinis trynimas.

### 13.4 `/admin/reservations` (`admin.reservations.tsx`)
Visos rezervacijos, filtrai pagal statusą, datą, mokyklą, organizaciją.

### 13.5 `/admin/leaderboard` (`admin.leaderboard.tsx`)
Top mokiniai pagal valandas per savaitę / mėnesį / metus. Motyvacinis rodiklis.

### 13.6 `/admin/schools` (`admin.schools.tsx`)
- Sąrašas mokyklų.
- **„Pridėti mokyklą“** — formoje: pavadinimas, miestas, `signup_code`, `is_active`.
- **„Redaguoti“** — keisti kodą, deaktyvuoti.
- **„Ištrinti“**.
- Autocomplete sinchronizuotas su registracija.

### 13.7 `/admin/accounts` (`admin.accounts.tsx`)
- **„Sukurti paskyrą“** — bet kokiam vaidmeniui.
- **„Ištrinti paskyrą“** — per `admin-delete.functions.ts` kaskadinis trynimas: auth.users → profiles → rezervacijos → žinutės → viskas išvalyta.
- Sąrašas visų vartotojų su rolėmis.

### 13.8 `/admin/organizations` (`admin.organizations.tsx`)
Visų organizacijų valdymas — kūrimas, trynimas, priskyrimas mokyklai.

### 13.9 `/admin/activity` (`admin.activity.tsx`)
Sistemos veiklos žurnalas — prisijungimai, kritinės klaidos, incidentai iš `incident_reports`.

### 13.10 `/admin/messages` (`admin.messages.tsx`)
Chat auditas — visos žinutės (su privatumo įspėjimu). Filtrai pagal chat room, mokyklą.

### 13.11 `/admin/bugs` (`admin.bugs.tsx`)
Bug reports iš `BugReportWidget`. Kolonos: pranešėjas, URL, žinutė, laikas, statusas. Mygtukai: **„Pažymėti išspręstu“**, **„Ištrinti“**.

### 13.12 `/admin/lockdown` (`admin.lockdown.tsx`)
- **Master toggle** — įjungti/išjungti lockdown.
- **Pranešimo tekstas** vartotojams.
- **Klaidos kodas**.
- **Auto-lockdown įjungimas** — jei DB scan aptinka kritinių gedimų.

### 13.13 `/admin/tools` (`admin.tools.tsx`)

Įrankių puslapis. Skyriai:

**A. DB sveikatos patikra** — mygtukas **„Paleisti pilną patikrą“** (`run_deep_health_scan`). 18 testų:
1. Ar `profiles` lentelė pasiekiama.
2. Ar `reservations` pasiekiama.
3. Ar `messages` pasiekiama.
4. Ar `chat_rooms` pasiekiama.
5. Ar `user_roles` pasiekiama.
6. Ar `schools` pasiekiama.
7. Ar `tasks` pasiekiama.
8. Ar RLS įjungtas visose viešose lentelėse.
9. Ar `has_role` funkcija egzistuoja.
10. Ar `can_view_profile` egzistuoja.
11. Ar `award_reservation_hours` egzistuoja.
12. Ar `verify_school_signup_code` egzistuoja.
13. Ar `purge_old_messages` cron dirba.
14. Ar `purge_dm_messages` cron dirba.
15. Ar `generate_recurring_tasks` cron dirba.
16. Ar bent vienas admin egzistuoja.
17. Ar nėra orphan žinučių (be chat_room).
18. Ar nėra senų DM žinučių, kurios neišvalytos.

Rezultatas — spalvota kortelių sienelė. Kritinių gedimų skaičius rodomas viršuje. Jei kritinių >0 — **„Automatiškai įjungti lockdown“** siūlomas mygtukas.

**B. PDF sertifikatų testavimas** — trys mygtukai:
- **„🎭 Fake Demo PDF“** — sugeneruoja pavyzdinį sertifikatą „Jonas Petraitis, 9 kl., Šeduvos gimnazija“ su 20 val. ir 8 fiktyviais įrašais. Skirtas vizualiai peržiūrai.
- **„🧪 Debug PDF“** — sugeneruoja realiam prisijungusiam admin'ui apeinant valandų check'ą (`debug: true` flag'as backend'e).
- **„Verifikuoti kodą“** — įvedi kodą, matai backend'o atsakymą.

**C. Mass reset** (destruktyvūs veiksmai — su patvirtinimu):
- **„Ištrinti visas rezervacijas“**.
- **„Ištrinti visas žinutes“**.
- **„Ištrinti visus mokinius“**.
- Kiekvienas reikalauja įvesti „TAIP TRINTI“ tekstą.

### 13.14 Debug panelis (`mock-tester-panel.tsx`)
Kampinis panelis, matomas tik super admin'ui. Mygtukai:
- **„Sukurti + Login kaip Student“** — vienu paspaudimu mock paskyra, impersonate, dashboard.
- **„Sukurti + Login kaip Organization“**.
- **„Sukurti + Login kaip School Admin“**.
- **„Grįžti į admin“** — atkuria tavo super admin sesiją.

Naudingas testuoti kiekvieną rolę realiu laiku.

---

## 14. Chat sistema

### 14.1 3-way chat (rezervacijoms) — `chat-dialog.tsx`
Kiekviena rezervacija turi savo `chat_room`. Dalyviai: mokinys, organizacija, mokyklos admin (jei priskirtas).

**Mygtukai chat'e**:
- **Siųsti žinutę** (Enter arba mygtukas).
- **„Keisti laiką“** (tik organizacija) → `change-reservation-dialog`.
- **„Pakviesti draugą“** (tik mokinys) → `invite-friends-dialog`.
- **Sisteminės žinutės** — automatiškai atsiranda kai statusas keičiasi.

**Įspėjamasis label'as**: „Žinutės automatiškai trinamos po 12 dienų“ (`purge_old_messages` cron).

### 14.2 DM chat (draugų) — `dm-dialog.tsx`
Asmeninės žinutės tarp draugų. Atskira `dm_rooms` / `dm_messages` lentelė. **Trynimas — 2 dienos** (`purge_dm_messages` cron, agresyvus DB dydžio kontrolei).

### 14.3 Grupės pakvietimai (`group-invites-inbox.tsx`, `invite-friends-dialog.tsx`)
Mokinys pakviečia draugą prisijungti prie rezervacijos. Draugas mato **„Priimti“ / „Atmesti“**. Priėmus — kai užduotis uždaroma, valandos duodamos **visiems** dalyviams.

### 14.4 Realtime
Supabase Realtime subscription — žinutės atsiranda be perkrovimo.

---

## 15. Pranešimų varpelis (`notification-bell.tsx`)

Viršuje dešinėje. Rodo naujus:
- Rezervacijų statuso keitimus.
- Chat žinutes.
- Draugystės užklausas.
- Grupės pakvietimus.

**Mygtukai**:
- Varpelio ikonos badge'as su skaičiumi.
- Paspaudus — dropdown sąrašas.
- Kiekvienas įrašas — spaudi ir keliauji į atitinkamą puslapį (hash URL, gilus linking).
- **„Pažymėti visus perskaitytus“**.

Animuoja bounce kai atsiranda nauja.

---

## 16. Draugystės sistema (`friends-panel.tsx`, `lib/friends.ts`)

Puslapis `/friends` (arba tab moksleivio dashboard'e).

### 16.1 Draugų sąrašas
- Vardas, klasė, valandos.
- **„Rašyti“** — DM chat.
- **„Pašalinti draugą“**.

### 16.2 Užklausos
- **Gautos užklausos**: „Priimti“ / „Atmesti“.
- **Išsiųstos užklausos**: matai statusą.

### 16.3 Paieška
- Įvedi vardą arba el. paštą.
- **„Siųsti užklausą“**.

Duomenys — `friendships` lentelėje su unique constraint `(user1, user2)` (mažesnis ID pirmas, kad neatsirastų duplikatų).

---

## 17. PDF sertifikatai (`components/certificate-button.tsx`, `lib/certificates.functions.ts`)

### 17.1 Generavimas
Mokinys spaudi **„Generuoti sertifikatą“**. Serveris:
1. Patikrina `hours_earned >= hours_needed` (ne debug režimu).
2. Sukuria unikalų `code` (upper-case, ~10 simb.).
3. Suskaičiuoja SHA-256 hash'ą turinio.
4. HMAC-pasirašo su `CERT_SIGNING_SECRET`.
5. Įrašo į `certificates` lentelę.
6. Grąžina duomenis klientui.
7. `pdf-lib` sugeneruoja PDF (elegantiškas dizainas, taupus rašalui):
   - Ploni rėmeliai, hairlines.
   - Klasikinis serifas.
   - QR kodas kampe → `https://socialinesvalandos.lt/verify/{code}`.
   - Sąrašas visų rezervacijų su datomis ir valandomis.
8. Diakritikai (ė, š, ų...) sanitizuojami į ASCII (pdf-lib standart fontai neturi Unicode).

### 17.2 Verifikacija
Bet kas eina į `/verify/$code` arba nuskaito QR:
- Serveris kviečia `verify_certificate` RPC.
- Palygina hash'ą, parašą.
- Rodo: vardas, klasė, mokykla, valandos, laikas, atšaukimo statusas.

### 17.3 Kodėl neklastojama?
- Be įrašo DB — kodas negalioja.
- Be `CERT_SIGNING_SECRET` — parašo neatkursi.
- Turinio hash'as užrakina — pakeitęs bet kokį baitą, matysi mismatch.

Plačiau: `docs/PDF-SERTIFIKATAI.md`, `docs/PDF-VERIFIKACIJA.md`, `docs/PDF-SERTIFIKATAI-SQL.md`.

---

## 18. Lockdown režimas (`admin.lockdown.tsx`, `components/lockdown-gate.tsx`)

### 18.1 Įjungimas
Super admin `/admin/lockdown` puslapyje toggle'ina **„Įjungti lockdown“**. Įrašo į `site_settings.lockdown_enabled = true`.

### 18.2 Ką mato vartotojai
Visi (išskyrus super admin) mato **maintenance ekraną**:
- Antraštė „Sistema laikinai neprieinama“.
- Tavo pranešimas.
- Klaidos kodas.

### 18.3 Slaptas apėjimas („jumpsipidy“)
Būdamas maintenance ekrane, super admin klaviatūra įrašo žodį **`jumpsipidy`** (jokių input laukų — event listener gaudo klavišus).
- Atsiranda kodo įvedimo laukas.
- Įvedi `7851` (arba `LOCKDOWN_BYPASS_CODE` env var).
- Serveris (`lockdown-bypass.functions.ts`) tikrina:
  - Client fingerprint (IP + user agent).
  - Rate limiting (max 5 bandymai, tada 5 min lockout).
  - Progressive delay (`MIN_DELAY_MS + fails * PER_FAIL_DELAY_MS`).
  - Po 3 fail'ų — reikalauja CAPTCHA.
  - Constant-time palyginimas (timing attack apsauga).
- Sėkmės atveju — HMAC-SHA256 token'as saugomas `sessionStorage`, kuris leidžia super admin toliau naršyti.

### 18.4 Auto-lockdown
Jei `run_deep_health_scan` randa kritinių gedimų, `auto_lockdown_if_unhealthy` automatiškai įjungia lockdown su pranešimu „[auto] Sistemos patikra rado X kritinių gedimų“.

---

## 19. Debug panelis (mock-tester)

Žr. 13.14. Tik super admin'ui. Vienu paspaudimu:
- Sukuria mock paskyrą su fake el. paštu ir slaptažodžiu.
- Impersonate'ina — tu tampi tuo vartotoju.
- Grįžimas — atkuria tavo super admin sesiją.

---

## 20. Saugumas ir privatumas

- **RLS visose lentelėse** — kiekvienas mato tik savo.
- **`can_view_profile`** funkcija — centralizuota profilio matomumo logika.
- **`has_role`** SECURITY DEFINER — anti-privilege-escalation.
- **`user_roles`** — atskira lentelė (ne `profiles.role`).
- **CAPTCHA** — prisijungime + lockdown apėjime.
- **Bearer token middleware** — `src/start.ts` prideda `Authorization: Bearer` prie kiekvieno server function.
- **HMAC parašai** — sertifikatai, bypass token'ai.
- **Constant-time palyginimai** — apsauga nuo timing attack'ų.
- **Rate limiting** — CAPTCHA, lockdown bypass.
- **Cookie consent** — GDPR banner.
- **12 d. / 2 d. autopurge** — žinutės neamžinai kaupiasi.
- **Legal disclosure** — organizacijų parašai saugomi audite.
- **Incident reports** — kliento klaidos automatiškai loguojamos.

---

## 21. Automatiniai cron darbai (pg_cron)

| Darbas | Dažnis | Ką daro |
|---|---|---|
| `purge_old_messages` | kasdien | Trina chat žinutes >12 d. |
| `purge_dm_messages` | kasdien | Trina DM žinutes >2 d. |
| `generate_recurring_tasks` | kasdien naktį | Iš `recurring_tasks` sukuria naujas instances |
| `auto_lockdown_if_unhealthy` | rekomenduojama valandinis | Paleidžia health scan, jei kritinis — lockdown |

Visas SQL: `docs/SQL-REFERENCE.md`.

---

## 22. Failų struktūra

```
src/
├── routes/
│   ├── __root.tsx          # Root layout, head, providers
│   ├── index.tsx           # /
│   ├── register.tsx        # /register
│   ├── login.tsx           # /login
│   ├── tasks.tsx           # /tasks
│   ├── student.tsx         # /student
│   ├── organization.tsx    # /organization
│   ├── school.tsx          # /school
│   ├── admin.tsx           # /admin layout
│   ├── admin.index.tsx     # /admin overview
│   ├── admin.analytics.tsx
│   ├── admin.manage.tsx
│   ├── admin.reservations.tsx
│   ├── admin.leaderboard.tsx
│   ├── admin.schools.tsx
│   ├── admin.accounts.tsx
│   ├── admin.organizations.tsx
│   ├── admin.activity.tsx
│   ├── admin.messages.tsx
│   ├── admin.bugs.tsx
│   ├── admin.lockdown.tsx
│   ├── admin.tools.tsx
│   ├── verify.index.tsx
│   ├── verify.$code.tsx
│   ├── forgot-password.tsx
│   ├── update-password.tsx
│   ├── auth.callback.tsx
│   ├── terms.tsx
│   ├── blog.*.tsx
│   └── status.tsx
├── components/
│   ├── layout.tsx
│   ├── notification-bell.tsx
│   ├── bug-report-widget.tsx
│   ├── cookie-consent.tsx
│   ├── captcha.tsx
│   ├── lockdown-gate.tsx
│   ├── onboarding-tour.tsx
│   ├── mock-tester-panel.tsx
│   ├── chat-dialog.tsx
│   ├── dm-dialog.tsx
│   ├── reservation-dialog.tsx
│   ├── custom-reservation-dialog.tsx
│   ├── change-reservation-dialog.tsx
│   ├── verify-close-dialog.tsx
│   ├── create-task-panel.tsx
│   ├── create-event-panel.tsx
│   ├── school-create-org-panel.tsx
│   ├── certificate-button.tsx
│   ├── friends-panel.tsx
│   ├── invite-friends-dialog.tsx
│   ├── group-invites-inbox.tsx
│   ├── tags-input.tsx
│   ├── tilt-card.tsx
│   ├── background-fx.tsx
│   ├── tasks-background.tsx
│   ├── auth-3d-background.tsx
│   └── error-monitor.tsx
├── lib/
│   ├── certificates.functions.ts
│   ├── admin-delete.functions.ts
│   ├── admin-actions.functions.ts
│   ├── admin-super.functions.ts
│   ├── auth-profile.functions.ts
│   ├── captcha.functions.ts
│   ├── dev-tools.functions.ts
│   ├── incident.functions.ts
│   ├── lockdown.functions.ts
│   ├── lockdown-bypass.functions.ts
│   ├── school-signup.functions.ts
│   ├── security-crypto.server.ts
│   ├── fraud-flags.ts
│   ├── friends.ts
│   ├── dm.ts
│   ├── site-settings.ts
│   └── mock-data.ts
├── hooks/
│   ├── use-auth.tsx
│   └── use-mobile.tsx
└── integrations/supabase/
    ├── client.ts           # browser client (auto-gen)
    ├── client.server.ts    # admin server client (auto-gen)
    ├── auth-middleware.ts  # (auto-gen)
    └── types.ts            # (auto-gen)

docs/
├── PRIDETI-MOKYKLA.md
├── KEISTI-MOKYKLOS-KODA.md
├── MOKYKLU-ATSKIRTIS.md
├── OAUTH-GOOGLE-DISCORD.md
├── PDF-SERTIFIKATAI.md
├── PDF-SERTIFIKATAI-SQL.md
├── PDF-VERIFIKACIJA.md
├── LOCKDOWN_SQL_SETUP.md
├── RECAPTCHA-SETUP.md
└── SQL-REFERENCE.md
```

---

## 23. Kaip pridėti mokyklą / keisti kodą

**Pridėti mokyklą**:
1. `/admin/schools` → **„Pridėti mokyklą“**.
2. Pavadinimas, miestas, kodas (pvz., `KAUNAS2027`), `is_active = true`.
3. Duok kodą tos mokyklos auklėtojui.

**Keisti kodą**:
1. `/admin/schools` → mokykla → **„Redaguoti“**.
2. Naujas `signup_code`.
3. Praneški visiems auklėtojams.

**Deaktyvuoti**:
1. Redaguoti → `is_active = false`.
2. Nauji vartotojai nebematys jos registracijoje; esami tęsia darbą.

Pilni gidai: `docs/PRIDETI-MOKYKLA.md`, `docs/KEISTI-MOKYKLOS-KODA.md`.

---

## 24. Naujausi patobulinimai (2026-07)

### 24.1 Klaidų centras `/admin/errors` (Error Center)
Atskiras SaaS-tipo puslapis su savo sidebar'u ir 7 skyriais:

- **Apžvalga** — KPI kortelės (500 įrašų, paskutinė val., kritinės 5 min, email siųsta), 24h sparkline.
- **Live srautas** — realaus laiko sąrašas su regex paieška (`.* ` režimo mygtukas), laiko lango filtrais (5m / 1h / 24h / visi), tipo filtrais su skaičiukais.
- **Analitika** — pasiskirstymas pagal tipą (animuoti bar chart'ai), 24h sparkline.
- **Dažniausios** — TOP 10 klaidų grupuota pagal žinutę; paspaudus filtruoja Live srautą.
- **Šaltiniai** — TOP 10 puslapių, TOP 8 naršyklių, TOP 8 OS su procentiniais bar'ais + klavišų kombinacijų kortelė.
- **Auto-lockdown** — vizualus slenksčio matuoklis (kritinės / 3 per 5 min), rankinis toggle.
- **Nustatymai** — kopijavimas AI'ui, testinės klaidos generavimas, JSON eksportas, ignoravimo šablonų valdymas, mass clear.

**Papildomos funkcijos:**
- **Automatinis atnaujinimas** — 5s / 15s / 60s / išj. pasirinkimas (localStorage'e).
- **Ignoravimo šablonai** — įrašai atitinkantys fragmentus (žinutė / kelias / šaltinis) slepiami; „Rodyti paslėptus" toggle su skaičiuku.
- **Testinės klaidos mygtukas** — sukuria dirbtinę `client.error`, kad patikrintum ar log pipeline'as veikia.
- **Klavišų kombinacijos** — `/` fokusuoja paiešką, `L` toggle'ina Live, `Esc` išvalo paiešką.
- **Kopijuoti AI'ui** — vienu paspaudimu formatuotas plain text (visos / filtruotos / vienetinė iš detalės modal'o).
- **Auto-lockdown eskalacija** — 3+ kritinės klaidos per 5 min automatiškai įjungia lockdown režimą (`error-escalation.functions.ts`).

### 24.2 Organizacijų profiliai su nuotraukomis ir žemėlapiu
- Organizacijos gali įkelti logo / cover nuotraukas (Supabase Storage bucket).
- **Google Maps / Leaflet integracija** — adresas paverčiamas koordinatėmis, embed'as rezervacijos ir profilio kortelėse.
- **Street View** nuoroda — mokinys mato kur eina prieš rezervuodamas.
- Aprašymas, socialiniai tinklai, veiklos sritys, kontaktai.

### 24.3 Email notifikacijos (Resend)
Custom HTML šablonai `src/lib/email-templates/`, 3D-stiliaus dizainas su gradientais:

- **Welcome** — po registracijos.
- **Reservation approved** — kai organizacija patvirtina laiką.
- **Reservation declined** — su atmetimo priežastimi.
- **Hours confirmed** — kai užduotis uždaroma, valandos paskaičiuotos.
- Anti-spam header'iai, DKIM per custom domain'ą, plain-text fallback.
- Test panelis `/admin/tools` — siunčia demo email.

### 24.4 Achievements sistema (`user_achievements`)
- Automatiniai badge'ai: „Pirma rezervacija", „10 valandų", „50 valandų", „Šimtininkas", „Draugystės meistras", „Serial helper" ir kt.
- Mokinys mato progress bar'us dashboard'e.
- Duomenys `user_achievements` lentelėje su triggeriais ant `reservations.status = completed`.

### 24.5 Audit log `/admin/activity`
- Ieškoma pagal veiksmą, vartotoją, entitetą, datą.
- Visi svarbūs įvykiai automatiškai loguojami (`activity_log`): prisijungimai, statuso keitimai, rolės pakeitimai, lockdown toggle, admin veiksmai.
- Realtime subscription — nauji įrašai atsiranda be perkrovimo.

### 24.6 Multi-role onboarding wizard
Rebuilt `onboarding-tour.tsx` — atskiri žingsniai student / organization / school_admin / admin. Interaktyvūs tooltip'ai, skip / next / prev, `localStorage` progress.

### 24.7 Grupės pakvietimai rezervacijoje
- Kuriant rezervaciją mokinys mato **„Pakviesti draugus"** mygtuką.
- Draugai gauna pakvietimą į `group-invites-inbox.tsx`.
- Kai užduotis uždaroma — valandos duodamos visiems priėmusiems dalyviams.

### 24.8 Klasės valandų taisyklės
- 5–7 klasė — griežtai **20 val.** (locked, negalima keisti registracijoje).
- 8+ klasė — minimum **8 val.**, mokinys pasirenka norimą kiekį.
- „Pasiūlyk rezervaciją" ribotas **max 8 val. per sesiją** (anti-abuse).

### 24.9 Sukčiavimo eilė + bulk actions (`/school`)
Mokyklos administratoriui:
- **Fraud queue** — automatiškai pažymėtos rezervacijos (per didelis valandų kiekis, per mažas laikas tarp rezervacijų, dubliuoti tag'ai).
- **Bulk approve / reject** — checkbox'ai + veiksmų juosta.
- **Per-class view** — filtras pagal klasę, statistika kiekvienai atskirai.

### 24.10 CSRF warning nutildytas
Vite plugin flag'as `serverFns.disableCsrfMiddlewareWarning: true` — server function'ai apsaugoti bearer token'u + same-origin, CSRF neaktualus.

---

## 25. Ateities planai (dar neįdiegta)

- Bulk student import iš CSV.
- 2FA super admin paskyroms.
- PWA (offline režimas telefone).
- Kalendoriaus vaizdas rezervacijoms.
- Organizacijų atsiliepimai (reviews).
- Mobile app (native).
- Multi-language support (EN, RU).

---

**Pabaiga.** Šis dokumentas atnaujinamas kartu su platforma. Jei kažkur radai neaiškumo — klausk manęs, atnaujinsiu.

