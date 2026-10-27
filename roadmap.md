# Užduotys
- [ ] SV Pagalba: 48 valandų žinučių valymas ir tuščių pokalbių pašalinimas, išsaugant klaidų pranešimus.
- [ ] Mokytojo rezervacijos: kūrimo, priskyrimo, užbaigimo ir mokinio matomumo bei klasių ribų testai.
- [x] Prisijungimo regresija: patvirtinta sesija atskirta nuo profilio klaidos, kartojama duomenų patikra nekartojant slaptažodžio; vieši skaičiai nepriklauso nuo sesijos. 39 testai, tikri 24 / 6 / 1 / 1 skaičiai ir neteisingo slaptažodžio klaida patikrinti; sėkmingas tikros paskyros prisijungimas čia neprieinamas.
- [x] Greitis: sesijos užrakto kliūtis, dubliuotos profilio užklausos ir dirbtinis prisijungimo laukimas pašalinti; formų perėjimai sutrumpinti, laukimas apribotas.
- [x] Pradžios puslapis: nauja perjungiama veiklos eiga ir auditorijų skiltis; tamsus ir šviesus 390 px vaizdas patikrinti.
- [x] 75 testai praėjo; naršyklėje forma atsivėrė per 0,93 s, neteisingas prisijungimas neužstrigo, registracija atsivėrė, horizontalaus perslinkimo ir vykdymo klaidų nėra.
- [ ] Prisijungusių paskyrų įkėlimo greičio patikra — išorinio Supabase sesijos čia neprieinamos.
- [x] Pradžia: animuotas pavadinimas, išplėstas simbolių meniu, širdelės sukimasis, perėjimai ir matomas elegantiškas šviesus fonas; naršyklėje patikrintas meniu, penki paspaudimai, prisijungimas ir 390 px vaizdas.
- [x] Soci Guard: laikymas patvirtintas serveryje naršyklėje, reCAPTCHA matoma, galima grįžti prie laikymo; ryšio klaidos nebepakeičia patikros į matematiką. Tikro domeno nustatymai nepatikrinti.
- [x] Animuotas 404 / blokavimo elementas be nuotraukos; PIN tik įvedus jumpsipidy; atskiras viešas būsenos klientas. Naršyklės patikra ir 10 testų praėjo; tikrą domeną sustabdė roboto patikra.
- [x] Automatiniai grėsmės lygiai: 2 techninių gedimų patikros, 3 sveikos atkūrimui; rankiniai / saugumo blokavimai neatveriami automatiškai. 7 SQL klasifikavimo patikros praėjo; tikras incidentas nebuvo sukeltas.
- [x] Pradžios puslapio paveikslėlis pagal pavyzdžius — tik maketas, svetainė nepakeista.
- [x] Saugios prieigos nuskaitymas, administracinis įėjimas ir nauji 404 / blokavimo ekranai (17 testų; tikra vieša būsena, atkūrimas ir imituotas blokavimas patikrinti naršyklėje).

- [x] Nauja klaidų pranešimų išvaizda ir lietuviški prisijungimo / registracijos paaiškinimai (formų patikra naršyklėje, 8 testai)

- [x] Suvienodinti tos pačios sudėties pokalbius, 12 dienų ištrynimas, organizacijų filtrai ir datos (prisijungusio naudotojo gyva patikra neprieinama)

- [x] Mokyklos rezervacijos mokinio skydelyje iškart, be papildomo patvirtinimo (9 testai; prisijungusio mokinio gyva patikra neprieinama)

- [x] Neprivalomas rezervacijų laikas, galutinis valandų pasirinkimas ir organizacijų pokalbis
- [x] QR puslapio atnaujinimas ir elegantiška šviesi tema

- [x] Logotipo užrašas su šriftu ir spalvų perėjimu
- [x] Sklandus perėjimas iš pradžios į prisijungimą / registraciją
- [x] Nustatymų mygtukas meniu + „Elegantiškas“ fono režimas
- [x] Auklėtojas: rezervacija visiems (/tasks) arba tik klasei
- [x] „Kviesti klasę“: visų veiklų sąrašas su filtrais → mokiniai → kortelė pokalbyje
- [x] Organizacijos skydelio išvaizda + specialus atsijungimo mygtukas + kūrimas iššokančiame lange
- [x] Daugiau slaptų Super Admin registracijos parinkčių
- [ ] Laiškai per Resend — laukia RESEND_API_KEY / RESEND_FROM patikros Vercel'yje
- [ ] QR / atvykimo / PDF gyva patikra — reikia tikro domeno ir paskyrų
- [x] Auklėtojas↔mokinys pokalbiai išjungti (DB + UI); lieka org↔mokinys ir auklėtojas↔org; klasės kvietimai pakeisti rezervacijų priskyrimu
- [x] Auklėtojo skydelio taisyklės: „null“ laiko žymos, mokyklos priskyrimo vedlys, grįžimo nuorodos, klasių progreso suvestinė, greitieji veiksmai (329 testai, build OK)
- [x] Auklėtojo skydelio „peak“ perdarymas: KPI kortelės, valandų dinamikos ir klasių grafikai (recharts), sąrašai su avatarų inicialais, pasisveikinimas, Edaca-stiliaus šoninis meniu (339 testai, DB apribojimai patvirtinti gyvai, RPC parašai sutikrinti)
