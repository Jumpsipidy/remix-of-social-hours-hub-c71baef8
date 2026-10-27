import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageShell, DASHBOARD_BY_ROLE } from "../components/layout";
import { getPublicStats } from "@/lib/public-stats.functions";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowDown, Search, QrCode, FileCheck2, ShieldCheck, MapPin, Check, ChevronDown, Users, Heart } from "lucide-react";
import { HomeScene } from "@/components/home-scene";


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
      { name: "twitter:card", content: "summary_large_image" },
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

const STORY = [
  { k: "01", title: "Rask veiklą, kuri tau patinka", body: "Gyvūnų prieglaudos, renginiai, pagalba bendruomenei. Įrašyk, ko ieškai — ir matyk, kas vyksta šalia.", to: "/tasks", cta: "Peržiūrėti veiklas" },
  { k: "02", title: "Eik vienas arba su draugais", body: "Rezervuok vietą ir pakviesk draugus. Kiekvienas gauna savo kvietimą ir savo QR kodą.", to: "/register", cta: "Sukurti paskyrą" },
  { k: "03", title: "Atvykai — parodyk QR", body: "Organizacija nuskenuoja kodą telefonu. Mokyklos veikloms QR nereikia — patvirtina auklėtoja.", to: "/securityguard", cta: "Kaip tai apsaugota" },
  { k: "04", title: "Valandos — tavo paskyroje", body: "Patvirtintos valandos iškart papildo progresą. Prireikus atsisiųsk PDF pažymėjimą su patikra.", to: "/login", cta: "Mano valandos" },
] as const;

function StoryPanel({ step }: { step: number }) {
  return <div key={step} className="demo-swap w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
    {step === 0 && <><div className="flex h-12 items-center gap-3 rounded-xl border border-primary/50 bg-background px-4"><Search className="h-5 w-5 text-primary" /><span className="text-sm">gyvūnų prieglauda</span><span className="ml-auto h-5 w-px animate-pulse bg-primary" /></div>
      <div className="mt-4 space-y-3">{["Pagalba gyvūnų prieglaudoje", "Šunų vedžiojimas savaitgalį"].map((t, i) => <div key={t} className="flex items-center gap-3 rounded-xl bg-muted/50 p-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary"><Heart className="h-5 w-5" /></span><div className="min-w-0"><p className="truncate text-sm font-semibold">{t}</p><p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />Šeduva · {i + 3} val.</p></div></div>)}</div></>}
    {step === 1 && <><p className="text-sm font-semibold">Pakviesti draugus</p><div className="mt-4 space-y-2">{["Ugnė", "Matas", "Kajus"].map((n, i) => <div key={n} className="flex items-center gap-3 rounded-xl bg-muted/50 p-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-sm font-bold">{n[0]}</span><span className="text-sm">{n}</span><span className={`ml-auto text-xs font-semibold ${i < 2 ? "text-success" : "text-muted-foreground"}`}>{i < 2 ? "Priėmė" : "Laukia"}</span></div>)}</div><p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><Users className="h-4 w-4 text-primary" />Grupė: 3 dalyviai</p></>}
    {step === 2 && <div className="text-center"><QrCode className="mx-auto h-36 w-36 text-foreground" /><p className="mt-4 font-semibold">Tavo QR kodas</p><p className="mt-1 text-xs text-muted-foreground">Atsinaujina kas 30 s · atsarginis kodas 482 913</p></div>}
    {step === 3 && <><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-xs font-semibold text-success"><Check className="h-4 w-4" />PATVIRTINTA</span><FileCheck2 className="h-6 w-6 text-primary" /></div><p className="mt-5 text-5xl font-bold tabular-nums">17<span className="text-xl font-normal text-muted-foreground"> / 20 val.</span></p><div className="mt-4 h-3 overflow-hidden rounded-full bg-muted"><div className="demo-progress h-full w-[85%] rounded-full bg-primary" /></div><p className="mt-4 text-xs text-muted-foreground">Pavyzdys · PDF pažymėjimas su patikros nuoroda</p></>}
  </div>;
}

function ScrollStory() {
  const [step, setStep] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) setStep(Number((e.target as HTMLElement).dataset.i)); }), { rootMargin: "-45% 0px -45% 0px" });
    refs.current.forEach((r) => r && io.observe(r));
    return () => io.disconnect();
  }, []);
  return <section id="eiga" className="px-4 py-20 sm:px-6" aria-labelledby="story-title">
    <div className="mx-auto max-w-6xl">
      <p className="text-xs font-semibold tracking-widest text-primary">KAIP TAI VEIKIA</p>
      <h2 id="story-title" className="mt-3 max-w-xl text-3xl font-bold leading-tight sm:text-4xl">Nuo paieškos iki patvirtintų valandų.</h2>
      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        <div className="glass rounded-3xl px-6">{STORY.map((s, i) => <div key={s.k} data-i={i} ref={(el) => { refs.current[i] = el; }} className={`flex min-h-[55vh] flex-col justify-center border-l-2 pl-6 transition-colors duration-300 lg:min-h-[70vh] ${step === i ? "border-primary" : "border-border"}`}>
          <span className="font-mono text-sm text-primary">{s.k}</span>
          <h3 className={`mt-2 text-2xl font-bold transition-opacity duration-300 sm:text-3xl ${step === i ? "opacity-100" : "opacity-40"}`}>{s.title}</h3>
          <p className="mt-3 max-w-md text-muted-foreground">{s.body}</p>
          <Link to={s.to} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">{s.cta}<ArrowRight className="h-4 w-4" /></Link>
          <div className="mt-6 lg:hidden"><StoryPanel step={i} /></div>
        </div>)}</div>
        <div className="hidden lg:block"><div className="glass sticky top-28 flex h-[70vh] items-center justify-center rounded-3xl"><StoryPanel step={step} /></div></div>
      </div>
    </div>
  </section>;
}

const ROLES = [
  { label: "Mokiniams", title: "Visos tavo valandos vienoje vietoje", points: ["Veiklos šalia tavęs", "Draugų grupės", "PDF pažymėjimas"], to: "/tasks", cta: "Rasti veiklą" },
  { label: "Organizacijoms", title: "Savanoriai ateina patys", points: ["Skelbk veiklas", "QR atvykimo patikra", "Valandų patvirtinimas"], to: "/register", cta: "Pateikti prašymą" },
  { label: "Mokykloms", title: "Klasė matoma iš karto", points: ["Klasių kodai", "Mokinių progresas", "Auklėtojos veiklos"], to: "/socialines-valandos-mokykloms", cta: "Plačiau mokykloms" },
] as const;

function Home() {
  const { profile, isAuthenticated } = useAuth();
  const { data: counts } = useQuery({ queryKey: ["public-stats"], queryFn: () => getPublicStats({ data: { publicStats: true } }), staleTime: 60_000 });
  const dash = profile?.role ? DASHBOARD_BY_ROLE[profile.role] : null;
  const fmt = (n?: number) => n === undefined ? "—" : new Intl.NumberFormat("lt-LT").format(n);
  return <PageShell><HomeScene /><div className="home-saas home-live">
    <section className="relative flex min-h-[calc(100svh-88px)] items-start justify-center px-4 pt-[7vh] text-center sm:px-6" aria-labelledby="home-title">
      <div className="home-hero-in mx-auto max-w-3xl">
        <p className="glass mx-auto inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium"><span className="h-2 w-2 rounded-full bg-success" />Nemokama mokiniams, mokykloms ir organizacijoms</p>
        <h1 id="home-title" className="mt-6 text-5xl font-bold leading-[1.05] sm:text-7xl">Socialinės valandos<br /><span className="text-primary">be popierių.</span></h1>
        <p className="mx-auto mt-5 max-w-lg text-base text-muted-foreground sm:text-lg">Rask, dalyvauk, kaupk valandas ir kurk didesnį pokytį. Viskas vienoje vietoje.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="h-12 rounded-full px-7"><Link to={dash ? dash.to : "/register"}>{dash ? dash.label : "Pradėti dabar"}<ArrowRight /></Link></Button>
          <Button asChild size="lg" variant="outline" className="glass h-12 rounded-full px-7"><Link to="/tasks">{isAuthenticated ? "Visos veiklos" : "Rasti veiklą"}</Link></Button>
        </div>
      </div>
      <a href="#eiga" className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-xs text-muted-foreground">Slink žemyn<ArrowDown className="h-4 w-4 animate-bounce" /></a>
    </section>
    <section className="px-4 sm:px-6"><div className="glass mx-auto grid max-w-6xl grid-cols-2 rounded-3xl sm:grid-cols-4">{[{ v: counts?.hours, l: "Patvirtintų valandų" }, { v: counts?.students, l: "Mokinių" }, { v: counts?.orgs, l: "Organizacijų" }, { v: counts?.schools, l: "Mokyklų" }].map((s) => <div key={s.l} className="py-8 text-center"><p className="text-3xl font-bold tabular-nums text-primary sm:text-4xl">{fmt(s.v)}</p><p className="mt-2 text-xs text-muted-foreground">{s.l}</p></div>)}</div></section>
    <ScrollStory />
    <section className="px-4 py-20 sm:px-6"><div className="mx-auto max-w-6xl"><p className="text-xs font-semibold tracking-widest text-primary">KIEKVIENAM SAVO</p><h2 className="mt-3 text-3xl font-bold sm:text-4xl">Kam tai skirta?</h2>
      <div className="mt-10 grid gap-5 md:grid-cols-3">{ROLES.map((r) => <Link key={r.label} to={r.to} className="group glass rounded-2xl p-7 transition-all duration-200 hover:-translate-y-1 hover:border-primary/60"><p className="text-xs font-semibold text-primary">{r.label}</p><h3 className="mt-3 text-xl font-bold">{r.title}</h3><ul className="mt-5 space-y-2">{r.points.map((p) => <li key={p} className="flex items-center gap-2 text-sm text-muted-foreground"><Check className="h-4 w-4 text-success" />{p}</li>)}</ul><span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold">{r.cta}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span></Link>)}</div></div></section>
    <section className="px-4 py-12 sm:px-6"><div className="glass mx-auto flex rounded-3xl p-8 sm:p-10 max-w-6xl flex-wrap items-center justify-between gap-6"><div><p className="flex items-center gap-2 text-sm font-semibold text-primary"><ShieldCheck className="h-5 w-5" />SV Guard</p><h2 className="mt-2 text-2xl font-bold">Ramu tau. Sunku botams.</h2><p className="mt-2 max-w-xl text-sm text-muted-foreground">Vienkartinės patikros ir serverio tikrinami QR įrodymai veikia fone.</p></div><Button asChild variant="outline"><Link to="/securityguard">Apie apsaugą<ArrowRight /></Link></Button></div></section>
    <section className="px-4 py-20 sm:px-6" aria-labelledby="faq"><div className="glass mx-auto grid max-w-6xl gap-8 rounded-3xl p-8 md:grid-cols-[1fr_2fr]"><div><p className="text-xs font-semibold tracking-widest text-primary">VISKAS AIŠKU</p><h2 id="faq" className="mt-3 text-3xl font-bold">Dažni klausimai</h2><a href="mailto:pagalba@socialinesvalandos.dev" className="mt-5 inline-block break-all text-sm text-muted-foreground hover:text-primary">pagalba@socialinesvalandos.dev</a></div><div className="divide-y divide-border border-t border-border">{HOME_FAQ.map((f) => <details key={f.id} className="group py-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold">{f.q}<ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" /></summary><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p></details>)}</div></div></section>
    <section className="px-4 py-24 text-center sm:px-6"><div className="glass mx-auto max-w-3xl rounded-3xl p-10"><h2 className="text-3xl font-bold sm:text-4xl">Kitas geras darbas prasideda čia.</h2><p className="mt-3 text-sm text-muted-foreground">socialinesvalandos.dev · pagalba@socialinesvalandos.dev</p><Button asChild size="lg" className="mt-7 h-12 rounded-full px-7"><Link to="/tasks">Rasti veiklą<ArrowRight /></Link></Button></div></section>
  </div></PageShell>;
}
