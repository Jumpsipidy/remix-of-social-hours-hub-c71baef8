import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  QrCode,
  BarChart3,
  FileCheck2,
  Users,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { PageShell } from "@/components/layout";

const URL = "https://socialinesvalandos.dev/socialines-valandos-mokykloms";
const TITLE = "Socialinės valandos mokykloms — apskaita ir patikra (2026)";
const DESC =
  "Kaip mokyklos administracija seka socialines-pilietines valandas: QR patvirtinimas, apsauga nuo sukčiavimo, klasių ataskaitos ir vieno mygtuko eksportas.";
const OG_IMAGE = "https://socialinesvalandos.dev/og-cover.jpg";

export const Route = createFileRoute("/socialines-valandos-mokykloms")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      {
        name: "keywords",
        content:
          "socialinės valandos mokykloms, pilietinių valandų apskaita, mokyklos administratorius, valandų patikra, savanorystės ataskaitos",
      },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Socialinės Valandos — mokyklų sritis",
          applicationCategory: "EducationalApplication",
          operatingSystem: "Web",
          inLanguage: "lt-LT",
          description: DESC,
          url: URL,
          offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "Kaip mokykla patikrina, ar mokinys tikrai atliko valandas?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Mokinys atvykęs nuskaitomas organizacijos QR skeneriu, todėl sistemoje lieka tikslus atvykimo laikas. Mokyklos srityje kiekviena rezervacija pažymima „QR patvirtinta“ arba „Be QR įrodymo“.",
              },
            },
            {
              "@type": "Question",
              name: "Ar galima matyti tik savo klasių mokinius?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Taip. Mokyklos administratoriui priskiriamos konkrečios klasės ir jis mato tik tų klasių mokinių progresą bei rezervacijas.",
              },
            },
            {
              "@type": "Question",
              name: "Ar galima eksportuoti valandų ataskaitą?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Taip. Ataskaitas galima atsisiųsti CSV formatu arba spausdinti oficialų socialinių valandų lapą.",
              },
            },
            {
              "@type": "Question",
              name: "Kiek kainuoja mokyklai?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Platforma mokykloms nemokama — reikia tik registracijos ir mokyklos kodo.",
              },
            },
          ],
        }),
      },
    ],
  }),
  component: Page,
});

const FEATURES = [
  {
    icon: QrCode,
    title: "QR patvirtinimas vietoje",
    text: "Organizacija nuskaito mokinio kodą atvykus — laikas fiksuojamas serveryje, ne ranka.",
  },
  {
    icon: ShieldCheck,
    title: "Apsauga nuo sukčiavimo",
    text: "Sistema pažymi įtartinas rezervacijas: dubliuotą laiką, per ilgas dienas ar valandas be įrodymo.",
  },
  {
    icon: BarChart3,
    title: "Klasių statistika",
    text: "Matai, kiek procentų klasės jau surinko valandas ir kas atsilieka likus mėnesiui iki termino.",
  },
  {
    icon: FileCheck2,
    title: "Ataskaitos ir eksportas",
    text: "CSV eksportas arba spausdinamas socialinių valandų lapas su parašo laukais.",
  },
  {
    icon: Users,
    title: "Partnerių organizacijos",
    text: "Mokykla pati pridedа patikimas organizacijas ir mato, kur mokiniai savanoriauja.",
  },
  {
    icon: CheckCircle2,
    title: "Auditas vienu paspaudimu",
    text: "Atidarai mokinį — matai visą jo rezervacijų istoriją su įrodymų ženkleliais.",
  },
];

function Page() {
  return (
    <PageShell>
      <div className="mx-auto max-w-4xl px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link
            to="/"
            className="text-xs font-semibold uppercase tracking-widest text-primary hover:underline"
          >
            ← Į pradžią
          </Link>
          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
            Socialinės valandos{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              mokykloms
            </span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Popierinius lapelius pakeičia viena sistema: mokinių progresas realiu laiku, QR
            patvirtintos valandos ir ataskaitos, kurioms nereikia pasitikėti „garbės žodžiu“.
          </p>
        </motion.div>

        <section className="mt-12 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur"
            >
              <f.icon className="h-5 w-5 text-primary" />
              <h2 className="mt-3 text-base font-bold tracking-tight">{f.title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.text}</p>
            </motion.div>
          ))}
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-bold tracking-tight">Kaip tai veikia mokykloje</h2>
          <ol className="mt-4 space-y-3 text-sm text-foreground/90">
            <li>
              <strong>1.</strong> Mokykla užsiregistruoja ir gauna savo prisijungimo kodą mokiniams.
            </li>
            <li>
              <strong>2.</strong> Administratoriui priskiriamos klasės, kurias jis kuruoja.
            </li>
            <li>
              <strong>3.</strong> Mokiniai rezervuoja veiklas pas patvirtintas organizacijas.
            </li>
            <li>
              <strong>4.</strong> Organizacija nuskaito QR kodą atvykus ir uždaro valandas.
            </li>
            <li>
              <strong>5.</strong> Mokykla audituoja ir eksportuoja galutinę ataskaitą.
            </li>
          </ol>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-bold tracking-tight">Dažniausi klausimai</h2>
          <div className="mt-4 space-y-4 text-sm">
            <div>
              <h3 className="font-semibold">Ar galima matyti tik savo klases?</h3>
              <p className="text-muted-foreground">
                Taip — administratoriui priskyrus klases, jis mato tik tų klasių mokinius.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">Kaip atskirti realias valandas nuo išgalvotų?</h3>
              <p className="text-muted-foreground">
                Kiekviena rezervacija turi „Įrodymo“ ženklelį: QR patvirtinta su tiksliu laiku arba
                įspėjimas, kad įrodymo nėra.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">Kiek kainuoja?</h3>
              <p className="text-muted-foreground">Mokykloms — nemokamai.</p>
            </div>
          </div>
        </section>

        <div className="mt-14 rounded-2xl border border-primary/30 bg-primary/10 p-6">
          <h2 className="text-lg font-bold tracking-tight">Norite prijungti savo mokyklą?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Registracija trunka kelias minutes — po jos gausite mokyklos kodą mokiniams.
          </p>
          <Link
            to="/register"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Registruoti mokyklą <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
