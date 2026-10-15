import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/layout";
import { Shield, Lock, Eye, Database, KeyRound, Trash2, Bell, Mail } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privatumo ir saugumo politika — Socialinės Valandos" },
      { name: "description", content: "Kaip Socialinės Valandos apsaugo tavo duomenis: šifravimas, prieigos kontrolė, RLS, sesijos, teisė būti pamirštam. Aiškiai ir be biurokratijos." },
      { property: "og:title", content: "Privatumo ir saugumo politika — Socialinės Valandos" },
      { property: "og:description", content: "Aiškus paaiškinimas, kaip Socialinės Valandos tvarko ir saugo tavo duomenis." },
      { property: "og:url", content: "https://socialinesvalandos.dev/privacy" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://socialinesvalandos.dev/privacy" }],
  }),
  component: PrivacyPage,
});

type Section = { icon: React.ComponentType<{ className?: string }>; h: string; body: string[]; bullets?: string[] };

const SECTIONS: Section[] = [
  {
    icon: Shield,
    h: "1. Duomenų valdytojas (Data Controller)",
    body: [
      "Pagal BDAR (Reglamentas 2016/679) 4 str. 7 d., duomenų valdytojas yra fizinis asmuo — platformos „Socialinės Valandos“ kūrėjas ir administratorius, veikiantis Lietuvos Respublikoje.",
      "Kontaktai visais privatumo klausimais (prieigos užklausos, ištrynimas, skundai, incidentai): pagalba@socialinesvalandos.dev. Į užklausas atsakome per 30 kalendorinių dienų, kaip reikalauja BDAR 12 str. 3 d.",
      "Priežiūros institucija: Valstybinė duomenų apsaugos inspekcija (VDAI), L. Sapiegos g. 17, Vilnius, ada@ada.lt, +370 5 271 2804. Turi teisę pateikti skundą tiesiogiai VDAI, jei manai, kad tavo teisės pažeistos (BDAR 77 str.).",
    ],
  },
  {
    icon: Database,
    h: "2. Kokie duomenys renkami ir teisinis pagrindas",
    body: [
      "Renkame tik tuos duomenis, kurie būtini paslaugos veikimui. Nesekame naršymo išorėje, neparduodame duomenų, nenaudojame reklamos profiliavimo.",
    ],
    bullets: [
      "Paskyros duomenys (vardas, pavardė, el. paštas, vaidmuo, mokykla, klasė) — teisinis pagrindas: BDAR 6 str. 1 d. b) p. (sutarties vykdymas — negalime suteikti paslaugos be jų).",
      "Rezervacijos, valandų istorija, QR įsiregistravimai — teisinis pagrindas: sutartis + teisėtas interesas (mokyklos ugdymo procesui pagrįsti).",
      "Pokalbių žinutės (auto-ištrinamos: grupinės — 12 d., asmeninės — 2 d.) — sutarties vykdymas.",
      "Techniniai metaduomenys ir klaidų žurnalai (naršyklė, IP hash, ne pats IP, anoniminis visitor_id) — teisėtas interesas (saugumas, klaidų diagnostika, sukčiavimo prevencija; BDAR 6 str. 1 d. f p.).",
      "Slapukų analitika — tik su tavo aiškiu sutikimu (BDAR 6 str. 1 d. a p. + ePrivacy 5(3) str.). Gali bet kada atšaukti /privatumas puslapyje.",
    ],
  },
  {
    icon: Shield,
    h: "3. Nepilnamečių apsauga (BDAR 8 str.)",
    body: [
      "Platforma naudojama mokykliniame kontekste, todėl dauguma naudotojų yra nepilnamečiai (< 16 m.). Lietuvoje BDAR informacinės visuomenės paslaugoms taikoma 14 m. amžiaus riba tėvų sutikimui.",
      "SPRENDIMAS: moksleiviai NEregistruojasi patys. Paskyras kuria mokyklos administratorius, kuris savo veiksmais patvirtina, kad turi teisinį pagrindą tvarkyti mokinio duomenis (mokymo sutartis su tėvais + LR Švietimo įstatymas). Tai reiškia, kad tėvų sutikimo klausimas išspręstas mokyklos lygyje, o platforma veikia kaip mokyklos vidinis įrankis.",
      "Nesirenkame ir nesaugome jautrių duomenų (sveikatos, religijos, politikos, seksualinės orientacijos — BDAR 9 str.). Jei toks duomuo netyčia patenka į pokalbio žinutę — ji ištrinama per 12 d. auto-purge.",
      "Nerodome viešai el. pašto adresų — kiti mokiniai mato tik vardą ir pavardę.",
    ],
  },
  {
    icon: Trash2,
    h: "4. Duomenų saugojimo terminai ir teisė būti pamirštam",
    body: [
      "Duomenų retencija automatizuota ir minimali:",
    ],
    bullets: [
      "Grupinių pokalbių žinutės — 12 d. (auto-purge cron).",
      "Asmeninių žinučių (DM) — 2 d. (auto-purge cron).",
      "Aktyvumo žurnalas (activity_log) — iki 180 d.",
      "Klaidų žurnalas — 30 d.",
      "Paskyra ir rezervacijos — saugomi kol paskyra aktyvi.",
      "IŠTRYNUS PASKYRĄ (per Nustatymai → Ištrinti paskyrą): asmens duomenys pašalinami nedelsiant (per 24 val.). Valandų istorija ANONIMIZUOJAMA — mokyklai lieka tik skaitmuo (kiek klasės mokinių atliko X val.) be vardo, pavardės, el. pašto. Šis anoniminis įrašas neatpažįsta asmens ir todėl nebėra „asmens duomuo“ pagal BDAR 4 str.",
      "Duomenų portabilumas: gali paprašyti JSON archyvo (BDAR 20 str.) rašydamas pagalba@socialinesvalandos.dev. Atsiųsim per 30 d.",
    ],
  },
  {
    icon: Lock,
    h: "5. Saugumo priemonės (BDAR 32 str.)",
    body: [
      "Techninės ir organizacinės priemonės atitinka BDAR 32 str. reikalavimą „tinkamą saugumo lygį“:",
    ],
    bullets: [
      "🔐 TLS 1.3 visam srautui, HSTS aktyvus.",
      "🗄️ PostgreSQL Row-Level Security (RLS) — kiekviena lentelė turi taisykles duomenų bazės lygiu; net jei kliento kodas būtų pakeistas, serveris atsisakys grąžinti neleistus duomenis.",
      "🔑 Slaptažodžiai — Bcrypt hash, HIBP (Have I Been Pwned) patikra registracijoj.",
      "🎫 JWT sesijos su rotuojančiais refresh tokenais.",
      "🚨 Auto-lockdown, jei aptinkama incidentų serija.",
      "📊 Kas 10 min. deep health scan; incidentai matomi tik super-adminui.",
      "🇪🇺 Visi duomenys laikomi ES regione (Supabase eu-central).",
    ],
  },
  {
    icon: Eye,
    h: "6. Kas gali matyti tavo duomenis",
    body: [
      "Prieiga griežtai apribota RLS taisyklėmis duomenų bazės lygyje:",
    ],
    bullets: [
      "Mokinys: TIK savo profilis, savo rezervacijos, viešos užduotys, savo pokalbiai, savo draugai.",
      "Organizacija: TIK jai priklausančios rezervacijos, savo užduotys, mokinių vardai (be el. pašto).",
      "Mokyklos administratorius: TIK savo mokyklos ir savo priskirtų klasių mokiniai. Kitos mokyklos nematomos.",
      "Super administratorius: prieiga tik prie duomenų, būtinų administravimui; visi veiksmai fiksuojami audit log.",
    ],
  },
  {
    icon: Mail,
    h: "7. Trečiosios šalys (Subprocessors)",
    body: [
      "Kad platforma veiktų, naudojamės šiais duomenų tvarkytojais. Su kiekvienu galioja standartinis Data Processing Agreement:",
    ],
    bullets: [
      "Supabase Inc. — duomenų bazė, autentifikacija, saugykla; ES (Frankfurt) regionas.",
      "Vercel Inc. — hostingas ir CDN; ES edge.",
      "Resend — el. laiškų siuntimas.",
      "Google LLC — OAuth prisijungimas (jei pasirinktas naudotojo).",
      "Discord Inc. — OAuth (jei pasirinktas).",
      "NENAUDOJAME: Facebook Pixel, TikTok Pixel, Google Ads, jokių reklamos tinklų. NEPARDUODAME duomenų.",
    ],
  },
  {
    icon: Shield,
    h: "8. Slapukai ir sutikimas",
    body: [
      "Prieš įkeliant bet kokį ne-būtiną skriptą, prašome tavo aiškaus sutikimo (ePrivacy 5(3) + BDAR 7 str.). Trys kategorijos: Būtini (visada), Analitika (opt-in), Rinkodara (opt-in).",
      "Mygtukai „Sutinku“ ir „Atmesti“ pateikti tame pačiame lygyje, ta pačia spalva — atitinka CNIL/EDPB rekomendaciją. Sutikimą galima bet kada atšaukti /privatumas puslapyje.",
      "Sutikimo įrašas saugomas su versijos numeriu ir laiko žyma — po 12 mėn. arba pakeitus politikos versiją, prašysime iš naujo.",
    ],
  },
  {
    icon: Bell,
    h: "9. Tavo teisės (BDAR 15–22 str.)",
    body: ["Kaip duomenų subjektas turi šias teises, kurias gali realizuoti rašydamas pagalba@socialinesvalandos.dev:"],
    bullets: [
      "Prieigos teisė (15 str.) — gauti kopiją, kokie duomenys tvarkomi.",
      "Ištaisymo teisė (16 str.) — pataisyti netikslius duomenis.",
      "Ištrynimo teisė / „teisė būti pamirštam“ (17 str.) — Nustatymai → Ištrinti paskyrą.",
      "Tvarkymo apribojimas (18 str.).",
      "Duomenų perkeliamumas (20 str.) — JSON eksportas.",
      "Nesutikimas dėl teisėto intereso pagrindu tvarkomų duomenų (21 str.).",
      "Sutikimo atšaukimas bet kuriuo metu (7 str. 3 d.).",
      "Skundas VDAI (77 str.) — ada@ada.lt.",
    ],
  },
  {
    icon: KeyRound,
    h: "10. Duomenų saugumo pažeidimo pranešimai",
    body: [
      "Įvykus asmens duomenų saugumo pažeidimui, kuris gali kelti riziką tavo teisėms ir laisvėms, pranešime VDAI per 72 val. (BDAR 33 str.) ir tau tiesiogiai el. paštu, jei rizika didelė (BDAR 34 str.).",
      "Įtari incidentą? Rašyk pagalba@socialinesvalandos.dev su tema „SECURITY“.",
    ],
  },
];

function PrivacyPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-14">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-950/40 via-slate-950 to-sky-950/40 p-6 sm:p-10">
          <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-sky-500/20 blur-3xl" />
          <div className="relative">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-sky-500 shadow-2xl">
              <Shield className="h-7 w-7 text-white" />
            </div>
            <h1 className="mt-4 font-display text-3xl sm:text-4xl font-black tracking-tight text-white">
              Privatumas ir saugumas
            </h1>
            <p className="mt-3 text-white/70 leading-relaxed max-w-2xl">
              Šis puslapis paaiškina, kaip tavo duomenys yra saugomi ir kas su jais gali daryti. Be teisinės miglos — aiškiai, sąžiningai, be pardavimų.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-300">🔐 TLS 1.3</span>
              <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-sky-300">🗄️ RLS enabled</span>
              <span className="rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-1 text-fuchsia-300">🚨 Auto-lockdown</span>
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-amber-300">🇱🇹 ES regionas</span>
              <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-rose-300">🚫 Jokios reklamos</span>
            </div>
            <p className="mt-4 text-[11px] uppercase tracking-[0.24em] text-white/40">
              Paskutinį kartą atnaujinta · 2026-07-24 · Versija 2.0

            </p>
          </div>
        </div>

        {/* TOC */}
        <nav className="mt-6 rounded-2xl border border-border/60 bg-card/40 p-4 backdrop-blur">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground mb-2">Turinys</p>
          <ol className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {SECTIONS.map((s, i) => (
              <li key={i}>
                <a href={`#s${i + 1}`} className="text-muted-foreground hover:text-foreground transition">
                  {s.h}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* Sections */}
        <div className="mt-8 space-y-6">
          {SECTIONS.map((s, i) => {
            const Icon = s.icon;
            return (
              <section
                key={i}
                id={`s${i + 1}`}
                className="scroll-mt-24 rounded-2xl border border-border/60 bg-card/40 p-5 sm:p-6 backdrop-blur"
              >
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/30">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="font-display text-xl font-bold tracking-tight text-foreground pt-1">
                    {s.h}
                  </h2>
                </div>
                <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
                  {s.body.map((p, j) => (
                    <p key={j}>{p}</p>
                  ))}
                </div>
                {s.bullets && s.bullets.length > 0 && (
                  <ul className="mt-3 space-y-1.5 text-sm">
                    {s.bullets.map((b, j) => (
                      <li key={j} className="flex items-start gap-2 rounded-lg border border-border/40 bg-background/30 px-3 py-2 text-foreground/85">
                        <span className="leading-relaxed">{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
          <Link to="/terms" className="text-primary hover:underline underline-offset-4">
            📜 Naudojimosi taisyklės →
          </Link>
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            ← Į pagrindinį puslapį
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
