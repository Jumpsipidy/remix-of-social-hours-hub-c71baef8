import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/layout";
import { useState } from "react";
import { ArrowRight, PartyPopper, ChevronDown, ChevronsUpDown } from "lucide-react";

const TITLE = "Versijų istorija — visi Socialinių Valandų atnaujinimai";
const DESC =
  "Pilna Socialinės Valandos platformos versijų istorija: nuo pirmosios v0.1 iki naujausios versijos. Kiekvienas atnaujinimas, funkcija ir patobulinimas vienoje vietoje.";

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
      { tag: "Nauja", text: "Visiškai naujas prisijungimas ir registracija su Google, Discord ir GitHub bei sklandžiomis animacijomis." },
      { tag: "Nauja", text: "Lietuvos žemėlapis su organizacijų vietomis ir užduotimis Šeduvoje, Radviliškyje ir Šiauliuose." },
      { tag: "Nauja", text: "Pokalbiai /chat: mokinys ↔ organizacija ir mokyklos administratorius ↔ organizacija, žinutės automatiškai ištrinamos po 12 dienų." },
      { tag: "Nauja", text: "Draugai: pakvietimo nuoroda ir bendros rezervacijos — kiekvienas gauna savo QR kodą ir valandas." },
      { tag: "Nauja", text: "Masinis rezervacijų patvirtinimas organizacijoms su pranešimais mokiniams." },
      { tag: "Nauja", text: "„Mokyklos akys“ didelio kontrasto režimas." },
      { tag: "Sauga", text: "Saugūs, parašu patikrinami pažymėjimai su QR kodais — suklastoti iškart atpažįstami." },
      { tag: "Sauga", text: "Patikrinimas „ar jūs ne robotas“ su atsargine reCAPTCHA ir apsauginis užrakinimas klaidų antplūdžio metu." },
      { tag: "Sauga", text: "Mokyklos administratorių paskyras gali kurti tik pagrindinis administratorius." },
      { tag: "Pataisyta", text: "Administratoriaus sukurta mokyklos paskyra nebetampa mokinio paskyra." },
      { tag: "Patobulinta", text: "Klasių kėlimas kiekvieną rugsėjo 1 d. ir automatinis mokytojų klasių atnaujinimas." },
      { tag: "Patobulinta", text: "Gražesni užkrovimo šablonai visuose puslapiuose ir klaidų sekimas." },
      { tag: "Dizainas", text: "Ateityje: atnaujintas mokyklos skydelis, dar daugiau telefonų pritaikymo ir naujos ataskaitos mokykloms." },
      { tag: "Nauja", text: "Naujas pokalbis vienu mygtuku: organizacijos rašo mokiniams ir mokykloms, mokyklos — organizacijoms." },
      { tag: "Nauja", text: "Mokyklos administracija mato savo mokinius organizacijose ir gali pradėti trišalį pokalbį (mokinys + organizacija + mokykla)." },
      { tag: "Nauja", text: "Kontaktų sąraše rodoma mokinio klasė ir klasių filtrai." },
      { tag: "Nauja", text: "Super administratorius renkasi mokyklą, kelias ar visas klases ir automatinį metų atnaujinimą." },
      { tag: "Nauja", text: "Testinės klaidos mygtukas Sentry stebėjimui ir ekrano įrašai klaidų metu (tekstas paslėptas)." },
      { tag: "Nauja", text: "Užduoties langas su informacija, žemėlapiu, rezervacija, žinute organizacijai ir jos profiliu." },
      { tag: "Nauja", text: "Miesto pasirinkimas ir filtrai: Šeduva, Radviliškis, Šiauliai." },
      { tag: "Nauja", text: "Atsijungimo animacija ir naujos perėjimo animacijos tarp prisijungimo ir registracijos." },
      { tag: "Nauja", text: "Slaptažodžio atkūrimo animacija su skrendančiu laišku." },
      { tag: "Nauja", text: "Profilio užbaigimas po Google, Discord ar GitHub prisijungimo." },
      { tag: "Nauja", text: "Super administratoriaus skydelių peržiūra — kiekvieną rolę galima apžiūrėti atskirai." },
      { tag: "Nauja", text: "Incidentų paieška pagal SC- ir #0TY263T formato kodus." },
      { tag: "Sauga", text: "Serverio lygio užrakinimas: užrakto metu duomenų keisti negalima net apeinant svetainę." },
      { tag: "Sauga", text: "Automatinis užrakinimas po 100 klaidų per 10 minučių." },
      { tag: "Sauga", text: "Mokyklos administratorius mato tik savo mokyklos mokinių pokalbius." },
      { tag: "Sauga", text: "Pažymėjimo parašas tikrinamas iš naujo — duomenų bazėje pakeisti įrašai pažymimi kaip suklastoti." },
      { tag: "Sauga", text: "Pašalintas atsarginis viešas parašo raktas, apsaugoti el. laiškai nuo įterpto kodo, testinių duomenų trynimas liečia tik testines paskyras." },
      { tag: "Patobulinta", text: "Pasenusios rezervacijos automatiškai atmetamos po 12 valandų." },
      { tag: "Patobulinta", text: "Analitika skaičiuoja unikalius vartotojus, ne pakartotinius apsilankymus." },
      { tag: "Patobulinta", text: "Telefonuose išjungti sunkūs efektai — greitesni meniu, sklandus slinkimas, be priartinimo rašant." },
      { tag: "Dizainas", text: "„Mokyklos akys“ dabar tikras šviesus režimas visuose puslapiuose." },
      { tag: "Dizainas", text: "Apvalus logotipas, nauji klaidų ekranai ir gražesni užkrovimo šablonai." },
      { tag: "Pataisyta", text: "Mokiniai vėl mato savo ir draugų rezervacijas; pokalbių teisių klaidos išspręstos." },
      { tag: "Pataisyta", text: "Nebelieka juodo blyksnio ir „Nepavyko įkelti duomenų“ skydeliuose." },
      { tag: "Nauja", text: "Naujas mokyklos Rizikos centras: filtruojamos kortelės, klasių filtrai, aiškus rizikos lygis ir greita peržiūra." },
      { tag: "Patobulinta", text: "Pranešimų centras: laikas „prieš 5 min.“, „Skaityti visus“, atskirų pranešimų šalinimas ir tiesioginis kelias į pokalbius." },
      { tag: "Dizainas", text: "Švelnesnis, akims malonesnis šviesus režimas ir mažiau dirbtinai atrodančių efektų." },
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
            {Array.from({ length: 18 }).map((_, n) => (
              <span key={n} className="sv-confetti absolute block h-2 w-1.5 rounded-sm bg-primary" style={{ left: `${(n * 53) % 100}%`, animationDelay: `${(n % 6) * 0.35}s`, opacity: 0.25 + (n % 4) * 0.15 }} />
            ))}
          </div>
          <span className="relative inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-primary-foreground">
            <PartyPopper className="h-3.5 w-3.5" /> Didžiausias atnaujinimas
          </span>
          <h1 className="relative mt-5 font-display text-6xl font-black leading-none tracking-tight sm:text-8xl">
            <span className="text-primary">V2.5</span>
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
