import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { CheckCircle2, ArrowRight, Clock, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { PageShell } from "@/components/layout";

const URL = "https://socialinesvalandos.dev/blog/kaip-surinkti-socialines-valandas";
const TITLE = "Kaip surinkti socialines valandas? 7 žingsniai (2026 gidas)";
const DESC = "Praktinis gidas kaip greitai ir teisėtai surinkti socialines valandas mokykloje: kur ieškoti, kaip rezervuoti, kaip patvirtinti ir gauti oficialų PDF sertifikatą.";

const STEPS = [
  { t: "Sužinok kiek valandų reikia", d: "5–7 klasėms — 20 val., 8+ klasėms — bent 8 val. per mokslo metus. Pasitikslink pas savo klasės auklėtoją." },
  { t: "Užsiregistruok platformoje", d: "Registruokis kaip mokinys, įvesk savo mokyklos kodą ir pasirink klasę. Užtrunka <60 sekundžių." },
  { t: "Naršyk patvirtintas užduotis", d: "Puslapyje /tasks matai realias organizacijas ir renginius su vietomis, aprašymais ir laikais." },
  { t: "Rezervuok laiką", d: "Spausk mygtuką Rezervuoti ir pasirink datą bei valandų skaičių. Gali kviesti draugus — grupinės rezervacijos leidžiamos." },
  { t: "Nueik ir atlik veiklą", d: "Nueik į vietą sutartu laiku. Turėk telefone rotuojantį QR kodą arba užsirašyk savo 6 skaitmenų atsarginį kodą." },
  { t: "Patvirtink QR kodu", d: "Organizacija nuskaito tavo QR arba įveda tavo kodą. Sistema iškart užfiksuoja įsiregistravimą." },
  { t: "Gauk PDF sertifikatą", d: "Kai organizacija patvirtina valandas, gauni oficialų PDF su parašu ir QR verifikacija. Klasės auklėtoja mato viską realiu laiku." },
];

export const Route = createFileRoute("/blog/kaip-surinkti-socialines-valandas")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "keywords", content: "kaip surinkti socialines valandas, kur atlikti socialines valandas, socialinės valandos mokiniams, savanorystės valandos" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: "Kaip surinkti socialines valandas Lietuvos mokykloje",
          description: DESC,
          inLanguage: "lt-LT",
          totalTime: "PT20M",
          step: STEPS.map((s, i) => ({
            "@type": "HowToStep",
            position: i + 1,
            name: s.t,
            text: s.d,
            url: `${URL}#zingsnis-${i + 1}`,
          })),
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Pradžia", item: "https://socialinesvalandos.dev/" },
            { "@type": "ListItem", position: 2, name: "Tinklaraštis", item: "https://socialinesvalandos.dev/blog/kas-yra-socialines-valandos" },
            { "@type": "ListItem", position: 3, name: TITLE, item: URL },
          ],
        }),
      },
    ],
  }),
  component: Post,
});

function Post() {
  return (
    <PageShell>
      <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="mb-3 text-[11px] uppercase tracking-[0.32em] text-white/50">
            <Link to="/" className="hover:text-white/80">Pradžia</Link> · Tinklaraštis · Gidas
          </p>
          <h1 className="mb-4 text-4xl sm:text-5xl md:text-6xl font-display leading-[1.05] text-white" style={{ fontWeight: 500 }}>
            Kaip surinkti{" "}
            <span className="italic bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(120deg, #E9B44C, #C8452A)" }}>
              socialines valandas
            </span>?
          </h1>
          <p className="text-lg text-white/70 leading-relaxed">
            Trumpas 7 žingsnių gidas moksleiviams, kaip greitai, saugiai ir be popierizmo surinkti socialines-pilietines
            valandas Lietuvos mokykloje — nuo registracijos iki oficialaus PDF sertifikato.
          </p>
        </motion.div>

        <div className="mt-12 space-y-4">
          {STEPS.map((s, i) => (
            <motion.section
              key={s.t}
              id={`zingsnis-${i + 1}`}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.05, duration: 0.5 }}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl"
            >
              <div className="flex items-start gap-4">
                <div
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #C8452A, #E9B44C)" }}
                >
                  {i + 1}
                </div>
                <div>
                  <h2 className="mb-2 text-xl font-semibold text-white">{s.t}</h2>
                  <p className="text-[15px] leading-relaxed text-white/70">{s.d}</p>
                </div>
              </div>
            </motion.section>
          ))}
        </div>

        <div className="mt-12 grid gap-3 sm:grid-cols-3">
          {[
            { icon: Clock, t: "20 min", d: "Vidutinis pirmos rezervacijos laikas" },
            { icon: MapPin, t: "Vietos visoje LT", d: "Nuo Vilniaus iki Klaipėdos" },
            { icon: ShieldCheck, t: "Oficialu", d: "PDF su QR verifikacija" },
          ].map((f) => (
            <div key={f.t} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <f.icon className="mb-2 h-5 w-5" style={{ color: "#E9B44C" }} />
              <div className="text-lg font-semibold text-white">{f.t}</div>
              <div className="text-sm text-white/60">{f.d}</div>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center backdrop-blur-xl">
          <Sparkles className="h-6 w-6" style={{ color: "#E9B44C" }} />
          <h3 className="text-2xl font-display text-white" style={{ fontWeight: 500 }}>Pasiruošęs pradėti?</h3>
          <p className="max-w-lg text-sm text-white/70">
            Prisijunk prie tūkstančių Lietuvos moksleivių, kurie renka valandas paprastai — be popierių, be Excel'io, be dingusių įrašų.
          </p>
          <Link
            to="/register"
            className="group inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #C8452A, #E9B44C)" }}
          >
            Sukurti nemokamą paskyrą
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link to="/blog/kas-yra-socialines-valandos" className="text-xs text-white/50 hover:text-white/80 inline-flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Skaityti: kas yra socialinės valandos?
          </Link>
        </div>
      </article>
    </PageShell>
  );
}
