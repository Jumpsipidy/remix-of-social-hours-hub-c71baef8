import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { MapPin, Clock, HeartHandshake, Sparkles, ArrowRight, Building2, CheckCircle2 } from "lucide-react";
import { PageShell } from "@/components/layout";

const URL = "https://socialinesvalandos.dev/savanoryste-seduvoje";
const TITLE = "Savanorystė Šeduvoje: kur surinkti socialines valandas (2026)";
const DESC =
  "Kur Šeduvoje atlikti socialines-pilietines valandas: gimnazija, kultūros centras, biblioteka, globos namai, seniūnija. Vietos, kontaktai ir kaip valandas užskaityti internetu.";

const PLACES = [
  { name: "Šeduvos gimnazija", what: "Renginių pagalba, jaunesnių klasių mentorystė, bibliotekos tvarkymas", hours: "1–4 val." },
  { name: "Šeduvos kultūros centras", what: "Renginių paruošimas, salės tvarkymas, fotografavimas, garso pagalba", hours: "2–6 val." },
  { name: "Šeduvos miesto biblioteka", what: "Knygų rikiavimas, skaitymo valandėlės vaikams, plakatai", hours: "1–3 val." },
  { name: "Šeduvos globos namai", what: "Bendravimas su senjorais, pagalba veiklose, kalėdiniai vizitai", hours: "2–4 val." },
  { name: "Šeduvos seniūnija", what: "Miesto talkos, aplinkos tvarkymas, pagalba akcijose", hours: "3–8 val." },
  { name: "Šeduvos malūnas ir parkai", what: "Aplinkos priežiūra, gidavimas talkose, sodinimo akcijos", hours: "2–5 val." },
];

const FAQ = [
  {
    q: "Kur Šeduvoje galima atlikti socialines valandas?",
    a: "Dažniausiai Šeduvos gimnazijoje, kultūros centre, miesto bibliotekoje, globos namuose, seniūnijoje bei miesto talkose. Visos šios vietos priima moksleivius savanorius ir gali patvirtinti valandas.",
  },
  {
    q: "Kiek valandų galima surinkti per vieną vizitą?",
    a: "Vienai rezervacijai skaičiuojama iki 8 valandų. Realiai vienas vizitas Šeduvoje dažniausiai duoda 1–4 valandas.",
  },
  {
    q: "Kaip valandos užskaitomos oficialiai?",
    a: "Organizacija patvirtina tavo atėjimą (dažnai QR kodu vietoje), tada mokyklos administratorius valandas užskaito sistemoje. Popierinio lapo pildyti nebereikia.",
  },
  {
    q: "Ar galiu savanoriauti, jei gyvenu Radviliškio rajone, bet ne Šeduvoje?",
    a: "Taip. Paieška pirmiausia rodo Šeduvos vietas, bet jei ten nieko nėra, automatiškai išplečia paiešką į visą Radviliškio rajoną.",
  },
];

export const Route = createFileRoute("/savanoryste-seduvoje")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "keywords", content: "savanorystė Šeduvoje, socialinės valandos Šeduva, Radviliškio rajonas savanorystė, Šeduvos gimnazija socialinės valandos" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: TITLE,
          description: DESC,
          inLanguage: "lt-LT",
          mainEntityOfPage: URL,
          author: { "@type": "Organization", name: "Socialinės Valandos" },
          publisher: { "@type": "Organization", name: "Socialinės Valandos" },
          about: { "@type": "Place", name: "Šeduva", address: { "@type": "PostalAddress", addressLocality: "Šeduva", addressRegion: "Radviliškio r.", addressCountry: "LT" } },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: SeduvaPage,
});

function SeduvaPage() {
  return (
    <PageShell>
      <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-[11px] font-semibold text-primary">
            <MapPin className="h-3 w-3" /> Šeduva · Radviliškio r.
          </div>
          <h1 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">
            Savanorystė Šeduvoje: kur surinkti socialines valandas
          </h1>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Trumpas vietinis gidas moksleiviams — realios vietos Šeduvoje, kiek valandų jos duoda ir kaip
            valandas užskaityti internetu, be popierinio lapo.
          </p>
        </motion.header>

        <section className="mt-10">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <Building2 className="h-5 w-5 text-primary" /> Vietos Šeduvoje
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {PLACES.map((p, i) => (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-border bg-gradient-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-bold">{p.name}</h3>
                  <span className="shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">
                    {p.hours}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">{p.what}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <Clock className="h-5 w-5 text-primary" /> Kaip tai veikia žingsnis po žingsnio
          </h2>
          <ol className="mt-4 space-y-3">
            {[
              "Susikuri paskyrą ir pasirenki savo mokyklą (Šeduvos gimnazijos kodas gaunamas iš klasės vadovo).",
              "Naršai atviras užduotis arba pasiūlai savo rezervaciją — adreso paieška pirmiausia siūlo Šeduvos vietas.",
              "Atvyksti į vietą; organizacija nuskaito tavo QR kodą arba įvedi 6 skaitmenų kodą.",
              "Organizacija patvirtina valandas, mokykla jas užskaito, o tu gali atsisiųsti PDF pažymėjimą.",
            ].map((step, i) => (
              <li key={i} className="flex gap-3 rounded-2xl border border-border bg-background/50 p-4">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <span className="text-sm text-muted-foreground">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-10">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <HeartHandshake className="h-5 w-5 text-primary" /> Dažniausi klausimai
          </h2>
          <div className="mt-4 space-y-3">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-border bg-gradient-card p-4">
                <summary className="cursor-pointer list-none text-sm font-semibold">
                  <span className="mr-2 text-primary">?</span>
                  {f.q}
                </summary>
                <p className="mt-2 text-xs text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-3xl border border-border bg-gradient-card p-6 text-center">
          <Sparkles className="mx-auto h-6 w-6 text-primary" />
          <h2 className="mt-2 text-xl font-bold">Pradėk rinkti valandas Šeduvoje šiandien</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Visos valandos vienoje vietoje, patvirtinimai iš organizacijų ir oficialus PDF pažymėjimas.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link
              to="/tasks"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Atviros užduotys <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2 text-sm font-semibold transition hover:border-primary/50"
            >
              <CheckCircle2 className="h-4 w-4" /> Registruotis
            </Link>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-3 text-[11px] text-muted-foreground">
            <Link to="/blog/kas-yra-socialines-valandos" className="hover:text-primary">Kas yra socialinės valandos?</Link>
            <Link to="/blog/kaip-surinkti-socialines-valandas" className="hover:text-primary">Kaip greitai surinkti valandas</Link>
            <Link to="/socialiniu-valandu-lapas" className="hover:text-primary">Socialinių valandų lapas</Link>
          </div>
        </section>
      </article>
    </PageShell>
  );
}
