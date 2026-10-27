// Detailed on-screen guide for SV Pagalba: what users see and click. Update when UI changes.
export const SUPPORT_UI_GUIDE = `# EKRANO GIDAS (ką žmogus mato ir spaudžia)

## Viršutinis meniu
- Kairėje širdelė ir „Socialinės Valandos“ — atidaro pradžią.
- Nuorodos: „Pradžia“, „Veiklos“; prisijungus — „Mano sritis“ ir „Pokalbiai“.
- Didinamasis stiklas „Ieškoti“ (arba Ctrl K): lauke „Kur nori eiti?“ rask puslapį.
- Varpelis — „Pranešimai“ su filtrais „Visi“, „Žinutės“, „Rezervacijos“.
- Saulė/mėnulis perjungia šviesią/tamsią temą; šalia „Temos nustatymai“ (akcento spalva, „Elegantiškas režimas“).
- Neprisijungus: „Prisijungti“ ir „Registruotis“ viršuje dešinėje. Prisijungus — paskyros meniu su vardu, srities nuoroda ir „Atsijungti“. Mokiniui ten „Mokinio sritis“ ir „Mano QR kodas“, organizacijai „Organizacijos sritis“ ir „Skenuoti QR kodą“, mokytojui „Auklėtojo sritis“.
- Telefone — trijų brūkšnių mygtukas „Meniu“ kairėje viršuje: „Pradžia“, „Užduotys ir organizacijos“, paskyros nuorodos, „SV Guard“, „Kas naujo“, tema, prisijungimas/atsijungimas.

## Prisijungimas
- Viršuje dešinėje „Prisijungti“ → įrašyk „El. paštas“ ir „Slaptažodis“ → „Prisijungti“. Akies piktograma parodo slaptažodį. Galima „Google“.
- Po forma: „Registruokis“ ir „Pamiršai slaptažodį?“.

## Registracija
- Viršuje dešinėje „Registruotis“ → ekranas „Sukurk paskyrą“ → pasirink „Moksleivis“ arba „Organizacija“.
- Moksleivis: „Vardas Pavardė“; „Mokykla ir klasė“ → pasirink „Mokykla“ ir įvesk klasės kodą (MKC-XXXXX-X); „El. paštas“, „Slaptažodis“ (bent 10 simbolių, raidės ir skaičiai); pažymėk patvirtinimą, kad esi tikras mokinys → „Sukurti paskyrą“. Tada patvirtink el. paštą laiške.
- Organizacija pildo prašymą: „Organizacijos pavadinimas“, „Juridinio asmens kodas“, „Kontaktinis asmuo“, „Kontaktinis el. paštas“, „Telefonas“, „Interneto svetainė“, „Trumpas veiklos aprašymas“ (min. 30 simb.) → „Pateikti prašymą“. Administratorius patvirtina.
- Po Google prisijungimo gali atsirasti „Užbaik mokinio registraciją“: patikrink vardą, pasirink mokyklą, įrašyk „Klasės kodas“ → „Patvirtinti ir tęsti“.

## Pamirštas slaptažodis
- Prisijungimo lange „Pamiršai slaptažodį?“ → „Atkurti slaptažodį“ → įrašyk el. paštą → „Siųsti atkūrimo nuorodą“ → laiške spausk nuorodą ir susikurk naują slaptažodį.

## Veiklų paieška (meniu „Veiklos“)
- „Atrask savo veiklą.“ ir paieškos laukelis („Gyvūnų prieglauda, biblioteka, organizacija…“).
- Mygtukai „Veiklos“, „Žemėlapis“, „Organizacijos“; miestų mygtukai arba „Visi miestai“.
- „Filtrai“ — „Miestas“, „Organizacija“, „Kategorija“, žymos; „Išvalyti filtrus“.
- Veiklos kortelėje spausk pavadinimą detalėms arba „Rezervuoti“.
- Rezervavimo lange: „Data“, jei yra — „Pradžios laikas“/„Pabaigos laikas“, „Numatomos valandos“, neprivaloma „Žinutė organizacijai“.
- Eiti su draugais: įjunk ėjimą su draugais → „Pasirink, su kuo eisi“ → spausk draugų vardus. Neturint draugų — pridėk juos skiltyje „Draugai“.
- Spausk „Siųsti užklausą“ arba „Rezervuoti su … draugais“. Galutines valandas po darbo pasirenka organizatorius.

## Mokinio sritis (meniu „Mano sritis“)
- Šoninis meniu: „Pradžia“, „Užduotys“, „Mano rezervacijos“, „Pasiekimai“, „Draugai“, „Žinutės“.
- Viršuje: „+ Naršyti užduotis“, „Pasiūlyk rezervaciją“, „Parodyti QR kodą“ ir pažymėjimo mygtukas.
- „Metinis tikslas“ — progreso žiedas: surinktos/reikalingos valandos, likutis, serija, užbaigti vizitai.
- „Kitas vizitas“ — artimiausia rezervacija, „Atverti pokalbį“.
- Kortelės: „Užbaigtos valandos“, „Liko valandų“, „Aktyvios rezervacijos“, „Organizacijos“.
- Serija: „🔥 Aktyvuoti šiandienos seriją“; „Karščiausi streak'ai mokykloje“; „Savaitinis aktyvumas“; pasiekimų ženkleliai.
- „Draugai“: paieška pagal vardą („Vardas, pvz. Jonas“), grupių kvietimai, pranešimų įjungimas.
- „Mano rezervacijos“ filtrai: „Visos“, „Laukia“, „Vykdomos“, „Užbaigtos“. Organizacijos rezervacijoje — „Pakviesti draugus“, „QR kodas“, „Pokalbis“. „Auklėtojo rezervacija“ — papildomai patvirtinti nereikia, QR nereikia.
- QR: „Parodyti QR kodą“ arba rezervacijos „QR kodas“ — atidaromas QR ekranas su šešių skaitmenų kodu.
- Pažymėjimas: kol trūksta valandų — „🔒 PDF sertifikatas“; surinkus — „📄 Atsisiųsti PDF sertifikatą“.

## Organizacijos sritis
- Viršuje: „Nauja veikla“, „Skenuoti QR“, „Kaip mato mokiniai“, „Atsijungti“.
- „Nauja veikla“: pavadinimas, aprašymas, „Data“, „Pradžia (nebūtina)“, „Pabaiga (nebūtina)“, „Valandos“, „Miestas“, vieta, „Vietų“, adresas žemėlapyje, žymos, „Pasikartojimas“ (vienkartinė, kas savaitę, kas antrą savaitę, kas mėnesį) → „Paskelbti užduotį“.
- Analitika: rezervacijų ir valandų rodikliai, „Vizitai pagal savaitės dieną“, „Priėmimo lygis“, „Grįžtantys savanoriai“, „Aktyviausi savanoriai“.
- „Laukiančios užklausos“: „Pokalbis“, „Patvirtinti ir pradėti darbą“, „Atmesti“; keliems — „Pažymėti visas“, „Patvirtinti pažymėtas“.
- „Vykdomos užduotys“: kol mokinys neįregistruotas — „Nuskaityti kodą“. Po to „Patvirtinti ir uždaryti užduotį“ → „Kiek valandų skirti?“ → „Patvirtinti · … val.“.
- QR skenavimas („Skenuoti QR“): ekranas „Įregistruoti savanorį“ — leisk kamerą ir nukreipk į QR arba įvesk šešių skaitmenų „Kodas“. Apačioje „Šios sesijos įrašai“.

## Mokytojo (auklėtojo) sritis
- Meniu: „Apžvalga“, „Mokiniai“, „Rezervacijos“, „Pokalbiai“, „Visos veiklos“, „Grįžti į svetainę“.
- „Apžvalga“: „Mokiniai“, „Vidutinis progresas“, „Surinkta valandų“, „Artėjančios“, „Valandų dinamika“, „Valandos pagal klases“, „Reikia dėmesio“, „Klasių progresas“, „Streak lyderiai“.
- „Mokiniai“: paieška pagal vardą ar el. paštą, valandos ir progresas.
- „Rezervacijos“: „Kviesti klasę“, „Veikla visiems“, „Tik mano klasei“. „Tik mano klasei“ → „Nauja rezervacija“: „Data“, „Valandos“, laikas (nebūtina), „Tipas“, „Organizacija (nebūtina)“ arba „Mokyklos renginys“, „Pastaba“; „Klasė ir raidė“ (Visos klasės / A ir B / A / B) → pažymėk mokinius.
- Įraše: „Patvirtinti valandas“, „Priskirti klasei“, „Redaguoti“, „Ištrinti“.
- „Pokalbiai“: „Rašyti organizacijai“, ruošiniai „Padėka“, „Rezervacijos patvirtinimas“, „Klausimas apie valandas“. Mokytojas su mokiniais tiesiogiai nesusirašinėja.
- Klaustukas „Sąsajos vedlys“ paleidžia turą (Enter — toliau, Esc — uždaryti).

## Pokalbiai
- „Naujas pokalbis“ → pasirink kontaktą. Kairėje paieška „Ieškoti pokalbio…“, datos „Nuo“/„Iki“, rikiavimas. Telefone „Atgal į pokalbius“.

## Kita
- Apačioje dešinėje „Pranešti apie klaidą“ — klaidos forma su svarbumu, žingsniais ir neprivaloma nuotrauka.
- Slapukų juosta: „Atmesti visus“, priimti, „Tinkinti pasirinkimus“.
- Pirmą kartą — temos langas „Kuri tema tau patinka?“: „Tamsi“/„Šviesi“, „Akcento spalva“, „Išsaugoti“ arba „Praleisti“.
- SV Guard: kompiuteryje „Laikyk ir judink pelę“, telefone „Palaikyk“, kol užsipildys ratas; nepavykus — bandyk dar kartą arba reCAPTCHA.
- Pažymėjimo patikra (/verify): „Įvesti kodą“ (SV-XXXX-XXXX-XXXX) → „Tikrinti“ arba „Skenuoti QR“.
- Kai kurie mygtukai neaktyvūs, kol neužpildyti privalomi laukai.
`;
