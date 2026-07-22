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
    ],
    links: [{ rel: "canonical", href: "https://socialinesvalandos.dev/privacy" }],
  }),
  component: PrivacyPage,
});

type Section = { icon: React.ComponentType<{ className?: string }>; h: string; body: string[]; bullets?: string[] };

const SECTIONS: Section[] = [
  {
    icon: Shield,
    h: "1. Ką reiškia ši politika",
    body: [
      "Šis puslapis paaiškina, kaip platforma „Socialinės Valandos” (toliau — Platforma) renka, saugo ir tvarko tavo asmens duomenis. Politika parašyta aiškiai, be teisinės miglos — jei kažkas neaišku, parašyk mums per pagalbos formą.",
      "Ši politika galioja kartu su Naudojimosi taisyklėmis (/terms). Kai kur sąlygos persidengia — visada taikoma griežtesnė nuostata.",
      "Platforma nėra sertifikuota pagal SOC 2, ISO 27001 ar panašius auditus, tačiau taikome pramonės standartines apsaugos priemones ir esame atviri dėl to, kaip veikia sistema.",
    ],
  },
  {
    icon: Database,
    h: "2. Kokie duomenys renkami",
    body: [
      "Renkame tik tuos duomenis, kurie būtini paslaugos veikimui. Nesekame tavo naršymo išorėje, neparduodame duomenų reklamos tinklams.",
    ],
    bullets: [
      "Paskyros duomenys: el. paštas, vardas ir pavardė, vaidmuo (mokinys / organizacija / mokyklos administratorius), mokykla, klasė.",
      "Rezervacijų duomenys: pasirinktos užduotys, laikai, valandų skaičius, statusai, susijusios organizacijos.",
      "Bendravimas: pokalbių žinutės (auto-ištrinamos po 12 d.), asmeniniai pokalbiai (auto-ištrinami po 2 d.), draugystės ryšiai.",
      "Techniniai metaduomenys: naršyklė, OS, kalba, laiko juosta, ekrano skiriamoji geba, IP adreso hash'as (ne pats IP), anoniminis įrenginio ID (visitor_id).",
      "Naudotojo veiksmų žurnalas (audit log): peržiūrėti puslapiai, prisijungimai, atsijungimai, sistemos klaidos.",
    ],
  },
  {
    icon: Lock,
    h: "3. Saugumo priemonės",
    body: [
      "Duomenų saugumas užtikrinamas keliais sluoksniais:",
    ],
    bullets: [
      "🔐 Transportas: visas srautas šifruojamas per HTTPS/TLS 1.3.",
      "🗄️ Duomenų bazė: PostgreSQL su Row-Level Security (RLS) — kiekviena lentelė turi taisykles, ribojančias, ką konkretus naudotojas gali matyti ar keisti.",
      "🔑 Slaptažodžiai: saugomi kaip Bcrypt hash'ai, niekada plain-text. Papildomai — HIBP (Have I Been Pwned) patikra registracijos metu.",
      "🎫 Sesijos: JWT tokenai su rotuojančiais refresh tokenais, saugomi httpOnly slapukuose kai įmanoma.",
      "🚨 Auto-lockdown: sistema pati užsidaro naudotojams, jei aptinka ≥2 kritines klaidas arba ≥3 vartotojų susiduria su ta pačia klaida per 90s.",
      "📊 Sveikatos patikra: kas 10 min. automatiškai vykdomas gilus scan (18 patikrų), rezultatai matomi tik super administratoriui.",
    ],
  },
  {
    icon: Eye,
    h: "4. Kas gali matyti tavo duomenis",
    body: [
      "Prieiga prie duomenų yra griežtai apribota pagal vaidmenį (RLS taisyklės vykdomos duomenų bazės lygyje — net jei kliento kodas būtų pakeistas, serveris atsisakys grąžinti neleistus duomenis):",
    ],
    bullets: [
      "Mokinys mato: TIK savo profilį, savo rezervacijas, viešas užduotis, savo pokalbius, savo draugus ir draugų viešus duomenis.",
      "Organizacija mato: TIK jai priklausančias rezervacijas, savo užduotis, mokinius su kuriais bendrauja (be el. pašto — tik vardas).",
      "Mokyklos administratorius mato: TIK savo mokyklos ir savo priskirtų klasių mokinius. Kitos mokyklos yra nematomos.",
      "Super administratorius: turi pilną prieigą tik prie tų duomenų, kurie būtini administravimui. Visi jo veiksmai fiksuojami audit log'e.",
    ],
  },
  {
    icon: KeyRound,
    h: "5. Kaip prisijungiama",
    body: [
      "Palaikome kelis autentifikacijos būdus:",
    ],
    bullets: [
      "Email + slaptažodis (min. 8 simboliai, tikrinamas prieš HIBP duomenų bazę).",
      "Google OAuth 2.0 — nesaugome tavo Google slaptažodžio.",
      "Discord OAuth — jei prijungei.",
      "Mokyklos kodas — moksleiviai registruodamiesi turi įvesti mokyklos kodą, kurį duoda mokyklos administratorius. Be kodo — paskyra nebus sukurta.",
    ],
  },
  {
    icon: Bell,
    h: "6. Pranešimai ir el. paštas",
    body: [
      "Siunčiame TIK funkcinius pranešimus, susijusius su tavo veikla (rezervacijos, valandų patvirtinimas, žinutės). Jokių rinkodaros el. laiškų.",
      "Push pranešimai (browser notifications) — pilnai neprivalomi, įjungiami tik su tavo aiškiu sutikimu per naršyklę.",
      "Email siunčiame per Resend.com. Serveryje saugomas siuntimo žurnalas 30 dienų klaidų diagnostikai, po to automatiškai išvalomas.",
    ],
  },
  {
    icon: Trash2,
    h: "7. Duomenų saugojimas ir teisė būti pamirštam",
    body: [
      "Duomenų retencija yra ribota ir automatizuota:",
    ],
    bullets: [
      "Pokalbių žinutės grupiniuose kambariuose — 12 d. (auto-purge).",
      "Asmeninių žinučių (DM) žinutės — 2 d. (auto-purge).",
      "Aktyvumo žurnalas (activity_log) — iki 180 d., paskui automatiškai išvalomas.",
      "Klaidų žurnalas — iki 30 d.",
      "Paskyra ir rezervacijos — saugomi kol paskyra aktyvi. Ištrynus paskyrą (per profilio nustatymus) — visi susiję duomenys šalinami per 24 val., audit log liudijantis apie kritinius veiksmus (pvz. sukčiavimo signalai) — anonimizuojamas.",
      "Jei nori eksportuoti savo duomenis prieš ištrindamas — parašyk mums, per 30 d. atsiųsime JSON archyvą.",
    ],
  },
  {
    icon: Shield,
    h: "8. Slapukai ir stebėjimas",
    body: [
      "Naudojame minimalų slapukų rinkinį:",
    ],
    bullets: [
      "Funkciniai slapukai (sesija, tema, kalba) — būtini, be jų platforma neveiks.",
      "Anoniminis visitor_id (localStorage) — leidžia mums skaičiuoti unikalius įrenginius statistikai, bet neidentifikuoja tavęs asmeniškai.",
      "Google Analytics 4 (G-4HRBLS0E3G) — anonimizuoti agreguoti duomenys apie svetainės naudojimą. IP anonimizavimas įjungtas.",
      "NENAUDOJAME: reklamos slapukų, third-party trackers'ų, Facebook Pixel, TikTok Pixel ar panašių.",
    ],
  },
  {
    icon: Mail,
    h: "9. Trečiosios šalys (subprocessors)",
    body: [
      "Kad platforma veiktų, naudojamės šiais paslaugų teikėjais. Su kiekvienu turime standartinius duomenų tvarkymo susitarimus:",
    ],
    bullets: [
      "Supabase (duomenų bazė, autentifikacija, saugykla) — ES regionas.",
      "Vercel (hostingas ir CDN).",
      "Resend (el. laiškų siuntimas).",
      "Google (OAuth, Analytics 4, reCAPTCHA).",
      "Discord (OAuth, jei įjungta).",
    ],
  },
  {
    icon: Shield,
    h: "10. Nepilnamečių apsauga",
    body: [
      "Platforma yra skirta mokykliniam amžiui — todėl daug naudotojų yra nepilnamečiai. Papildomos priemonės:",
      "Registracija be mokyklos kodo yra neįmanoma — tai reiškia, kad mokykla žino, kas registruojasi.",
      "Nerodome viešai el. pašto adresų (mokinys mokinį mato tik pagal vardą).",
      "Nesirenkame ir nesaugome jokių jautrių duomenų (sveikata, religija, politiniai įsitikinimai ir pan.).",
    ],
  },
  {
    icon: Mail,
    h: "11. Kontaktai ir teisės",
    body: [
      "Turi teisę: gauti prieigą prie savo duomenų, juos taisyti, ištrinti (teisė būti pamirštam), riboti tvarkymą, gauti duomenų kopiją perkeliamu formatu.",
      "Kontaktams naudok pagalbos formą platformoje arba parašyk į kontaktus, kuriuos rasi /terms puslapyje. Į užklausas atsakome per 30 d.",
      "Jei manai, kad tavo teisės pažeistos — turi teisę kreiptis į Valstybinę duomenų apsaugos inspekciją (vdai.lrv.lt).",
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
              Paskutinį kartą atnaujinta · 2026-07-22
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
