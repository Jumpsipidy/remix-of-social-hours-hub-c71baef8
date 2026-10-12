import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/layout";
import { useState } from "react";
import { ArrowRight, PartyPopper, ChevronDown, ChevronsUpDown } from "lucide-react";

const TITLE = "V2.5 naujienos ir versijų istorija — Socialinės Valandos";
const DESC =
  "Socialinės Valandos V2.5: pokalbiai, žemėlapis, QR patikra, SOCI GUARD, mokyklos renginiai ir naujos temos. Visos naujovės ir pataisymai vienoje vietoje.";

type Tag = "Nauja" | "Patobulinta" | "Sauga" | "Pataisyta" | "Dizainas";

type Version = {
  v: string;
  title: string;
  date: string;
  summary: string;
  items: { tag: Tag; text: string }[];
};

/** Newest first. Kiekviena eilutė = realus platformos pokytis. */
const VERSIONS: Version[] = [
  {
    v: "V2.5.0",
    title: "🎉 Didžiausias atnaujinimas — 3 mėnesių darbas",
    date: "2026 m. spalis",
    summary:
      "V2.5 sujungia viską, ką kūrėme tris mėnesius: naujas prisijungimas, žemėlapis, pokalbiai, draugai, saugumas ir mokyklų valdymas. Žemiau — kas jau veikia ir kas ateina.",
    items: [
      // ── Svarbiausios naujovės ──
      { tag: "Nauja", text: "Pokalbiai /chat visiems: mokinys ↔ organizacija, organizacija ↔ mokykla, mokykla gali pradėti pokalbį su mokiniu ir organizacija kartu. Vaidmenų žymos (Mokinys, Organizacija, Mokyklos admin), žinutės ištrinamos po 12 dienų." },
      { tag: "Nauja", text: "Lietuvos žemėlapis su organizacijų smeigtukais, miestų (Šeduva, Radviliškis, Šiauliai) ir organizacijų filtrais." },
      { tag: "Nauja", text: "Visiškai naujas organizacijos skydelis: greiti mygtukai, „Laukia tavo sprendimo“, kitas darbas, suteiktos valandos, profilio pilnumas." },
      { tag: "Nauja", text: "Visiškai naujas mokyklos administratoriaus skydelis su klasėmis, paieška, pokalbiais, renginiais ir PDF / QR patikra." },
      { tag: "Nauja", text: "Rizikos centras mokykloms: įtartini signalai, atsiliekantys mokiniai, rizikos lygiai ir paieška." },
      { tag: "Nauja", text: "SOCI GUARD — mūsų pačių apsauga nuo robotų: serverio iššūkis, skaičiavimo užduotis, palaikymas, paveikslėlių eilė, reCAPTCHA atsarginis variantas ir paaiškinimai, kodėl patikra parodyta." },
      { tag: "Nauja", text: "Draugai: pakvietimo nuoroda, užklausos ir bendros rezervacijos — kiekvienas gauna savo QR kodą ir valandas." },
      { tag: "Nauja", text: "QR įsiregistravimas: besikeičiantis kodas kas 30 s, 6 skaitmenų kodas be interneto, keli vizitai per dieną ir organizacijos „Šiandien laukiami“ sąrašas." },
      { tag: "Nauja", text: "Organizacija pati pasirenka, kiek valandų skirti užbaigiant darbą (0–8). Mokyklos admin taip pat — arba praleidžia ir palieka planuotas." },
      { tag: "Nauja", text: "Mokyklos renginiai: kūrimas su miestu, mokinių registracijos, „Priimti“ / „Atmesti“ ir valandų patvirtinimas tiesiai pagrindiniame skydelyje." },
      { tag: "Nauja", text: "Gyvi atnaujinimai ir pranešimai: naujos registracijos, patvirtinimai ir žinutės atsiranda iškart, be puslapio perkrovimo." },
      { tag: "Nauja", text: "Rodomasis įvedimo vedlys su judančiais pavyzdžiais, mygtuku „Praleisti“ ir be kartojimo tame pačiame įrenginyje." },
      { tag: "Nauja", text: "Naujas prisijungimas ir registracija su Google, Discord ir GitHub, sklandus perėjimas tarp jų ir atsijungimo animacija." },
      { tag: "Nauja", text: "Apsaugoti PDF pažymėjimai su parašu ir veikiančiu QR patikrinimu /verify." },
      { tag: "Nauja", text: "Super Admin: mokyklų administratorių kūrimas, mokyklos ir klasių priskyrimas, automatinis klasių perkėlimas kas metus, organizacijų ir bendruomenių paskyros." },
      { tag: "Nauja", text: "Super Admin apžvalga: gyvas rezervacijų kelias (registracija → patvirtinta → atvyko → valandos), QR įsiregistravimo dalis ir top organizacijos." },
      { tag: "Nauja", text: "Masinis rezervacijų patvirtinimas ir atmetimas organizacijoms." },
      { tag: "Nauja", text: "Pranešimų centras: filtrai, santykinis laikas, pranešimai pažymimi perskaitytais patys, žinutės atidaro /chat." },
      { tag: "Nauja", text: "Greitas laiko pasirinkimas mokiniams: diena, pradžia ir trukmė vienu paspaudimu." },
      { tag: "Nauja", text: "„Mano mokiniai organizacijose“ mokyklos administratoriui — matai, kur dirba tavo mokiniai." },
      { tag: "Nauja", text: "Avarinis užrakinimas serverio lygiu ir automatinis užrakinimas esant klaidų bangai." },
      // ── Patobulinimai ──
      { tag: "Patobulinta", text: "Tik sveikos valandos — jokių 1,5 ar 2,7 val." },
      { tag: "Patobulinta", text: "Mobiliesiems: mokinio greitų nuorodų juosta, kortelės vietoj lentelių, greitesni langai, be priartinimo iPhone." },
      { tag: "Patobulinta", text: "Rezervacijos patvirtinimas aiškiai parodo datą, valandas ir mygtuką „Peržiūrėti“." },
      { tag: "Patobulinta", text: "Organizacijų profiliai atsidaro mokiniams su vieša informacija ir atvirais darbais." },
      { tag: "Patobulinta", text: "Klaidų ekranas palaukia ir pats bando dar kartą, o po atnaujinimo sena puslapio versija perkraunama automatiškai." },
      { tag: "Patobulinta", text: "Sentry klaidų sekimas su „Siųsti testinę klaidą“ mygtuku ir apsaugotu sesijos įrašu." },
      { tag: "Patobulinta", text: "Lietuviškas SEO ir naujas privatumo puslapis." },
      // ── Dizainas ──
      { tag: "Dizainas", text: "Temos pasirinkimas šiame įrenginyje: du šviesios ir tamsios svetainės pavyzdžiai, tolygus akcento spalvos slankiklis, sklandūs perėjimai ir nustatymų atkūrimas." },
      { tag: "Dizainas", text: "Telefono šoninis meniu vietoj apatinės navigacijos; temos nustatymai pasiekiami meniu ir prisijungimo puslapyje." },
      { tag: "Patobulinta", text: "Atnaujinta paieškos informacija apie V2.5 funkcijas, paskyrų kūrimą, sveikas valandas ir pokalbių saugojimą." },
      { tag: "Dizainas", text: "Atnaujintas pagrindinis puslapis: aiškesnis turinys ir mažiau nereikalingų puošmenų." },
      { tag: "Dizainas", text: "Tikras šviesus režimas „Mokyklos akys“ — švelnus, akims malonus." },
      { tag: "Dizainas", text: "Užkrovimo šablonai kiekvienam puslapiui, atskiri telefonams." },
      { tag: "Dizainas", text: "Šventinė V2.5 juosta ir šis puslapis 🎉" },
      // ── Sauga ──
      { tag: "Sauga", text: "Mokyklų administratorius gali sukurti tik Super Admin — taisyklė užtikrinta duomenų bazėje." },
      { tag: "Sauga", text: "Sutvarkyti 23 saugumo radiniai: prieigos taisyklės, klaidų pranešimai, mokyklos kodo tikrinimas serveryje, CSV formulių apsauga." },
      { tag: "Sauga", text: "Pažymėjimų parašo raktas be viešo atsarginio varianto, apsauga nuo nuorodų įterpimo." },
      // ── Pataisymai ──
      { tag: "Pataisyta", text: "Rezervacijos vėl rodomos visuose skydeliuose." },
      { tag: "Pataisyta", text: "Mokyklos admino paskyra nebetampa mokiniu po sukūrimo." },
      { tag: "Pataisyta", text: "Senas pokalbių langas skydeliuose pašalintas — viskas veda į /chat." },
      { tag: "Pataisyta", text: "Neteisingas skydelis po prisijungimo ir klaidos langas, kuris dingdavo po užkrovimo." },
      { tag: "Pataisyta", text: "Slaptažodžio atkūrimas ir prisijungimas, kai ryšys su serveriu lėtas." },
      { tag: "Pataisyta", text: "Pranešimų centro klaida po prisijungimo ir „Pranešti apie klaidą“ mygtukas, uždengdavęs šventinę juostą." },
    ],
  },
  {
    v: "V2.4.0",
    title: "Saugesnis slaptažodžio atkūrimas ir švaresnis prisijungimas",
    date: "2026 m. spalis",
    summary:
      "Sutvarkytas slaptažodžio atkūrimas, supaprastinti prisijungimo ir registracijos puslapiai, greitesnis užduočių puslapis.",
    items: [
      { tag: "Pataisyta", text: "Slaptažodį pakeisti galima tik per tikrą atkūrimo nuorodą arba kodą iš laiško — nebegalima apeiti." },
      { tag: "Pataisyta", text: "Atkūrimo nuoroda nebenumeta į tuščią pagrindinį puslapį, o atidaro naujo slaptažodžio formą." },
      { tag: "Patobulinta", text: "Po atkūrimo laiško išsiuntimo iškart rodoma vieta kodui įvesti." },
      { tag: "Patobulinta", text: "Prisijungimas ir registracija be 3D efektų — aiškesni ir greitesni, su nuorodomis į taisykles lietuviškai." },
      { tag: "Patobulinta", text: "Užduočių puslapis kraunasi greičiau ir rodo užkrovimo kortelių šabloną." },
      { tag: "Patobulinta", text: "Pašalintas Valora įžanginis ekranas ir jo puslapis." },
      { tag: "Pataisyta", text: "Užblokuotas Google Analytics skriptas nebekelia klaidų pranešimų." },
    ],
  },
  {
    v: "V2.3.0",
    title: "Prisijungimo ir mokyklos skydelio stabilumas",
    date: "2026 m. rugsėjis",
    summary:
      "Pašalinta pagrindinė prisijungimo klaida, sutvarkytas mokyklos administratoriaus skydelis ir puslapių perėjimai.",
    items: [
      { tag: "Pataisyta", text: "Didelis pataisymas: mokinio skydelis nebeužstringa baltame ekrane po prisijungimo (React hook'ų tvarkos klaida)." },
      { tag: "Pataisyta", text: "Nebelieka juodo blyksnio keičiant puslapius ar perkraunant svetainę." },
      { tag: "Pataisyta", text: "Mokyklos administratoriaus klasių priskyrimas dabar naudoja tas pačias klasių reikšmes kaip registracija — duomenys nebedingsta." },
      { tag: "Pataisyta", text: "Mokyklos kodas SEDUVA2026 veikia, o mokyklos administratoriaus paskyra pririšta prie Šeduvos gimnazijos." },
      { tag: "Patobulinta", text: "Skeleton užkrovimo būsenos rodomos ir atnaujinant duomenis, ne tik pirmą kartą." },
    ],
  },
  {

    v: "V2.2.0",
    title: "Saugumas ir modernus klaidų valdymas",
    date: "2026 m. rugpjūtis",
    summary: "Svarbūs saugumo gateway, klaidų skydelio ir incidentų atpažinimo patobulinimai.",
    items: [
      { tag: "Sauga", text: "SecurityGateway stabilumo pataisymai — užtikrintas teisingas SecurityGatewayProvider veikimas per root layout." },
      { tag: "Nauja", text: "Alfanumeriniai incidentų kodai (pvz., #0TY263T) — modernus ir lankstesnis klaidų identifikavimas." },
      { tag: "Patobulinta", text: "Incident Lookup UI remake: vienas lankstus paieškos laukelis vietoje 6-ių atskirų langelių." },
      { tag: "Dizainas", text: "FriendlyErrorScreen optimizacija: kompaktiškesnis ir labiau subalansuotas dizainas, geresni veiksmai pranešti apie klaidą." },
      { tag: "Sauga", text: "Incidentų filtravimas: versijų ir incidentų puslapiai nebetrigina klaidingų klaidų Discord/el. pašte." },
      { tag: "Dizainas", text: "Apskritas platformos logotipas geresniam SEO matomumui paieškos rezultatuose." },
      { tag: "Patobulinta", text: "Clean-up: išvalyti dubliuoti piktogramų importai ir optimizuotas kodo svoris." },
      { tag: "Pataisyta", text: "Ištaisyta klaida organizacijos skydelyje, kur „Kurti užduotį“ mygtukas nereagavo į paspaudimus." },
      { tag: "Dizainas", text: "Skeletons 2.0: modernizuoti užkrovimo laukimo efektai visuose pagrindiniuose skydeliuose." },
      { tag: "Sauga", text: "Anti-cheat: sugriežtinta laiko derybų patikra ir sustiprintas RLS barjeras." },
    ],
  },
  {
    v: "V2.1.0",
    title: "Mobilioji transformacija",
    date: "2026 m. rugpjūtis",
    summary: "Atlikta visiška mobiliosios patirties optimizacija – nuo 60 kadrų per sekundę slinkimo iki geresnio kameros palaikymo.",
    items: [
      { tag: "Nauja", text: "„Ultimate Mobile Optimization“: automatinis WebGL fono atjungimas ir animacijų supaprastinimas mobiliuosiuose įrenginiuose." },
      { tag: "Patobulinta", text: "Bundle optimizavimas: esminės bibliotekos (Three.js, Framer Motion) perkeltos į atskirus blokus greitesniam pradiniam krovimui." },
      { tag: "Nauja", text: "Išmanusis QR kameros parinkimas: sistema pati atpažįsta galinę aukštos raiškos kamerą iOS ir Android įrenginiuose." },
      { tag: "Dizainas", text: "SEO tekstų vizualinis atnaujinimas – geresnis skaitomumas ir aiškesnės antraštės." },
      { tag: "Patobulinta", text: "Body scroll našumo patobulinimai per overscroll-behavior ir touch-action valdymą." },
    ],
  },
  {
    v: "V2.0.0",
    title: "Duomenų sauga ir „Ultimate Mobile“",
    date: "2026 m. rugpjūtis",
    summary: "Svarbus etapas: duomenų atsarginės kopijos, maksimalus mobilaus našumas ir pilnas versijų istorijos atkūrimas.",
    items: [
      { tag: "Sauga", text: "Super Admin skydelyje pridėtas duomenų eksporto (backup) įrankis – visa platformos informacija vienoje JSON kopijoje." },
      { tag: "Patobulinta", text: "Versijų istorija išplėsta: dabar matomi visi pakeitimai nuo pat pirmojo kodo eilutės." },
      { tag: "Patobulinta", text: "Mobiliųjų įrenginių fono valdymas WebGL render loop optimizavimui." },
      { tag: "Sauga", text: "Atviros duomenų saugos gairės /saugumas puslapyje (BDAR atitiktis, RLS apsauga)." },
      { tag: "Pataisyta", text: "Ištaisytas QR kameros leidimų prašymas iOS Safari ir Android naršyklėse." },
    ],
  },
  {
    v: "V1.9.0",
    title: "Skaidrumas ir bendruomenė",
    date: "2026 m. rugpjūtis",
    summary: "Viešas duomenų saugos puslapis ir ši versijų istorija.",
    items: [
      { tag: "Nauja", text: "Versijų istorijos puslapis /versijos." },
      { tag: "Patobulinta", text: "„Mūsų bendruomenėje“ rodoma tik reali mokykla — Šeduvos gimnazija." },
      { tag: "Patobulinta", text: "Papildytas llms.txt ir struktūriniai duomenys, kad DI asistentai tiksliau atsakytų apie platformą." },
    ],
  },
  {
    v: "V1.8.0",
    title: "Triukšmo filtras klaidoms",
    date: "2026 m. rugpjūtis",
    summary: "React hidratacijos klaidos nustojo užtvindyti Discord, el. paštą ir klaidų skydelį.",
    items: [
      { tag: "Pataisyta", text: "Filtruojama visa React #418–#425 / #520 klaidų šeima kliente, beacon endpointe ir serveryje." },
      { tag: "Patobulinta", text: "Telemetrijos įvykiai („UI užšalo“) nebekelia DI analizės ir pranešimų." },
    ],
  },
  {
    v: "V1.7.0",
    title: "Greitis, mobile ir organizacijų onboarding",
    date: "2026 m. rugpjūtis",
    summary: "Pirmasis didelis našumo etapas ir gražus organizacijų pasitikimo vedlys.",
    items: [
      { tag: "Nauja", text: "Organizacijų onboarding vedlys /organization/welcome: profilis → pirma užduotis → QR instrukcija → pabaiga." },
      { tag: "Patobulinta", text: "Bundle skaidymas (recharts, framer-motion, pdf-lib, leaflet, ikonos) į atskirus chunk'us." },
      { tag: "Patobulinta", text: "Mobili apatinė navigacija su 56px lietimo zonomis ir safe-area palaikymu." },
      { tag: "Patobulinta", text: "Organizacijos analitika įkeliama tinginiu būdu (lazy)." },
    ],
  },
  {
    v: "V1.6.0",
    title: "SEO ir DI matomumas",
    date: "2026 m. liepa",
    summary: "Platforma paruošta ChatGPT, Perplexity ir Google atsakymams.",
    items: [
      { tag: "Nauja", text: "10 klausimų DUK su FAQPage struktūriniais duomenimis." },
      { tag: "Nauja", text: "Puslapiai: socialines-valandos-mokykloms, savanoryste-seduvoje, socialiniu-valandu-lapas, blogo straipsniai." },
      { tag: "Nauja", text: "public/llms.txt — santrauka DI asistentams." },
      { tag: "Pataisyta", text: "Viešos serverio funkcijos nebegrąžina 500 klaidos, kai trūksta lentelės." },
    ],
  },
  {
    v: "V1.5.0",
    title: "Anti-cheat ir mokyklų patikra",
    date: "2026 m. liepa",
    summary: "Mokyklos gali įrodyti, kad valandos tikros.",
    items: [
      { tag: "Sauga", text: "20+ sukčiavimo aptikimo taisyklių su įjungimu super administratoriaus skydelyje (/admin/anticheat)." },
      { tag: "Nauja", text: "„Valandų patikros“ skydelis mokyklos skydelyje su QR įrodymų ženkleliais." },
      { tag: "Nauja", text: "PDF / QR sertifikatų patikros panelė auklėtojoms." },
      { tag: "Sauga", text: "Dienos limitas — iki 8 val. vienai rezervacijai." },
    ],
  },
  {
    v: "V1.4.0",
    title: "Mokyklos apimtis ir auklėtojų kabinetas",
    date: "2026 m. liepa",
    summary: "Kiekvienas mato tik tai, ką turi matyti.",
    items: [
      { tag: "Sauga", text: "SchoolScope — auklėtoja mato tik priskirtas klases, direktorius — visą mokyklą." },
      { tag: "Nauja", text: "Mokyklos prisiskyrimas su patvirtinimo kodu (school-claim-panel)." },
      { tag: "Pataisyta", text: "Tušti mokyklos statistikos skaičiai — duomenys imami serveryje apeinant RLS su griežtu filtravimu." },
    ],
  },
  {
    v: "V1.3.0",
    title: "Šventės ir motion graphics",
    date: "2026 m. birželis",
    summary: "Pasiekimai ir serijos dabar švenčiami ekrane.",
    items: [
      { tag: "Nauja", text: "22 Remotion MP4 klipai kiekvienam pasiekimui ir serijai." },
      { tag: "Nauja", text: "CelebrationStage su swipe-to-dismiss ir „Praleisti“ mygtuku." },
      { tag: "Nauja", text: "Švenčių simuliatorius /admin/tools." },
      { tag: "Patobulinta", text: "Vaizdo įrašai optimizuoti iki 720p H.264 sklandumui." },
    ],
  },
  {
    v: "V1.2.0",
    title: "Serijos, pasiekimai ir lyderių lentelė",
    date: "2026 m. birželis",
    summary: "Motyvacijos sistema mokiniams.",
    items: [
      { tag: "Nauja", text: "Prisijungimo serijų sistema (3, 7, 14, 30 dienų) su apdovanojimais." },
      { tag: "Nauja", text: "Pasiekimų tinklelis su stikliniu dizainu." },
      { tag: "Nauja", text: "Lyderių lentelė administratoriui." },
      { tag: "Pataisyta", text: "Analitika nebeskaičiuoja netikrų peržiūros apsilankymų." },
    ],
  },
  {
    v: "V1.1.0",
    title: "DI klaidų analizė",
    date: "2026 m. gegužė",
    summary: "Klaidos analizuojamos automatiškai, be mygtuko.",
    items: [
      { tag: "Nauja", text: "Automatinė DI klaidų analizė fone; kopijuojant klaidą jau įtraukiama išvada." },
      { tag: "Nauja", text: "Bug Radar — realaus laiko sveikatos verdiktas ir tendencijos." },
      { tag: "Nauja", text: "Ekrano nuotrauka pridedama prie klaidos pranešimo." },
      { tag: "Patobulinta", text: "Discord ir el. pašto pranešimai su breadcrumbs ir DI diagnoze." },
    ],
  },
  {
    v: "V1.0.0",
    title: "Oficiali platforma",
    date: "2026 m. gegužė",
    summary: "Pilnas ciklas veikia: rezervacija → QR → valandos → sertifikatas.",
    items: [
      { tag: "Nauja", text: "PDF sertifikatai su QR kodu ir HMAC parašu bei vieša patikra /verify." },
      { tag: "Nauja", text: "QR įsiregistravimas: 30 s besikeičiantis kodas + 6 skaitmenų atsarginis variantas." },
      { tag: "Nauja", text: "Organizacijos skenerio puslapis /organization/scan." },
      { tag: "Dizainas", text: "Vieninga tamsi SaaS estetika visuose skydeliuose." },
    ],
  },
  {
    v: "V0.9.0",
    title: "Lockdown ir super administratorius",
    date: "2026 m. balandis",
    summary: "Valdymo centras su 12 skyrių.",
    items: [
      { tag: "Nauja", text: "Super administratoriaus skydelis: paskyros, mokyklos, rezervacijos, klaidos, auditas, analitika." },
      { tag: "Sauga", text: "Lockdown režimas su atsarginiu atrakinimo raktažodžiu." },
      { tag: "Nauja", text: "Mokinių tarpusavio žinutės (DM) ir draugų sistema." },
    ],
  },
  {
    v: "V0.8.0",
    title: "Savas Supabase",
    date: "2026 m. balandis",
    summary: "Platforma perkelta į nuosavą infrastruktūrą.",
    items: [
      { tag: "Patobulinta", text: "Atsieta senoji infrastruktūra — visa duomenų bazė, autentifikacija ir cron nuosavame Supabase projekte." },
      { tag: "Nauja", text: "Migracijos ir SQL dokumentacija docs/ aplanke." },
      { tag: "Nauja", text: "Google ir Discord prisijungimas." },
    ],
  },
  {
    v: "V0.7.0",
    title: "Lietuviškas UI ir pranešimai",
    date: "2026 m. kovas",
    summary: "Visa vartotojo sąsaja — lietuviškai.",
    items: [
      { tag: "Dizainas", text: "Pilna lokalizacija į lietuvių kalbą." },
      { tag: "Nauja", text: "Pranešimų varpelis su realaus laiko atnaujinimais." },
      { tag: "Nauja", text: "Laiko derybų įrankis pokalbyje (rezervacijos keitimas)." },
      { tag: "Nauja", text: "Bug'o pranešimo mygtukas visuose puslapiuose." },
    ],
  },
  {
    v: "V0.6.0",
    title: "Darbo patvirtinimo grandinė",
    date: "2026 m. kovas",
    summary: "Rezervacija turi aiškias stadijas.",
    items: [
      { tag: "Nauja", text: "Statusai: laukiama → patvirtinta → atlikta." },
      { tag: "Nauja", text: "Valandų uždarymo dialogas su teisiniu patvirtinimu." },
      { tag: "Nauja", text: "Mokinio pasiūlyta („custom“) rezervacija." },
      { tag: "Patobulinta", text: "Atominis surinktų valandų didinimas profilyje." },
    ],
  },
  {
    v: "V0.5.0",
    title: "Pokalbiai realiu laiku",
    date: "2026 m. vasaris",
    summary: "Mokinys, organizacija ir mokykla viename pokalbyje.",
    items: [
      { tag: "Nauja", text: "Trijų šalių pokalbių kambariai su Realtime prenumeratomis." },
      { tag: "Nauja", text: "Automatinės sisteminės žinutės keičiantis statusui." },
      { tag: "Sauga", text: "Žinutės automatiškai trinamos po 12 dienų." },
    ],
  },
  {
    v: "V0.4.0",
    title: "Mokyklos administratoriaus skydelis",
    date: "2026 m. vasaris",
    summary: "Auklėtojos ir direktoriai gauna savo darbo vietą.",
    items: [
      { tag: "Nauja", text: "Mokinių auditas ir progreso stebėjimas." },
      { tag: "Nauja", text: "Užduočių lentelė ir organizacijų užduočių kūrimas." },
    ],
  },
  {
    v: "V0.3.0",
    title: "Rolės ir registracija",
    date: "2026 m. sausis",
    summary: "Keturios rolės, viena sistema.",
    items: [
      { tag: "Sauga", text: "Rolės atskiroje user_roles lentelėje su RLS ir has_role funkcija." },
      { tag: "Nauja", text: "Registracija su rolės pasirinkimu ir reikalingų valandų įvedimu." },
      { tag: "Nauja", text: "Profiliai, rezervacijos, pokalbių kambariai ir žinutės." },
    ],
  },
  {
    v: "V0.2.0",
    title: "Duomenų bazė",
    date: "2026 m. sausis",
    summary: "Pirmoji pilna schema su RLS ir Realtime.",
    items: [
      { tag: "Nauja", text: "Supabase integracija ir pirmosios migracijos." },
      { tag: "Sauga", text: "Row Level Security politikos visoms viešoms lentelėms." },
    ],
  },
  {
    v: "V0.1.0",
    title: "Pradžia",
    date: "2025 m. gruodis",
    summary: "Pirmasis Socialinių Valandų prototipas.",
    items: [
      { tag: "Nauja", text: "TanStack Start karkasas, tamsi tema ir OKLCH spalvų paletė." },
      { tag: "Dizainas", text: "Pirmieji SaaS stiliaus komponentai, 3D tilt kortelės ir animuoti modalai." },
    ],
  },
];

const TAG_STYLE: Record<Tag, string> = {
  Nauja: "border-primary/40 bg-primary/10 text-primary",
  Patobulinta: "border-accent/40 bg-accent/10 text-accent",
  Sauga: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
  Pataisyta: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  Dizainas: "border-fuchsia-400/40 bg-fuchsia-400/10 text-fuchsia-300",
};

const TOTAL_CHANGES = VERSIONS.reduce((n, v) => n + v.items.length, 0);

export const Route = createFileRoute("/versijos")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://socialinesvalandos.dev/versijos" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://socialinesvalandos.dev/versijos" }],
  }),
  component: VersionsPage,
});

const HIGHLIGHTS = [
  { e: "💬", t: "Pokalbiai visiems", d: "Mokiniai, organizacijos ir mokyklos susirašinėja vienoje vietoje. Žinutės dingsta po 12 dienų." },
  { e: "🗺️", t: "Lietuvos žemėlapis", d: "Visos organizacijos ir užduotys žemėlapyje su miestų filtrais." },
  { e: "🏢", t: "Nauji skydeliai", d: "Organizacijos ir mokyklos skydeliai sukurti iš naujo — greiti mygtukai ir viskas po ranka." },
  { e: "🛡️", t: "SOCI GUARD", d: "Mūsų pačių apsauga nuo robotų, kuri paaiškina, kodėl tave patikrino." },
  { e: "📱", t: "QR įsiregistravimas", d: "Besikeičiantis kodas, keli vizitai per dieną ir veikimas be interneto." },
  { e: "👥", t: "Draugai ir grupės", d: "Pakviesk draugą nuoroda ir rezervuok kartu — valandos kiekvienam." },
];

function VersionsPage() {
  const [open, setOpen] = useState<Set<string>>(() => new Set([VERSIONS[0]?.v ?? ""]));
  const allOpen = open.size === VERSIONS.length;
  const toggle = (v: string) => setOpen((o) => { const n = new Set(o); n.has(v) ? n.delete(v) : n.add(v); return n; });
  const big = VERSIONS[0];
  return (
    <PageShell>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <section className="relative overflow-hidden rounded-[2rem] border border-primary/40 bg-card p-6 sm:p-10">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            {Array.from({ length: 40 }).map((_, n) => (
              <span key={n} className={`sv-confetti absolute block rounded-sm ${["bg-primary", "bg-accent", "bg-secondary", "bg-destructive"][n % 4]} ${n % 3 ? "h-2 w-1.5" : "h-3 w-1"}`} style={{ left: `${(n * 37) % 100}%`, animationDelay: `${(n % 10) * 0.3}s`, opacity: 0.35 + (n % 4) * 0.15 }} />
            ))}
          </div>
          <span className="relative inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-primary-foreground">
            <PartyPopper className="h-3.5 w-3.5" /> Didžiausias atnaujinimas
          </span>
          <h1 className="relative mt-5 font-display text-6xl font-black leading-none tracking-tight sm:text-8xl">
            <span className="sv-v25-title inline-block text-primary">V2.5</span> <span className="inline-block text-5xl sm:text-7xl">🎉</span>
          </h1>
          <p className="relative mt-4 max-w-xl text-base font-semibold sm:text-lg">
            3 mėnesiai darbo. Šimtai pakeitimų. Viena platforma, kuri pagaliau sujungia mokinius, organizacijas ir mokyklas.
          </p>
          <p className="relative mt-2 max-w-xl text-sm text-muted-foreground">
            Sukurta savo laiku ir savo lėšomis — ačiū visiems, kas testavo, rašė klaidas ir laukė.
          </p>
          <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { k: big?.items.length ?? 0, l: "naujovių V2.5" },
              { k: TOTAL_CHANGES, l: "pakeitimų iš viso" },
              { k: VERSIONS.length, l: "versijų" },
              { k: "3 mėn.", l: "darbo" },
            ].map((x) => (
              <div key={x.l} className="rounded-2xl border border-border bg-background/60 p-4 text-center">
                <p className="font-display text-2xl font-black sm:text-3xl">{x.k}</p>
                <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">{x.l}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Mažas pataisų leidimas — sąmoningai daug kuklesnis nei V2.5. */}
        <details className="group mt-4 rounded-2xl border border-border bg-card px-4 py-3 text-sm">
          <summary className="flex cursor-pointer list-none items-center gap-2">
            <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-bold">v25.1</span>
            <span className="text-muted-foreground">Mažas atnaujinimas mokykloms</span>
            <span className="ml-auto text-xs text-muted-foreground group-open:hidden">Rodyti</span>
          </summary>
          <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
            <li>• Naujas mokyklos administratoriaus skydelis su šonine juosta</li>
            <li>• „Mano klasė“, rezervacijų centras be QR ir visa mokinių istorija</li>
            <li>• Klasės su raidėmis (5A, 5B…), užrakintos auklėtojų klasės</li>
            <li>• Rekomendacijos ir „Siųsti rezervaciją“ mokiniui, „…“ rašymo indikatorius</li>
            <li>• Veiklos tipai: Dirbo, Pasitarimo valandos, Renginys</li>
            <li>• Tema nebemirksi kraunantis, šviesioje temoje įskaitomas tekstas, pataisytas klaidų pranešimas</li>
          </ul>
        </details>



        <section className="mt-10">
          <h2 className="font-display text-xl font-bold sm:text-2xl">Svarbiausia V2.5</h2>
          <p className="mt-1 text-sm text-muted-foreground">Nuo didžiausių naujovių iki smulkmenų — žemiau visas sąrašas.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {HIGHLIGHTS.map((h, i) => (
              <div key={h.t} className="sv-hl-in rounded-3xl border border-border bg-card p-5" style={{ animationDelay: `${i * 90}ms` }}>
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/15 text-2xl">{h.e}</span>
                  <p className="font-display text-lg font-bold leading-tight">{h.t}</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{h.d}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-10 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <h2 className="truncate font-display text-xl font-bold sm:text-2xl">Visa versijų istorija</h2>
          <button
            type="button"
            onClick={() => setOpen(allOpen ? new Set() : new Set(VERSIONS.map((v) => v.v)))}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-semibold transition active:scale-95"
          >
            <ChevronsUpDown className="h-4 w-4" /> {allOpen ? "Suskleisti viską" : "Išskleisti viską"}
          </button>
        </div>

        <ol className="relative mt-6 space-y-4 border-l border-border pl-5 sm:pl-8">
          {VERSIONS.map((rel, i) => {
            const isOpen = open.has(rel.v);
            return (
              <li key={rel.v} className="relative">
                <span aria-hidden className={`absolute -left-[calc(1.25rem+5px)] top-6 h-2.5 w-2.5 rounded-full sm:-left-[calc(2rem+5px)] ${i === 0 ? "bg-primary" : "bg-border"}`} />
                <div className={`rounded-3xl border bg-card/60 ${i === 0 ? "border-primary/50" : "border-border"}`}>
                  <button type="button" onClick={() => toggle(rel.v)} aria-expanded={isOpen} className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-3 p-5 text-left sm:p-6">
                    <div className="min-w-0">
                      <h3 className="font-display text-lg font-bold sm:text-xl"><span className="text-primary">{rel.v}</span> · {rel.title}</h3>
                      <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">{rel.date} · {rel.items.length} pakeitimų</p>
                    </div>
                    <ChevronDown className={`mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                    <div className="overflow-hidden">
                      <div className="px-5 pb-5 sm:px-6 sm:pb-6">
                        <p className="text-sm leading-relaxed text-muted-foreground">{rel.summary}</p>
                        <ul className="mt-4 space-y-2">
                          {rel.items.map((it) => (
                            <li key={it.text} className="flex flex-wrap items-start gap-2 text-sm">
                              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${TAG_STYLE[it.tag]}`}>{it.tag}</span>
                              <span className="min-w-0 flex-1 leading-relaxed text-muted-foreground">{it.text}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-12 rounded-2xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            Radai klaidą arba turi idėją? Rašyk{" "}
            <span className="font-semibold text-foreground">pagalba@socialinesvalandos.dev</span> — įtrauksime į kitą versiją.
          </p>
          <Link to="/saugumas" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-5 text-sm font-semibold">
            Kaip saugome duomenis <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
