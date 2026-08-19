import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/layout";
import { Compass, GitMerge, Timer, Database, ShieldCheck, Server } from "lucide-react";

export const Route = createFileRoute("/valora")({
  head: () => ({
    meta: [
      { title: "Kas yra VALORA — Socialinių Valandų variklis" },
      {
        name: "description",
        content:
          "VALORA — vidinis Socialinių Valandų variklis: Discovery, Matching ir Time posistemės, kurios suka užduočių paiešką, rezervacijas ir valandų apskaitą.",
      },
      { property: "og:title", content: "Kas yra VALORA — Socialinių Valandų variklis" },
      {
        property: "og:description",
        content:
          "Techninė VALORA dokumentacija: Discovery Engine, Matching Engine, Time Engine, duomenų sluoksnis ir saugumas.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://socialinesvalandos.dev/valora" }],
  }),
  component: ValoraDocs,
});

const ENGINES = [
  {
    icon: Compass,
    name: "Discovery Engine",
    what: "Užduočių indeksas, žemėlapis ir filtrai.",
    detail:
      "Renka visų patvirtintų organizacijų atviras užduotis, jas geokoduoja (Šeduva ir visas Radviliškio rajonas), rikiuoja pagal atstumą, likusias valandas ir aktualumą.",
  },
  {
    icon: GitMerge,
    name: "Matching Engine",
    what: "Mokinio ir organizacijos suvedimas.",
    detail:
      "Valdo rezervacijų būsenas (laukia → patvirtinta → užbaigta / atmesta), atidaro pokalbių kambarį, siunčia el. laiškus ir pranešimus abiem pusėms.",
  },
  {
    icon: Timer,
    name: "Time Engine",
    what: "Valandų apskaita ir įrodymai.",
    detail:
      "QR arba 6 skaitmenų įsiregistravimas, valandų įskaitymas į profilį, PDF sertifikatai su parašu ir viešu verifikavimo kodu, sukčiavimo požymių tikrinimas.",
  },
];

const LAYERS = [
  { icon: Database, name: "Duomenų sluoksnis", text: "PostgreSQL su RLS politikomis — kiekviena mokykla, organizacija ir mokinys mato tik savo duomenis." },
  { icon: ShieldCheck, name: "Saugumo sluoksnis", text: "Saugumo vartai (captcha įtartinam srautui), veiksmų žurnalas, incidentų kodai, lockdown režimas." },
  { icon: Server, name: "Vykdymo sluoksnis", text: "Serverio funkcijos edge aplinkoje — sertifikatai, el. paštas, statistika ir administravimo veiksmai." },
];

function ValoraDocs() {
  return (
    <PageShell>
      <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-muted-foreground">Dokumentacija</p>
        <h1 className="mt-3 font-display text-4xl font-black tracking-tight sm:text-5xl">Kas yra VALORA?</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          VALORA — vidinis variklis, ant kurio veikia Socialinės Valandos. Tai ne atskiras produktas, o trys
          posistemės, kurios kartu paverčia savanorystę tvarkinga, patikrinama ir sertifikuota valanda.
        </p>

        <h2 className="mt-12 font-display text-2xl font-black tracking-tight">Trys posistemės</h2>
        <div className="mt-5 grid gap-4">
          {ENGINES.map((e) => (
            <section key={e.name} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-primary/30 bg-primary/10">
                  <e.icon className="h-5 w-5 text-primary" />
                </span>
                <div>
                  <h3 className="font-display text-lg font-black tracking-tight">{e.name}</h3>
                  <p className="text-xs text-muted-foreground">{e.what}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{e.detail}</p>
            </section>
          ))}
        </div>

        <h2 className="mt-12 font-display text-2xl font-black tracking-tight">Architektūra</h2>
        <pre className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card p-5 text-xs leading-relaxed text-muted-foreground">
{`            SOCIALINĖS VALANDOS
                     │
                  VALORA
                     │
     ┌───────────────┼───────────────┐
 Discovery       Matching          Time
  Engine          Engine          Engine
     └───────────────┼───────────────┘
                     │
              Duomenų bazė
                     │
                Publikavimas`}
        </pre>

        <h2 className="mt-12 font-display text-2xl font-black tracking-tight">Sluoksniai</h2>
        <div className="mt-5 grid gap-4">
          {LAYERS.map((l) => (
            <section key={l.name} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                <l.icon className="h-4 w-4 text-primary" />
                <h3 className="font-display text-base font-black tracking-tight">{l.name}</h3>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{l.text}</p>
            </section>
          ))}
        </div>

        <h2 className="mt-12 font-display text-2xl font-black tracking-tight">Kodėl tai svarbu mokyklai</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Klasės auklėtojas mato realų klasės progresą, direktorius — visą mokyklą, o mokinys gauna oficialų
          dokumentą su patikrinimo kodu. Visi trys varikliai dirba tame pačiame duomenų sraute, todėl valanda,
          užfiksuota telefone prie QR kodo, tą pačią sekundę matoma mokyklos ataskaitoje.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/tasks" className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">
            Naršyti užduotis
          </Link>
          <Link to="/saugumas" className="rounded-full border border-border px-5 py-2.5 text-sm font-bold">
            Saugumas
          </Link>
        </div>
      </article>
    </PageShell>
  );
}
