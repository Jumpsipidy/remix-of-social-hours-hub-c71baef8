import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageShell, DASHBOARD_BY_ROLE } from "../components/layout";
import { getPublicStats } from "@/lib/public-stats.functions";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ArrowRight, Search, QrCode, FileCheck2, ShieldCheck, MapPin, Check, ChevronDown, Users, MessageCircle, GraduationCap, Building2, School, Heart, ArrowUpRight } from "lucide-react";

import { useSiteTheme } from "@/components/theme-provider";

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

const JOURNEY = [
  { icon: Search, label: "Rask", title: "Veikla, į kurią norisi eiti.", body: "Gyvūnai, renginiai ar pagalba bendruomenei — pasirink, kas tau artima.", to: "/tasks", cta: "Peržiūrėti veiklas" },
  { icon: Users, label: "Dalyvauk", title: "Geri darbai geriau kartu.", body: "Pakviesk draugus arba rinkis auklėtojos pasiūlytą veiklą. Organizacijos veikloje atvykimą patvirtink QR kodu.", to: "/register", cta: "Prisijungti prie bendruomenės" },
  { icon: FileCheck2, label: "Matyk rezultatą", title: "Ne lapeliuose. Tavo paskyroje.", body: "Organizacijos ar auklėtojos patvirtintos valandos papildo tavo progresą. Pažymėjimas — kai jo prireikia.", to: "/login", cta: "Mano valandos" },
] as const;

function ProductPreview() {
  const [step, setStep] = useState(0);
  const active = JOURNEY[step];
  return <section className="home-journey border-y border-border px-4 py-14 sm:px-6 sm:py-20" aria-labelledby="demo-title">
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-6"><div><p className="text-xs font-semibold text-primary">TAVO KELIAS</p><h2 id="demo-title" className="mt-3 max-w-xl text-3xl font-bold leading-tight sm:text-4xl">Išsirink. Sudalyvauk.<br /><span className="text-primary">Didžiuokis savimi.</span></h2></div><span className="font-mono text-sm text-muted-foreground">01 — 03</span></div>
      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <div><div role="tablist" aria-label="Veiklos eiga" className="grid grid-cols-3 border-b border-border">{JOURNEY.map((item, i) => <Button key={item.label} id={`journey-tab-${i}`} role="tab" aria-selected={i === step} aria-controls="journey-panel" variant="ghost" onClick={() => setStep(i)} className={`h-14 rounded-none border-b-2 px-2 text-xs sm:text-sm ${i === step ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}><item.icon className="h-4 w-4" />{item.label}</Button>)}</div><div role="tabpanel" id="journey-panel" aria-labelledby={`journey-tab-${step}`} className="min-h-64 pt-8"><h3 className="max-w-sm text-2xl font-semibold leading-tight">{active.title}</h3><p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">{active.body}</p><Button asChild variant="link" className="mt-5 px-0"><Link to={active.to}>{active.cta}<ArrowUpRight /></Link></Button></div></div>
        <div className="journey-canvas relative flex min-h-80 items-center justify-center overflow-hidden border border-border bg-background p-6 sm:p-10" aria-label="Veiklos kelio pavyzdys">
          <span className="journey-number absolute right-4 top-0 select-none font-bold text-primary/10" aria-hidden="true">0{step + 1}</span>
          <div key={step} className="demo-swap relative w-full max-w-sm">
            {step === 0 ? <><div className="flex h-12 items-center gap-3 border-b-2 border-primary bg-card px-3"><Search className="h-5 w-5 text-primary" /><span className="text-sm">gyvūnų prieglauda</span><ArrowRight className="ml-auto h-4 w-4 text-primary" /></div><article className="mt-5 rounded-lg border border-border bg-card p-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-success/10 text-success"><Heart className="h-5 w-5" /></span><div><p className="text-sm font-semibold">Pagalba gyvūnų prieglaudoje</p><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />Šeduva · pavyzdys</p></div></div><div className="mt-5 flex items-center justify-between border-t border-border pt-4"><span className="text-xs text-muted-foreground">Laisvas atvykimas</span><ArrowUpRight className="h-5 w-5 text-primary" /></div></article></> : step === 1 ? <div className="space-y-5"><div className="flex items-center justify-center -space-x-2">{[GraduationCap, Users, Heart].map((Icon, i) => <span key={i} className="grid h-16 w-16 place-items-center rounded-full border-4 border-background bg-secondary text-primary"><Icon className="h-6 w-6" /></span>)}</div><p className="text-center text-xl font-semibold">Susitinkam veikloje.</p><div className="flex items-center justify-between rounded-lg border border-border bg-card p-4"><div><p className="text-sm font-semibold">Atvykimas į organizaciją</p><p className="mt-1 text-xs text-muted-foreground">Kiekvienam — savas QR kodas</p></div><QrCode className="h-10 w-10 text-foreground" /></div><p className="text-center text-xs text-muted-foreground">Auklėtojos veikloms QR nereikia.</p></div> : <div><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-xs font-semibold text-success"><Check className="h-4 w-4" />PATVIRTINTA</span><FileCheck2 className="h-7 w-7 text-primary" /></div><p className="mt-6 text-5xl font-semibold tabular-nums">17<span className="text-xl text-muted-foreground"> / 20 val.</span></p><div className="mt-5 h-3 overflow-hidden rounded-full bg-muted"><div className="demo-progress h-full w-[85%] bg-primary" /></div><div className="mt-6 flex items-center gap-3 border-t border-border pt-5"><FileCheck2 className="h-5 w-5 text-primary" /><div><p className="text-sm font-semibold">Socialinių valandų pažymėjimas</p><p className="mt-1 text-xs text-muted-foreground">PDF · su autentiškumo patikra</p></div></div><p className="mt-5 text-xs text-muted-foreground">Progreso pavyzdys</p></div>}
          </div>
        </div>
      </div>
    </div>
  </section>;
}

const ROLE_TABS = [
  { label: "Mokiniams", icon: GraduationCap, number: "01", title: "Tavo veiklos. Tavo progresas.", body: "Rask veiklą, eik su draugais ir matyk patvirtintas valandas.", to: "/tasks", cta: "Rasti veiklą" },
  { label: "Organizacijoms", icon: Building2, number: "02", title: "Pagalba, kuri pasiekia jus.", body: "Skelbk veiklas, susisiek su savanoriais ir patvirtink jų indėlį.", to: "/register", cta: "Pateikti prašymą" },
  { label: "Mokykloms", icon: School, number: "03", title: "Klasė vienoje vietoje.", body: "Klasių kodai, mokinių progresas ir auklėtojos veiklų pasiūlymai.", to: "/socialines-valandos-mokykloms", cta: "Plačiau mokykloms" },
] as const;

function RoleTabs() {
  return <section className="px-4 py-14 sm:px-6 sm:py-20"><div className="mx-auto max-w-6xl"><p className="text-xs font-semibold text-primary">KIEKVIENAM SAVO ERDVĖ</p><h2 className="mt-3 text-3xl font-bold sm:text-4xl">Viena bendruomenė.<br />Trys perspektyvos.</h2><div className="mt-10 grid gap-8 md:grid-cols-3">{ROLE_TABS.map((role) => <article key={role.label} className="border-t border-border pt-6"><div className="flex items-center justify-between"><role.icon className="h-6 w-6 text-primary" /><span className="font-mono text-xs text-muted-foreground">{role.number}</span></div><p className="mt-6 text-xs font-semibold text-muted-foreground">{role.label}</p><h3 className="mt-2 text-xl font-semibold">{role.title}</h3><p className="mt-3 min-h-16 text-sm leading-relaxed text-muted-foreground">{role.body}</p><Button asChild variant="link" className="mt-4 px-0"><Link to={role.to}>{role.cta}<ArrowUpRight /></Link></Button></article>)}</div></div></section>;
}

function Home() {
  const { profile, isAuthenticated } = useAuth();
  const { data: counts } = useQuery({ queryKey: ["public-stats"], queryFn: () => getPublicStats({ headers: { "x-public-stats": "1" } }), staleTime: 60_000 });
  const dash = profile?.role ? DASHBOARD_BY_ROLE[profile.role] : null;
  const { openSettings } = useSiteTheme();
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => { entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add("has-entered"); observer.unobserve(entry.target); } }); }, { threshold: 0.12 });
    document.querySelectorAll(".home-saas [data-scroll-accent]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  const fmt = (n?: number) => n === undefined ? "—" : new Intl.NumberFormat("lt-LT").format(n);
  return <PageShell><div className="home-saas">
    <section className="home-ui-hero relative overflow-hidden px-4 sm:px-6" aria-labelledby="home-title">
      <div className="mx-auto max-w-6xl pt-10 sm:pt-16">
        <div className="flex items-center justify-between gap-4 text-xs font-medium text-muted-foreground"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-success" />Tavo geri darbai prasideda čia</span><Button variant="ghost" size="sm" onClick={openSettings} className="h-9 text-xs text-muted-foreground">Tavo tema<ArrowUpRight /></Button></div>
        <div className="hero-type py-9 text-center sm:py-12">
          <div className="home-brand-symbol mx-auto mb-5 flex w-fit items-center gap-3" aria-hidden="true"><span className="home-brand-line" /><Heart className="h-7 w-7 text-primary" fill="currentColor" /><span className="home-brand-line" /></div>
          <h1 id="home-title" className="home-brand-title"><span className="home-title-first">Socialinės</span><span className="home-title-second">Valandos<span className="home-title-dot">.</span></span></h1>
          <p className="home-tagline mt-5 text-xl font-semibold sm:text-2xl">Daryk gera. <span className="text-primary">Matyk progresą.</span></p>
          <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">Veiklos, draugai ir patvirtintos valandos — vienoje vietoje. Be popierių ir pasimetimo.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3"><Button asChild size="lg" className="h-12 px-6"><Link to={dash ? dash.to : "/tasks"}>{dash ? dash.label : "Rasti veiklą"}<ArrowUpRight /></Link></Button><Button asChild variant="outline" size="lg" className="h-12 px-6"><Link to={isAuthenticated ? "/tasks" : "/register"}>{isAuthenticated ? "Visos veiklos" : "Sukurti paskyrą"}</Link></Button></div>
          <p className="mt-5 text-xs text-muted-foreground">Nemokamai mokiniams, mokykloms ir organizacijoms</p>
        </div>
        <div className="hero-ui-flow grid gap-3 pb-8 sm:grid-cols-3 sm:gap-5" aria-label="Veiklos kelio pavyzdys">
          <article className="hero-ui-item relative rounded-lg border border-border bg-card p-5"><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-xs font-semibold text-primary"><Search className="h-4 w-4" />01 · VEIKLA</span><ArrowUpRight className="h-4 w-4 text-muted-foreground" /></div><h2 className="mt-5 text-base font-semibold">Gyvūnų prieglauda</h2><p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" />Šeduva<span className="ml-auto font-semibold text-success">3 val.</span></p><div className="mt-5 flex items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground"><Users className="h-4 w-4 text-primary" />Gali eiti ir su draugais</div></article>
          <article className="hero-ui-item rounded-lg border border-border bg-card p-5"><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-xs font-semibold text-primary"><QrCode className="h-4 w-4" />02 · ATVYKIMAS</span><Check className="h-4 w-4 text-success" /></div><div className="mt-5 flex items-center gap-4"><QrCode className="h-12 w-12 shrink-0 text-foreground" /><div><h2 className="text-base font-semibold">Tavo QR kodas</h2><p className="mt-1 text-xs text-muted-foreground">Atvykai. Parodei. Patvirtinta.</p></div></div><p className="mt-5 border-t border-border pt-3 text-xs text-muted-foreground">Kiekvienas draugas turi savo kodą</p></article>
          <article className="hero-ui-item rounded-lg border border-primary/40 bg-primary/5 p-5"><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-xs font-semibold text-primary"><FileCheck2 className="h-4 w-4" />03 · PROGRESAS</span><span className="text-[10px] text-muted-foreground">Pavyzdys</span></div><p className="mt-4 text-3xl font-bold">17<span className="text-base font-normal text-muted-foreground"> / 20 val.</span></p><div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="hero-hours-bar h-full w-[85%] rounded-full bg-primary" /></div><p className="mt-4 text-xs text-muted-foreground">Tik organizacijos patvirtintos valandos</p></article>
        </div>
      </div>
    </section>
    <nav aria-label="Pradžios puslapio skiltys" className="home-section-nav sticky top-[72px] z-30 border-y border-border bg-background/95"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4 overflow-x-auto px-4 sm:px-6"><div className="flex gap-5 whitespace-nowrap text-xs font-semibold"><a href="#eiga" className="py-4 text-muted-foreground hover:text-primary">Kaip veikia</a><a href="#svarbu" className="py-4 text-muted-foreground hover:text-primary">Svarbu žinoti</a><a href="#apsauga" className="py-4 text-muted-foreground hover:text-primary">Apsauga</a><a href="#faq" className="py-4 text-muted-foreground hover:text-primary">Klausimai</a></div><ShieldCheck className="hidden h-4 w-4 shrink-0 text-primary sm:block" /></div></nav>
    <section className="border-t border-border bg-background px-4 sm:px-6"><div className="mx-auto grid max-w-6xl grid-cols-2 sm:grid-cols-4">{[{v:counts?.hours,l:"Patvirtintų valandų"},{v:counts?.students,l:"Mokinių"},{v:counts?.orgs,l:"Organizacijų"},{v:counts?.schools,l:"Mokyklų"}].map((s)=><div key={s.l} className="py-7 sm:py-9"><p className="text-3xl font-bold tabular-nums">{fmt(s.v)}</p><p className="mt-2 text-xs text-muted-foreground">{s.l}</p></div>)}</div></section>
    <div id="eiga" className="home-anchor" data-scroll-accent><ProductPreview /></div>
    <section id="svarbu" data-scroll-accent className="home-anchor border-b border-border px-4 py-12 sm:px-6 sm:py-16"><div className="mx-auto max-w-6xl"><p className="text-xs font-semibold text-primary">BE NEMALONIŲ STAIGMENŲ</p><h2 className="mt-3 text-2xl font-bold sm:text-3xl">Trys dalykai, kuriuos verta žinoti.</h2><div className="mt-8 grid gap-7 md:grid-cols-3">{[{n:"01",i:GraduationCap,t:"Klasė jau tavo kode",d:"Registruojantis klasę ir privalomas valandas nustato klasės kodas. Jo paprašyk auklėtojos."},{n:"02",i:Check,t:"Valandos turi būti patvirtintos",d:"Atlikus veiklą, organizacija patvirtina suteikiamas valandas. Tik tada jos papildo tavo progresą."},{n:"03",i:FileCheck2,t:"Pažymėjimas su patikra",d:"Patvirtintas valandas gali atsisiųsti PDF. Mokykla gali patikrinti pažymėjimo autentiškumą."}].map((x)=><div key={x.n} className="scroll-fact border-t-2 border-border pt-5"><div className="flex items-center justify-between"><x.i className="h-5 w-5 text-primary" /><span className="font-mono text-xs text-muted-foreground">{x.n}</span></div><h3 className="mt-4 text-lg font-semibold">{x.t}</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{x.d}</p></div>)}</div></div></section>
    <RoleTabs />
    <section id="apsauga" data-scroll-accent className="home-anchor border-y border-border bg-muted/30 px-4 py-12 sm:px-6"><div className="mx-auto grid max-w-6xl items-center gap-8 md:grid-cols-[1fr_auto]"><div><p className="flex items-center gap-2 text-sm font-semibold text-primary"><ShieldCheck className="h-5 w-5" /> SV Guard</p><h2 className="mt-3 text-2xl font-bold">Ramu tau. Sunku botams.</h2><p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">Vienkartinės patikros ir serverio tikrinami QR įrodymai. Apsauga veikia fone; prireikus — trumpa, aiški patikra.</p></div><Button asChild variant="outline"><Link to="/securityguard">Apie apsaugą<ArrowRight /></Link></Button></div></section>
    <section className="px-4 py-14 sm:px-6 sm:py-20" aria-labelledby="faq"><div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[1fr_2fr]"><div><p className="text-xs font-semibold text-primary">VISKAS AIŠKU</p><h2 id="faq" className="mt-3 text-3xl font-bold">Dažni klausimai</h2><a href="mailto:pagalba@socialinesvalandos.dev" className="mt-5 inline-block break-all text-sm text-muted-foreground hover:text-primary">pagalba@socialinesvalandos.dev</a></div><div className="divide-y divide-border border-t border-border">{HOME_FAQ.map((f)=><details key={f.id} className="group py-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold">{f.q}<ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" /></summary><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p></details>)}</div></div></section>
    <section className="border-t border-border px-4 py-12 sm:px-6"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6"><div><h2 className="text-2xl font-bold">Kitas geras darbas prasideda čia.</h2><p className="mt-3 text-sm text-muted-foreground">socialinesvalandos.dev · pagalba@socialinesvalandos.dev</p></div><Button asChild size="lg"><Link to="/tasks">Rasti veiklą<ArrowUpRight /></Link></Button></div></section>
  </div></PageShell>;
}
