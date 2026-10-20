import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageShell, DASHBOARD_BY_ROLE } from "../components/layout";
import { getPublicStats } from "@/lib/public-stats.functions";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ArrowRight, Search, QrCode, FileCheck2, ShieldCheck, MapPin, Clock, Check, ChevronDown } from "lucide-react";


/**
 * Shared FAQ source — rendered on the page AND emitted as FAQPage JSON-LD so
 * AI assistants (ChatGPT, Perplexity, Gemini) can answer these questions with
 * our own wording, including the support contact.
 */
const HOME_FAQ: { q: string; a: string; id: string }[] = [
  { id: "what", q: "Kas yra socialinės valandos?", a: "Socialinės-pilietinės valandos — mokinio veikla bendruomenei. Reikiamą valandų skaičių ir užskaitymo tvarką pasitikrink savo mokykloje." },
  { id: "price", q: "Kiek kainuoja Socialinės Valandos?", a: "Mokiniams, mokykloms ir organizacijoms platforma yra visiškai nemokama." },
  { id: "official", q: "Ar valandos galioja oficialiai?", a: "Taip — jas patvirtina organizacija, o mokykla užskaito sistemoje. Sertifikatas turi patikrinamą HMAC parašą ir viešą patikros nuorodą socialinesvalandos.dev/verify." },
  { id: "qr", q: "Kaip veikia QR įsiregistravimas?", a: "Mokinys pasirenka šiandienos vizitą ir parodo QR kodą, kuris atsinaujina kas 30 sekundžių. Organizacija jį nuskenuoja telefonu. Galima naudoti ir atsarginį 6 skaitmenų kodą; patikrinimui reikalingas ryšys su serveriu." },
  { id: "hours", q: "Kas pasirenka suteikiamas valandas?", a: "Užbaigdama rezervaciją organizacija pasirenka suteikiamas sveikas valandas. Mokyklos administratorius gali jas pasirinkti arba palikti planuotas. Dalinės valandos, pavyzdžiui, 1,5 ar 2,7, neleidžiamos." },
  { id: "chat", q: "Kiek laiko saugomos žinutės?", a: "Pokalbių žinutės automatiškai ištrinamos po 12 dienų. Pokalbiuose matomi mokinio, organizacijos ir mokyklos administratoriaus vaidmenys." },
  { id: "pdf", q: "Kaip gauti PDF sertifikatą?", a: "Kai valandos patvirtintos, mokinys savo skydelyje spaudžia „Atsisiųsti sertifikatą“ — PDF su QR kodu ir parašu sugeneruojamas iškart, o mokykla gali jį patikrinti per „PDF / QR patikra“." },
  { id: "code", q: "Ką daryti, jei neturiu mokyklos kodo?", a: "Parašyk klasės auklėtojai arba mokyklos administracijai — kodą jie mato savo skydelyje. Šeduvos gimnazijos mokiniams kodą duoda auklėtoja." },
  { id: "teacher", q: "Ar klasės auklėtoja mato tik savo klasę?", a: "Taip. Auklėtoja mato tik jai priskirtas klases, direktorius — visą mokyklą. Duomenys tarp mokyklų niekada nesimaišo." },
  { id: "cheat", q: "Kaip apsisaugoma nuo sukčiavimo?", a: "Sistema tikrina QR įrodymą, dienos valandų limitą (iki 8 val. per rezervaciją), įtartinai apvalias valandas ir pasikartojančius įrašus. Mokykla mato „Valandų patikros“ skydelį su ženkleliais." },
  { id: "summer", q: "Ar galiu savanoriauti vasarą?", a: "Taip. Jei organizacija patvirtina valandas, jos užskaitomos ir per atostogas." },
  { id: "support", q: "Kaip susisiekti su pagalba?", a: "Rašyk el. paštu pagalba@socialinesvalandos.dev — atsakome lietuviškai. Klaidą taip pat gali pranešti mygtuku „Pranešti bug'ą“ svetainės apačioje; prisegk incidento kodą." },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Socialinės valandos — savanorystė mokiniams internetu" },
      { name: "description", content: "Socialinės valandos be popierių: rask savanorystės užduotį, rezervuok, patvirtink QR kodu ir gauk PDF pažymėjimą. Nemokama visoms Lietuvos mokykloms." },
      { property: "og:title", content: "Socialinės valandos mokiniams — rink internetu" },
      { property: "og:description", content: "Rask savanorystės užduotį, rezervuok, patvirtink QR kodu ir gauk socialinių valandų pažymėjimą. Nemokama Lietuvos mokykloms." },
      { property: "og:url", content: "https://socialinesvalandos.dev/" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://socialinesvalandos.dev/og-cover.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://socialinesvalandos.dev/og-cover.jpg" },
      { name: "keywords", content: "socialines valandos, socialinės valandos, socialinių valandų centras, savanoryste, savanorystė Lietuvoje, socialinių valandų apskaita, moksleivių savanorystė, savanorystės užduotys, Šeduvos gimnazija, socialinesvalandos.dev, socialinės valandos mokiniams, savanorystės sistema, socialinių valandų centras mokiniams, kur rinkti socialines valandas" },
    ],
    links: [{ rel: "canonical", href: "https://socialinesvalandos.dev/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Socialinės Valandos",
          alternateName: ["Soc. Valandos", "Socialinesvalandos.dev", "Savanorystės Centras"],
          url: "https://socialinesvalandos.dev/",
          description: "Mokinių savanorystės ir socialinių valandų apskaita: veiklos, rezervacijos ir patvirtinti pažymėjimai.",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://socialinesvalandos.dev/tasks?q={search_term_string}",
            "query-input": "required name=search_term_string"
          }
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: HOME_FAQ.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Socialinės Valandos",
          url: "https://socialinesvalandos.dev/",
          logo: "https://socialinesvalandos.dev/favicon.png?v=8",

        }),
      },
    ],
  }),
  component: Home,
});

const DEMO_QUERY = "gyvūnų prieglauda";

/** Typing search demo — plain timers, no animation library, pauses when hidden. */
function useTypedDemo() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setN(DEMO_QUERY.length); return; }
    let i = 0;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      i = i >= DEMO_QUERY.length + 18 ? 0 : i + 1;
      setN(Math.min(i, DEMO_QUERY.length));
    }, 90);
    return () => window.clearInterval(id);
  }, []);
  return { text: DEMO_QUERY.slice(0, n), done: n === DEMO_QUERY.length };
}

function ProductPreview() {
  const { text, done } = useTypedDemo();
  return (
    <div className="home-preview mx-auto mt-12 max-w-3xl overflow-hidden rounded-2xl border border-border bg-card text-left shadow-elegant">
      <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-accent" />
        <span className="h-2.5 w-2.5 rounded-full bg-primary/70" />
        <span className="ml-3 truncate rounded-md bg-background px-3 py-1 font-mono text-xs text-muted-foreground">socialinesvalandos.dev/tasks</span>
      </div>
      <div className="p-4 sm:p-6">
        <div className="flex items-center gap-2 rounded-xl border border-primary/50 bg-background px-3 py-3">
          <Search className="h-4 w-4 text-primary" />
          <span className="text-sm text-foreground">{text}<span className="home-caret ml-0.5 inline-block h-4 w-px translate-y-0.5 bg-foreground" /></span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            { t: "Pagalba gyvūnų prieglaudoje", o: "Šeduvos gyvūnų globa", h: 3, d: "Šeštadienis 10:00" },
            { t: "Šunų vedžiojimas", o: "Prieglauda „Ketureta“", h: 2, d: "Sekmadienis 12:00" },
          ].map((c, i) => (
            <div key={c.t} className={`rounded-xl border border-border bg-background p-4 transition-all duration-300 ${done ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`} style={{ transitionDelay: `${i * 80}ms` }}>
              <p className="text-sm font-bold text-foreground">{c.t}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{c.o}</p>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{c.d}</span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 font-bold text-primary">{c.h} val.</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const STEPS = [
  { icon: Search, n: "01", t: "Rask", d: "Ieškok veiklų pagal pavadinimą, organizaciją ar miestą — Šeduvoje, Radviliškyje, Šiauliuose.", demo: (
    <div className="space-y-2">{["Gyvūnų prieglauda", "Bibliotekos renginys", "Parko tvarkymas"].map((x, i) => (
      <div key={x} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${i === 0 ? "border-primary/50 bg-primary/5 text-foreground" : "border-border text-muted-foreground"}`}><MapPin className="h-3.5 w-3.5" />{x}</div>))}</div>
  ) },
  { icon: QrCode, n: "02", t: "Rezervuok ir atvyk", d: "Rezervuok vietą (galima su draugais), o vietoje parodyk QR kodą — organizacija nuskenuoja.", demo: (
    <div className="flex items-center gap-4"><div className="grid h-20 w-20 grid-cols-5 gap-0.5 rounded-lg border border-border bg-background p-1.5">{Array.from({ length: 25 }, (_, i) => <span key={i} className={`rounded-[1px] ${[0,1,3,5,6,8,12,14,16,18,19,21,23,24].includes(i) ? "bg-foreground" : "bg-transparent"}`} />)}</div>
      <div className="text-xs text-muted-foreground"><p className="font-bold text-foreground">Įsiregistruota</p><p>Kodas atsinaujina kas 30 s</p></div></div>
  ) },
  { icon: FileCheck2, n: "03", t: "Gauk valandas", d: "Organizacija patvirtina valandas, o tu atsisiunti PDF pažymėjimą su patikrinamu QR parašu.", demo: (
    <div><div className="flex justify-between text-xs"><span className="font-bold text-foreground">17 / 20 val.</span><span className="text-muted-foreground">85%</span></div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full w-[85%] rounded-full bg-gradient-primary" /></div>
      <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary"><Check className="h-3.5 w-3.5" /> Pažymėjimas paruoštas</p></div>
  ) },
];

function Home() {
  const { profile, isAuthenticated } = useAuth();
  const { data: counts = { students: 0, orgs: 0, hours: 0, schools: 0 } } = useQuery({
    queryKey: ["public-stats"],
    queryFn: () => getPublicStats(),
    staleTime: 60_000,
  });
  const dash = profile?.role ? (DASHBOARD_BY_ROLE as Record<string, { to: string; label: string } | null>)[profile.role] : null;
  const fmt = (n: number) => new Intl.NumberFormat("lt-LT").format(n || 0);

  return (
    <PageShell>
      <div className="relative">
        <section className="relative overflow-hidden px-4 pb-12 pt-12 sm:px-6 sm:pt-20" aria-labelledby="home-title">
          <div aria-hidden className="home-hero-bg pointer-events-none absolute inset-0" />
          <div aria-hidden className="home-grid pointer-events-none absolute inset-0" />
          <div className="relative mx-auto max-w-4xl text-center">
            {isAuthenticated && dash && (
              <Link to={dash.to} className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-semibold text-foreground hover:border-primary/50">
                Sveiki sugrįžę{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""} · {dash.label} <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-semibold text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-primary" />Mokiniams · organizacijoms · mokykloms</p>
            <h1 id="home-title" className="mt-3 font-display text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-6xl">
              Socialinės valandos.<br /><span className="home-gradient-text">Be popierių.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">Rask savanorystės veiklą, rezervuok, patvirtink QR kodu ir gauk pažymėjimą. Nemokamai.</p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="min-h-12"><Link to={dash ? dash.to : "/tasks"}>{dash ? dash.label : "Rasti veiklą"}<ArrowRight /></Link></Button>
              <Button asChild variant="outline" size="lg" className="min-h-12"><Link to={isAuthenticated ? "/tasks" : "/register"}>{isAuthenticated ? "Naršyti veiklas" : "Sukurti paskyrą"}</Link></Button>
            </div>
            <ProductPreview />
          </div>
        </section>

        <section className="border-y border-border bg-card/40">
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-px sm:grid-cols-4">
            {[
              { v: counts.hours, l: "Užregistruota valandų" },
              { v: counts.students, l: "Mokinių" },
              { v: counts.orgs, l: "Organizacijų" },
              { v: counts.schools, l: "Mokyklų" },
            ].map((s) => (
              <div key={s.l} className="px-4 py-8 text-center">
                <p className="font-display text-3xl font-bold tabular-nums text-foreground sm:text-4xl">{fmt(s.v)}</p>
                <p className="mt-1 text-xs font-medium text-muted-foreground">{s.l}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 sm:py-24" aria-labelledby="how">
          <div className="mx-auto max-w-6xl">
            <p className="text-sm font-semibold text-primary">Kaip tai veikia</p>
            <h2 id="how" className="mt-2 font-display text-3xl font-bold text-foreground sm:text-4xl">Trys žingsniai iki valandų</h2>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {STEPS.map((s) => (
                <article key={s.n} className="flex flex-col rounded-2xl border border-border bg-card p-6 transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elegant">
                  <div className="flex items-center justify-between"><s.icon className="h-5 w-5 text-primary" /><span className="font-mono text-xs text-muted-foreground">{s.n}</span></div>
                  <h3 className="mt-4 font-display text-xl font-bold text-foreground">{s.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
                  <div className="mt-6 rounded-xl border border-border bg-muted/30 p-4">{s.demo}</div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-16 sm:px-6 sm:pb-24" aria-labelledby="guard">
          <div className="mx-auto grid max-w-6xl items-center gap-8 rounded-3xl border border-border bg-card p-6 sm:p-10 md:grid-cols-2">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-primary"><ShieldCheck className="h-4 w-4" /> SV Guard</p>
              <h2 id="guard" className="mt-2 font-display text-3xl font-bold text-foreground">Apsauga nuo botų ir sukčiavimo</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Įprasti lankytojai patikros net nepastebi. Įtartiniems — trumpas laikymo iššūkis, kurį serveris patikrina vieną kartą. QR įrodymai ir valandų limitai saugo, kad valandos būtų tikros.</p>
              <Button asChild variant="outline" className="mt-5"><Link to="/securityguard">Kaip veikia SV Guard <ArrowRight /></Link></Button>
            </div>
            <ul className="space-y-3">
              {["Rizika vertinama serveryje", "Vienkartiniai iššūkiai", "Veikia su klaviatūra ir telefonu", "Asmens duomenys nerenkami"].map((x) => (
                <li key={x} className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground"><Check className="h-4 w-4 text-primary" />{x}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="px-4 pb-16 sm:px-6 sm:pb-24" aria-labelledby="faq">
          <div className="mx-auto max-w-3xl">
            <h2 id="faq" className="font-display text-3xl font-bold text-foreground">Dažni klausimai</h2>
            <div className="mt-8 space-y-2">
              {HOME_FAQ.map((f) => (
                <details key={f.id} className="group rounded-xl border border-border bg-card px-5 py-4 open:border-primary/40">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold text-foreground">
                    {f.q}<ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-20 text-center sm:px-6">
          <div className="mx-auto max-w-3xl rounded-3xl bg-gradient-primary p-10 shadow-glow">
            <h2 className="font-display text-3xl font-bold text-primary-foreground">Pradėk rinkti valandas šiandien</h2>
            <p className="mt-2 text-sm text-primary-foreground/80">socialinesvalandos.dev · pagalba@socialinesvalandos.dev</p>
            <Button asChild size="lg" variant="secondary" className="mt-6 min-h-12"><Link to={isAuthenticated ? "/tasks" : "/register"}>{isAuthenticated ? "Naršyti veiklas" : "Sukurti paskyrą"} <ArrowRight /></Link></Button>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
