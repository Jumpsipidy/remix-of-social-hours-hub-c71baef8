import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/layout";
import {
  ShieldCheck,
  Lock,
  EyeOff,
  Clock3,
  Users,
  FileCheck2,
  Server,
  Trash2,
  Mail,
  ArrowRight,
} from "lucide-react";

const TITLE = "Duomenų sauga — kaip saugome mokinių duomenis | Socialinės Valandos";
const DESC =
  "Kaip Socialinės Valandos saugo nepilnamečių mokinių duomenis: minimalus duomenų rinkimas, TLS šifravimas, ES serveriai, Row Level Security, 12 dienų žinučių trynimas ir teisė ištrinti paskyrą.";

/** Q&A blocks are also emitted as FAQPage JSON-LD so AI assistants can quote us. */
const SECURITY_FAQ: { q: string; a: string }[] = [
  {
    q: "Kokius mokinio duomenis renka Socialinės Valandos?",
    a: "Tik tuos, kurių reikia valandoms užskaityti: vardą ir pavardę, el. paštą, mokyklą, klasę, reikalingų ir surinktų valandų skaičių bei rezervacijų istoriją. Nerenkame asmens kodų, gyvenamosios vietos adresų, sveikatos, religinių ar kitų jautrių duomenų.",
  },
  {
    q: "Kur fiziškai laikomi duomenys?",
    a: "Duomenų bazė ir failai laikomi Europos Sąjungos serveriuose (Supabase, ES regionas). Duomenys neperduodami už EEE ribų reklamos ar profiliavimo tikslais.",
  },
  {
    q: "Kas gali matyti mokinio duomenis?",
    a: "Prieiga ribojama duomenų bazės lygiu (Row Level Security). Klasės auklėtoja mato tik jai priskirtas klases, direktorius — tik savo mokyklą, organizacija — tik tuos savanorius, kurie pas ją užsiregistravo, o mokinys — tik save. Kitų mokyklų duomenys niekada nesimaišo.",
  },
  {
    q: "Ar susirašinėjimas saugomas amžinai?",
    a: "Ne. Pokalbių žinutės automatiškai ištrinamos po 12 dienų. Prieš ištrynimą pokalbyje rodomas įspėjimas.",
  },
  {
    q: "Kaip apsaugoma nuo neteisėtos prieigos?",
    a: "Prisijungimas per Supabase Auth su šifruotais slaptažodžiais arba Google / Discord OAuth. Sesijos žetonai galioja ribotą laiką, visas srautas eina per HTTPS (TLS 1.2+). Administratoriaus veiksmai registruojami audito žurnale.",
  },
  {
    q: "Ar mokinių duomenys naudojami reklamai ar parduodami?",
    a: "Niekada. Duomenys naudojami tik socialinių valandų apskaitai. Nenaudojame reklamos tinklų, neprofiliuojame mokinių ir neparduodame duomenų trečiosioms šalims.",
  },
  {
    q: "Kaip ištrinti paskyrą ir duomenis?",
    a: "Mokinys, tėvai arba mokykla gali parašyti pagalba@socialinesvalandos.dev — paskyrą ir su ja susijusius duomenis ištriname per 30 dienų. Taip pat galime pateikti visų turimų duomenų kopiją (BDAR 15 ir 17 str.).",
  },
  {
    q: "Ar reikia tėvų sutikimo?",
    a: "Mokinys prisiregistruoti gali tik su mokyklos išduotu kodu, todėl paskyros kuriamos mokyklos ugdymo proceso pagrindu. Tėvai bet kada gali paprašyti peržiūrėti, pataisyti ar ištrinti vaiko duomenis.",
  },
  {
    q: "Ką darote įvykus saugumo incidentui?",
    a: "Sistemoje veikia automatinis klaidų ir incidentų stebėjimas su neatidėliotinais pranešimais administratoriui. Įvykus asmens duomenų saugumo pažeidimui, informuojame mokyklą ir, kai to reikalauja BDAR, Valstybinę duomenų apsaugos inspekciją per 72 valandas.",
  },
  {
    q: "Kaip užtikrinama, kad valandos tikros?",
    a: "Įsiregistravimas vyksta QR kodu, kuris atsinaujina kas 30 sekundžių ir yra pasirašytas HMAC parašu, arba vienkartiniu 6 skaitmenų kodu. PDF sertifikatai pasirašomi ir tikrinami viešai adresu socialinesvalandos.dev/verify. Veikia sukčiavimo aptikimo taisyklės (dienos limitai, pasikartojimai, įtartinai apvalios valandos).",
  },
];

const PILLARS = [
  { icon: EyeOff, t: "Minimalūs duomenys", b: "Renkame tik vardą, mokyklą, klasę ir valandas. Jokių asmens kodų ar adresų." },
  { icon: Lock, t: "Šifravimas", b: "HTTPS / TLS ryšys ir šifruota duomenų bazė. Slaptažodžiai saugomi tik kaip maiša (hash)." },
  { icon: Server, t: "ES serveriai", b: "Duomenys laikomi Europos Sąjungoje, pagal BDAR reikalavimus." },
  { icon: Users, t: "Row Level Security", b: "Kiekvienas mato tik savo mokyklą, klasę arba save. Techniškai, ne tik sutartimi." },
  { icon: Clock3, t: "12 dienų žinučių trynimas", b: "Pokalbiai nesikaupia — automatinis valymas." },
  { icon: FileCheck2, t: "Patikrinami sertifikatai", b: "HMAC parašas + vieša patikra apsaugo nuo suklastotų valandų." },
  { icon: Trash2, t: "Teisė būti pamirštam", b: "Paskyrą ir duomenis ištriname per 30 dienų nuo prašymo." },
  { icon: ShieldCheck, t: "Incidentų stebėjimas", b: "Realaus laiko klaidų ir saugumo įvykių monitoringas 24/7." },
];

export const Route = createFileRoute("/saugumas")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://socialinesvalandos.dev/saugumas" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://socialinesvalandos.dev/saugumas" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: SECURITY_FAQ.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: SecurityPage,
});

function SecurityPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-20">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Duomenų sauga
        </span>
        <h1 className="mt-5 font-display text-3xl font-bold leading-tight sm:text-5xl">
          Kaip saugome mokinių duomenis
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Socialinėse Valandose tvarkomi nepilnamečių duomenys. Todėl laikomės principo „kuo mažiau, tuo saugiau“:
          renkame tik tai, ko būtinai reikia socialinių valandų apskaitai, ir techniškai apribojame, kas gali tuos
          duomenis pamatyti. Šis puslapis paprastai paaiškina, kas vyksta su duomenimis.
        </p>

        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {PILLARS.map((p) => (
            <div key={p.t} className="rounded-2xl border border-border bg-card/60 p-5">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <p.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold">{p.t}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{p.b}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <h2 className="mt-14 font-display text-2xl font-bold sm:text-3xl">Dažniausiai klausiama apie saugumą</h2>
        <div className="mt-5 space-y-3">
          {SECURITY_FAQ.map((f) => (
            <details key={f.q} className="group rounded-2xl border border-border bg-card/60 px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold marker:hidden">
                {f.q}
                <span aria-hidden className="text-muted-foreground transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-border bg-card p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <Mail className="h-4 w-4 text-primary" /> Klausimai dėl duomenų
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Tėvams, mokykloms ir mokiniams atsakome lietuviškai:{" "}
            <span className="font-semibold text-foreground">pagalba@socialinesvalandos.dev</span>. Prašymus dėl duomenų
            kopijos ar ištrynimo įvykdome per 30 dienų.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/privatumas"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
            >
              Privatumo politika <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/terms"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-5 text-sm font-semibold"
            >
              Naudojimosi taisyklės
            </Link>
            <Link
              to="/versijos"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-5 text-sm font-semibold"
            >
              Versijų istorija
            </Link>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
