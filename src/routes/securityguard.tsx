import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  MousePointer2,
  Grid3X3,
  Crosshair,
  Keyboard,
  Smartphone,
  Server,
  Eye,
  Lock,
  ArrowRight,
  Bot,
} from "lucide-react";
import { PageShell } from "@/components/layout";

const URL = "https://socialinesvalandos.dev/securityguard";
const TITLE = "SV Guard — kaip apsaugome svetainę nuo botų | Socialinės Valandos";
const DESC =
  "SV Guard yra Socialinių Valandų apsaugos sistema: ji atpažįsta automatizuotus įrankius ir botus, o įtartinus lankytojus paprašo įrodyti, kad jie žmonės — laikant mygtuką, renkant piktogramų seką ar pataikant taikiniu.";

export const Route = createFileRoute("/securityguard")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "Kas yra SV Guard?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "SV Guard yra Socialinių Valandų apsaugos sistema, kuri atskiria tikrus lankytojus nuo automatizuotų robotų (botų) ir saugo registraciją, prisijungimą bei valandų sistemą nuo piktnaudžiavimo.",
              },
            },
            {
              "@type": "Question",
              name: "Ar SV Guard tikrina visus lankytojus?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Ne. Įprasti lankytojai nieko nepastebi. Patikra rodoma tik tada, kai naršyklės ir serverio signalai atrodo įtartini.",
              },
            },
            {
              "@type": "Question",
              name: "Ar SV Guard veikia telefone ir su klaviatūra?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Taip. Patikra pritaikyta jutikliniams ekranams ir pilnai valdoma klaviatūra, todėl tinka ir žmonėms, kurie nenaudoja pelės.",
              },
            },
          ],
        }),
      },
    ],
  }),
  component: Page,
});

const CHALLENGES = [
  {
    icon: MousePointer2,
    title: "Mygtuko laikymas",
    text: "Palaik mygtuką ir judink pelę. Žmogaus judesys natūraliai vingiuoja — robotas juda tiesia linija arba visai nejuda.",
  },
  {
    icon: Crosshair,
    title: "Mėlynas taikinys",
    text: "Ekrane atsiranda taikinys, į kurį reikia pataikyti kelis kartus. Tiksli, momentinė reakcija yra tipiška automatizuotiems įrankiams.",
  },
  {
    icon: Grid3X3,
    title: "Piktogramų seka",
    text: "Parodoma trumpa piktogramų seka, kurią reikia pakartoti teisinga tvarka. Tai paprasta žmogui ir sudėtinga skriptui.",
  },
];

const FACTS = [
  {
    icon: Eye,
    title: "Rizikos pagrįsta patikra",
    text: "Įprasti lankytojai nieko nemato. Jei signalai kiek įtartini — pakanka mygtuko laikymo. Labai įtartini — laikymas kartu su taikiniu.",
  },
  {
    icon: Server,
    title: "Sprendžia serveris, ne naršyklė",
    text: "Kiekvienas iššūkis sugeneruojamas ir patikrinamas serveryje. Naršyklės atsakymui niekas netiki — jį tikrina serveris, o kiekvieną patikrą galima panaudoti tik vieną kartą.",
  },
  {
    icon: Smartphone,
    title: "Draugiška telefonams",
    text: "Patikra veikia ir jutikliniuose ekranuose: vietoj pelės judesio tinka prisilietimai ir tempimas.",
  },
  {
    icon: Keyboard,
    title: "Prieinama su klaviatūra",
    text: "Visus iššūkius galima atlikti vien klaviatūra — jokios pelės nereikia. Sustojęs žymeklis automatiškai nelaikomas robotu.",
  },
];

function Page() {
  return (
    <PageShell>
      <article className="mx-auto max-w-3xl px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">Apsaugos sistema</p>
              <h1 className="text-3xl font-bold tracking-tight">SV Guard</h1>
            </div>
          </div>

          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            SV Guard saugo Socialines Valandas nuo botų ir automatizuotų įrankių, kurie bandytų kurti
            netikras paskyras, klastoti valandas ar apkrauti svetainę. Sistema dirba tyliai fone —
            tikras lankytojas jos beveik nepastebi.
          </p>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-12"
        >
          <h2 className="text-xl font-semibold">Kaip atpažįstamas įtartinas lankytojas?</h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            Sistema renka techninius signalus apie naršyklę ir apsilankymą: ar naršyklė nesiunčia
            automatizavimo pėdsakų, ar platformos duomenys tarpusavyje sutampa, ar apsilankyta per
            įprastą nuorodą. Serveris papildomai žiūri į užklausų antraštes. Šie signalai yra tik
            rizikos indikatoriai, o ne įrodymas — todėl niekas niekada neužblokuojamas vien dėl
            įtarimo. Įtartinam lankytojui tiesiog parodome trumpą patikrą.
          </p>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-12"
        >
          <h2 className="text-xl font-semibold">Trys patikros būdai</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {CHALLENGES.map((c) => (
              <div key={c.title} className="rounded-2xl border border-border bg-card p-5">
                <c.icon className="h-6 w-6 text-primary" />
                <h3 className="mt-3 font-semibold">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.text}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Jei patikra nepavyksta du kartus, pasiūloma alternatyva — žodinė ar paveikslėlinė
            patikra (reCAPTCHA), galiojanti tik mūsų domenui.
          </p>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-12"
        >
          <h2 className="text-xl font-semibold">Kodėl tai sąžininga?</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {FACTS.map((f) => (
              <div key={f.title} className="flex gap-4 rounded-2xl border border-border bg-card p-5">
                <f.icon className="mt-1 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-12 rounded-2xl border border-border bg-card p-6"
        >
          <div className="flex items-start gap-4">
            <Bot className="mt-1 h-6 w-6 shrink-0 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Ką SV Guard saugo?</h2>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
                <li>Registraciją ir prisijungimą — nuo masinio netikrų paskyrų kūrimo.</li>
                <li>Valandų sistemą — kad rezervacijas ir QR kodus naudotų tik žmonės.</li>
                <li>Svetainės greitį — kad botų srautas neužkrautų serverio tikriems naudotojams.</li>
              </ul>
              <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Lock className="h-4 w-4 shrink-0" />
                Patikros metu nerenkami jokie asmens duomenys — tikrinami tik techniniai naršyklės signalai.
              </p>
            </div>
          </div>
        </motion.section>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-12 flex flex-wrap items-center gap-4"
        >
          <Link
            to="/saugumas"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Kaip saugome mokinių duomenis <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="mailto:pagalba@socialinesvalandos.dev"
            className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Klausimai? pagalba@socialinesvalandos.dev
          </a>
        </motion.div>
      </article>
    </PageShell>
  );
}
