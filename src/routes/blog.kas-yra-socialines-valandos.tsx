import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { GraduationCap, Clock, Heart, CheckCircle2, ArrowRight, BookOpen, Users, Trophy, Sparkles } from "lucide-react";
import { PageShell } from "@/components/layout";

const URL = "https://socialinesvalandos.lovable.app/blog/kas-yra-socialines-valandos";
const TITLE = "Kas yra socialinės valandos? Pilnas gidas moksleiviams (2026)";
const DESC = "Socialinės-pilietinės valandos Lietuvos mokyklose: kiek valandų reikia, kaip jas surinkti, kodėl svarbu stojant į universitetą ir kaip viską sekti vienoje vietoje.";

export const Route = createFileRoute("/blog/kas-yra-socialines-valandos")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "keywords", content: "socialinės valandos, savanorystė moksleiviams, pilietinės valandos, socialinė veikla mokykloje" },
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
          "@type": "Article",
          headline: TITLE,
          description: DESC,
          author: { "@type": "Organization", name: "Socialinės Valandos" },
          publisher: { "@type": "Organization", name: "Socialinės Valandos" },
          datePublished: "2026-07-18",
          dateModified: "2026-07-18",
          mainEntityOfPage: URL,
          inLanguage: "lt-LT",
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
              name: "Kiek socialinių valandų reikia Lietuvos mokykloje?",
              acceptedAnswer: { "@type": "Answer", text: "Priklauso nuo klasės ir mokyklos, dažniausiai nuo 10 iki 30 valandų per mokslo metus. Konkretų skaičių nustato mokyklos administracija." },
            },
            {
              "@type": "Question",
              name: "Ar socialinės valandos svarbios stojant į universitetą?",
              acceptedAnswer: { "@type": "Answer", text: "Taip. Savanorystės patirtis pridedama prie stojimo motyvacinių laiškų ir vertinama daugelio Lietuvos bei užsienio universitetų kaip papildomas privalumas." },
            },
            {
              "@type": "Question",
              name: "Kaip užskaitomos socialinės valandos?",
              acceptedAnswer: { "@type": "Answer", text: "Valandas patvirtina organizacija, kurioje savanoriavote, o mokyklos administratorius jas oficialiai užskaito sistemoje." },
            },
            {
              "@type": "Question",
              name: "Kur ieškoti savanorystės galimybių?",
              acceptedAnswer: { "@type": "Answer", text: "Socialinės Valandos platformoje rasi patikrintas organizacijas, gali rezervuoti laiką ir viską sekti vienoje vietoje." },
            },
          ],
        }),
      },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PageShell>
      <article className="mx-auto max-w-3xl px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <Link to="/" className="text-xs font-semibold uppercase tracking-widest text-primary hover:underline">
            ← Į pradžią
          </Link>
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5" />
            <span>Gidas moksleiviams · 2026 m. liepa · 8 min. skaitymo</span>
          </div>
          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
            Kas yra <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">socialinės valandos</span>?
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Pilnas gidas apie socialines-pilietines valandas Lietuvos mokyklose — kiek jų reikia, kaip surinkti,
            kodėl jos svarbios stojant į universitetą ir kaip viską sekti nesukant galvos.
          </p>
        </motion.div>

        <div className="prose prose-invert max-w-none space-y-8 text-foreground/90">
          <section>
            <h2 className="text-2xl font-bold tracking-tight">Trumpas atsakymas</h2>
            <p>
              <strong>Socialinės-pilietinės valandos</strong> — tai privaloma savanoriška veikla, kurią kiekvienas
              Lietuvos moksleivis atlieka per mokslo metus. Tai gali būti pagalba senjorams, gyvūnų prieglaudose,
              renginių organizavimas, aplinkos tvarkymas ar bet kokia kita nauda bendruomenei duodanti veikla,
              kurią patvirtina organizacija ir užskaito mokykla.
            </p>
          </section>

          <section className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-primary">
              <Sparkles className="h-4 w-4" /> Šiame gide
            </h3>
            <ol className="space-y-1.5 text-sm">
              <li><a href="#kiek-valandu" className="hover:text-primary">1. Kiek valandų reikia?</a></li>
              <li><a href="#kur-atlikti" className="hover:text-primary">2. Kur galima jas atlikti?</a></li>
              <li><a href="#universitetas" className="hover:text-primary">3. Kodėl svarbu stojant į universitetą</a></li>
              <li><a href="#kaip-sekti" className="hover:text-primary">4. Kaip sekti valandas platformoje</a></li>
              <li><a href="#duk" className="hover:text-primary">5. Dažniausiai užduodami klausimai</a></li>
            </ol>
          </section>

          <section id="kiek-valandu">
            <h2 className="text-2xl font-bold tracking-tight">1. Kiek socialinių valandų reikia?</h2>
            <p>
              Konkretų valandų skaičių nustato kiekviena mokykla, tačiau dažniausiai tai yra <strong>10–30 valandų per mokslo metus</strong>.
              Vyresnėse klasėse (11–12 klasė) reikalavimas dažnai didesnis, nes valandos yra vienas iš baigimo kriterijų.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { grade: "5–8 klasė", hours: "10–15 val." },
                { grade: "9–10 klasė", hours: "15–20 val." },
                { grade: "11–12 klasė", hours: "20–30 val." },
              ].map((r) => (
                <div key={r.grade} className="rounded-xl border border-border/60 bg-card/60 p-4">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">{r.grade}</div>
                  <div className="mt-1 text-xl font-bold text-primary">{r.hours}</div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              * Tikslų skaičių tvirtina tavo mokyklos administracija. Klausk klasės auklėtojo arba pasitikslink Socialinės Valandos platformoje.
            </p>
          </section>

          <section id="kur-atlikti">
            <h2 className="text-2xl font-bold tracking-tight">2. Kur galima atlikti socialines valandas?</h2>
            <p>Bet kur, kur padedi bendruomenei ir kur veiklą gali patvirtinti atsakingas asmuo. Populiariausios sritys:</p>
            <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { icon: Heart, title: "Pagalba senjorams", body: "Slaugos namai, dienos centrai, apsipirkimo pagalba." },
                { icon: Users, title: "Vaikų dienos centrai", body: "Pamokų ruošimas, būreliai, žaidimai." },
                { icon: Trophy, title: "Renginių organizavimas", body: "Sporto varžybos, festivaliai, koncertai." },
                { icon: GraduationCap, title: "Aplinkos tvarkymas", body: "Miško, parkų, paplūdimių valymas." },
              ].map((c) => {
                const Icon = c.icon;
                return (
                  <li key={c.title} className="flex gap-3 rounded-xl border border-border/60 bg-card/60 p-4">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold">{c.title}</div>
                      <div className="text-sm text-muted-foreground">{c.body}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section id="universitetas">
            <h2 className="text-2xl font-bold tracking-tight">3. Kodėl socialinės valandos svarbios stojant į universitetą</h2>
            <p>
              Nors socialinės valandos oficialiai neprideda balų prie stojimo konkursinio balo, jos atlieka
              <strong> tris esmines funkcijas</strong>:
            </p>
            <ul className="mt-3 space-y-2">
              {[
                "Motyvacinis laiškas — savanorystės patirtis parodo iniciatyvą ir pilietinį sąmoningumą.",
                "Stipendijos ir programos — daugelis fondų reikalauja įrodytos savanoriškos veiklos.",
                "Užsienio universitetai — JAV, JK ir Nyderlandų universitetuose 'community service' yra svarbus stojimo kriterijus.",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </section>

          <section id="kaip-sekti">
            <h2 className="text-2xl font-bold tracking-tight">4. Kaip sekti valandas platformoje</h2>
            <p>
              Socialinės Valandos platforma sujungia moksleivius, organizacijas ir mokyklų administratorius į vieną
              patikimą sistemą. Štai kaip tai veikia:
            </p>
            <ol className="mt-4 space-y-3">
              {[
                { t: "Užsiregistruoji", b: "Su mokyklos kodu — taip užtikriname, kad platformoje tik tikri mokiniai." },
                { t: "Randi veiklą", b: "Naršai patikrintų organizacijų skelbimus arba pasiūlai savo idėją." },
                { t: "Rezervuoji laiką", b: "Pasirenki datą, gauni patvirtinimą ir instrukcijas." },
                { t: "Atlieki savanorystę", b: "Organizacija patvirtina, kad valandos buvo atliktos." },
                { t: "Mokykla užskaito", b: "Administratorius mato tavo progresą realiu laiku." },
              ].map((s, i) => (
                <li key={s.t} className="flex gap-4 rounded-xl border border-border/60 bg-card/60 p-4">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {i + 1}
                  </div>
                  <div>
                    <div className="font-semibold">{s.t}</div>
                    <div className="text-sm text-muted-foreground">{s.b}</div>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section id="duk">
            <h2 className="text-2xl font-bold tracking-tight">5. Dažniausiai užduodami klausimai</h2>
            <div className="mt-4 space-y-3">
              {[
                { q: "Ar galiu socialines valandas atlikti vasarą?", a: "Taip. Daugelis mokyklų valandas užskaito ir už vasaros savanorystę, jei ją patvirtina organizacija." },
                { q: "Ar valandos apskaičiuojamos tik už tiesioginį darbą?", a: "Skaičiuojamas visas laikas praleistas veikloje, įskaitant pasiruošimą ir kelią, jei tai numatyta organizacijos." },
                { q: "Kas nutinka, jei nesurinksiu reikalingų valandų?", a: "Priklauso nuo mokyklos — dažniausiai tai atsiliepia baigimo pažymėjimui arba klasės perkėlimui. Geriau nedelsti." },
                { q: "Ar tėvai mato mano progresą?", a: "Tik jei sutinki. Mokyklos administratorius mato progresą pagal savo klasę." },
              ].map((f) => (
                <details key={f.q} className="group rounded-xl border border-border/60 bg-card/60 p-4 open:bg-card/80">
                  <summary className="cursor-pointer list-none font-semibold marker:hidden">
                    <span className="mr-2 text-primary">＋</span>{f.q}
                  </summary>
                  <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </section>

          <section className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-accent/10 to-transparent p-8 text-center">
            <Clock className="mx-auto h-10 w-10 text-primary" />
            <h2 className="mt-3 text-2xl font-bold">Pradėk kaupti valandas dar šiandien</h2>
            <p className="mx-auto mt-2 max-w-md text-muted-foreground">
              Prisijunk prie Socialinės Valandos platformos — rask patikrintas organizacijas, rezervuok laiką ir sek progresą vienoje vietoje.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground shadow-elegant transition hover:brightness-110"
              >
                Registruotis <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/tasks"
                className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card/60 px-5 py-2.5 font-semibold backdrop-blur transition hover:bg-card"
              >
                Naršyti veiklas
              </Link>
            </div>
          </section>
        </div>
      </article>
    </PageShell>
  );
}
