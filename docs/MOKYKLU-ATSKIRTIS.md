# Mokyklų atskirtis — kaip mokiniai priklauso savo mokyklai

Sistema užtikrina, kad **X mokyklos mokiniai nemato Y mokyklos** duomenų ir atvirkščiai. Tai daroma dviejuose lygiuose: registracijos metu ir duomenų bazės lygyje (RLS).

## 1. Registracijos metu

Registracijos formoje mokinys:
1. Pasirenka mokyklą iš sąrašo.
2. Įveda tos mokyklos `signup_code` (gauna iš mokyklos administracijos).
3. Serveris kviečia RPC `verify_school_signup_code(_school_id, _code)` — jei netinka, registracija atmetama ir jokia paskyra nesukuriama.

Sėkmingai užsiregistravus, profilyje įrašomas `school_id`. Šis laukas nustatomas **tik registracijos metu** ir mokinys jo pats keisti negali.

## 2. Duomenų bazės lygyje (Row Level Security)

Visos svarbios lentelės (`profiles`, `reservations`, `chat_rooms`, `messages`, `tasks`) turi RLS politikas, kurios remiasi `school_id` ir `associated_school_id`:

- **Mokinys** mato tik savo paties duomenis (`auth.uid() = id`).
- **Mokyklos administratorius** (`school_admin`) mato **tik** tuos mokinius, kur `student.school_id = school_admin.associated_school_id`. Tai užtikrina `can_view_profile()` funkcija.
- **Organizacija** mato tik tuos mokinius, su kuriais turi bendrą rezervaciją arba pokalbį.
- **Super admin** mato viską.

Net jeigu kas nors bandytų tiesiogiai kviesti API su kitos mokyklos ID, Postgres pats atmes užklausą — frontend čia niekuo dėtas.

## 3. Kaip patikrinti, kad veikia

1. Sukurk dvi mokyklas: `AAA` ir `BBB`.
2. Užregistruok mokinį į `AAA`, kitą į `BBB`.
3. Sukurk `school_admin` paskyrą per `Admin → Kurti paskyras` ir priskirk jai mokyklą `AAA`.
4. Prisijunk kaip tas school_admin — sąraše turi matytis tik `AAA` mokinys.
5. Prisijunk kaip `AAA` mokinys — jokio `BBB` mokinio ar užduoties niekur nesimatys.

## 4. Ką NEDARYTI

- Nekeisk `school_id` esamam mokiniui rankiniu būdu SQL — sulaužysi istoriją.
- Nedaryk RLS politikos, kuri leistų `school_admin` matyti visus `profiles` — būtinai filtruok per `associated_school_id`.
- Niekada neatiduok `signup_code` viešai (jis paslėptas net iš `SELECT` per `anon` rolę).
