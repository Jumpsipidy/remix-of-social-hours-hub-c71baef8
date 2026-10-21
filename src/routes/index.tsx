import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageShell, DASHBOARD_BY_ROLE } from "../components/layout";
import { getPublicStats } from "@/lib/public-stats.functions";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ArrowRight, Search, QrCode, FileCheck2, ShieldCheck, MapPin, Clock, Check, ChevronDown, Users, MessageCircle, Flame, GraduationCap, Building2, School, Play, RotateCcw, Heart, ArrowUpRight } from "lucide-react";

import volunteerPhoto from "@/assets/home-volunteers.jpg";

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

const DEMO_QUERY = "gyvūnų prieglauda";

function ProductPreview() {
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(0);
  const [text, setText] = useState("");
  useEffect(() => {
    if (!playing) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setText(DEMO_QUERY); setStep(2); setPlaying(false); return; }
    let tick = 0;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      tick += 1;
      setText(DEMO_QUERY.slice(0, tick));
      if (tick > 25) setStep(1);
      if (tick > 42) setStep(2);
      if (tick > 55) { setPlaying(false); window.clearInterval(timer); }
    }, 70);
    return () => window.clearInterval(timer);
  }, [playing]);
  const start = () => { setStep(0); setText(""); setPlaying(true); };
  return <section className="product-demo-band border-y border-border bg-card/70 px-4 py-10 sm:px-6 sm:py-14" aria-labelledby="demo-title">
    <div className="mx-auto max-w-6xl">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-semibold text-primary">NUO VEIKLOS IKI PAŽYMĖJIMO</p><h2 id="demo-title" className="mt-2 text-2xl font-bold sm:text-3xl">Mažiau rūpesčių. Daugiau gerų darbų.</h2></div>
        <Button variant="outline" onClick={start} disabled={playing}>{step === 2 ? <RotateCcw /> : <Play />}{step === 2 ? "Pakartoti" : "Pamatyti eigą"}</Button>
      </div>
      <div className="product-workspace grid overflow-hidden rounded-lg border border-border bg-background shadow-elegant md:grid-cols-[200px_minmax(0,1fr)]">
        <aside className="hidden border-r border-border bg-muted/35 p-5 md:block"><div className="flex items-center gap-2 text-sm font-bold"><Heart className="h-4 w-4 text-primary" /> Mano erdvė</div><div className="mt-6 space-y-2">{[{i:Search,t:"Veiklos"},{i:QrCode,t:"Rezervacijos"},{i:FileCheck2,t:"Pažymėjimas"}].map((x,i)=><div key={x.t} className={`flex items-center gap-2 rounded-md px-3 py-2.5 text-sm ${step === i ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground"}`}><x.i className="h-4 w-4" />{x.t}</div>)}</div><p className="mt-14 flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4" /> SV Guard</p></aside>
        <div className="min-w-0 p-5 sm:p-8">
          <div className="mb-5 flex items-center justify-between gap-3"><h3 className="font-semibold">{step === 0 ? "Rask savo veiklą" : step === 1 ? "Mano rezervacijos" : "Mano valandos"}</h3><span className="font-mono text-xs text-muted-foreground">0{step + 1} / 03</span></div>
          <div className="demo-stage">
            {step === 0 ? <div><div className="flex h-12 items-center gap-3 rounded-md border border-border bg-card px-4"><Search className="h-4 w-4 text-primary" /><span className={`text-sm ${text ? "text-foreground" : "text-muted-foreground"}`}>{text || "Ieškoti veiklos…"}</span>{playing && <span className="home-caret h-4 w-px bg-primary" />}</div><div className="mt-4 flex items-center justify-between gap-4 rounded-md border border-border p-4"><div><p className="text-sm font-semibold">Pagalba gyvūnų prieglaudoje</p><p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />Šeduva · 3 val.</p></div><span className="rounded-md bg-primary/10 px-3 py-2 text-xs font-bold text-primary">Rezervuoti</span></div></div> : step === 1 ? <div className="demo-swap flex items-center gap-5 py-5"><QrCode className="h-20 w-20 shrink-0 text-foreground" /><div><p className="text-lg font-semibold">Vieta rezervuota</p><p className="mt-2 text-sm text-muted-foreground">Pagalba gyvūnų prieglaudoje</p><p className="mt-4 flex items-center gap-2 text-xs font-semibold text-success"><Check className="h-4 w-4" />Atvykus — tavo QR kodas</p></div></div> : <div className="demo-swap py-4"><div className="flex items-end justify-between"><p className="text-3xl font-bold">17 <span className="text-lg font-normal text-muted-foreground">/ 20 val.</span></p><FileCheck2 className="h-8 w-8 text-primary" /></div><div className="mt-5 h-2 rounded-full bg-muted"><div className="demo-progress h-full w-[85%] rounded-full bg-primary" /></div><p className="mt-5 text-sm text-muted-foreground">Patvirtintos valandos — viename pažymėjime.</p></div>}
          </div>
          <div className="mt-5 flex flex-wrap gap-4 border-t border-border pt-4 text-xs text-muted-foreground"><span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />Su draugais</span><span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" />Su auklėtoja</span><span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" />Patikrinamas pažymėjimas</span></div>
        </div>
      </div>
    </div>
  </section>;
}

const ROLE_TABS = [
  { id: "student", label: "Mokiniams", icon: GraduationCap, title: "Tavo geri darbai turi savo vietą.", points: ["Veiklos šalia tavęs", "Rezervacijos su draugais", "Valandos ir pažymėjimas"], to: "/tasks", cta: "Rasti veiklą" },
  { id: "org", label: "Organizacijoms", icon: Building2, title: "Daugiau pagalbos. Mažiau apskaitos.", points: ["Užduotys ir savanoriai", "Atvykimo patikra QR kodu", "Patvirtintos valandos"], to: "/register", cta: "Sukurti paskyrą" },
  { id: "school", label: "Mokykloms", icon: School, title: "Visa klasė — aiškiai ir ramiai.", points: ["Atskiri klasių kodai", "Tik priskirtų klasių mokiniai", "Kvietimai ir pokalbiai"], to: "/socialines-valandos-mokykloms", cta: "Plačiau mokykloms" },
] as const;

function RoleTabs() {
  const [tab, setTab] = useState<(typeof ROLE_TABS)[number]["id"]>("student");
  const r = ROLE_TABS.find((x) => x.id === tab) ?? ROLE_TABS[0];
  return <section className="px-4 py-14 sm:px-6 sm:py-20"><div className="mx-auto max-w-6xl"><div role="tablist" aria-label="Kam skirta" className="flex flex-wrap gap-2 border-b border-border pb-4">{ROLE_TABS.map((t)=><Button key={t.id} variant={tab === t.id ? "secondary" : "ghost"} role="tab" aria-selected={tab === t.id} onClick={()=>setTab(t.id)}><t.icon />{t.label}</Button>)}</div><div key={r.id} role="tabpanel" className="demo-swap mt-8 grid gap-8 md:grid-cols-2"><div><h2 className="max-w-lg text-3xl font-bold leading-tight">{r.title}</h2><Button asChild variant="link" className="mt-5 px-0"><Link to={r.to}>{r.cta}<ArrowRight /></Link></Button></div><ul className="divide-y divide-border">{r.points.map((x)=><li key={x} className="flex items-center gap-3 py-4 text-sm font-medium"><Check className="h-4 w-4 text-primary" />{x}</li>)}</ul></div></div></section>;
}

function Home() {
  const { profile, isAuthenticated } = useAuth();
  const { data: counts } = useQuery({ queryKey: ["public-stats"], queryFn: () => getPublicStats(), staleTime: 60_000 });
  const dash = profile?.role ? DASHBOARD_BY_ROLE[profile.role] : null;
  const fmt = (n?: number) => n === undefined ? "—" : new Intl.NumberFormat("lt-LT").format(n);
  return <PageShell><div className="home-saas">
    <section className="home-photo-hero relative overflow-hidden" aria-labelledby="home-title">
      <img src={volunteerPhoto} alt="Mokiniai kartu sodina augalus bendruomenės parke" width={1920} height={1024} fetchPriority="high" className="hero-photo absolute inset-0 h-full w-full object-cover" />
      <div aria-hidden className="hero-photo-wash absolute inset-0" />
      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="hero-copy max-w-xl">
          <p className="mb-5 flex items-center gap-2 text-xs font-semibold text-primary"><Heart className="h-4 w-4" /> GERI DARBAI. TIKROS VALANDOS.</p>
          <h1 id="home-title" className="text-4xl font-bold leading-[1.1] sm:text-6xl">Socialinės<br />Valandos<span className="text-primary">.</span></h1>
          <p className="mt-5 max-w-sm text-base leading-relaxed text-muted-foreground sm:text-lg">Rask savo veiklą. Prisijunk su draugais. Valandas palik mums.</p>
          <div className="mt-7 flex flex-wrap gap-3"><Button asChild size="lg" className="h-12 px-6"><Link to={dash ? dash.to : "/tasks"}>{dash ? dash.label : "Rasti veiklą"}<ArrowUpRight /></Link></Button><Button asChild variant="outline" size="lg" className="h-12 px-6"><Link to={isAuthenticated ? "/tasks" : "/register"}>{isAuthenticated ? "Visos veiklos" : "Sukurti paskyrą"}</Link></Button></div>
          <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 text-primary" />Nemokamai · mokiniams, mokykloms ir organizacijoms</p>
        </div>
      </div>
    </section>
    <section className="border-t border-border bg-background px-4 sm:px-6"><div className="mx-auto grid max-w-6xl grid-cols-2 sm:grid-cols-4">{[{v:counts?.hours,l:"Patvirtintų valandų"},{v:counts?.students,l:"Mokinių"},{v:counts?.orgs,l:"Organizacijų"},{v:counts?.schools,l:"Mokyklų"}].map((s)=><div key={s.l} className="py-7 sm:py-9"><p className="text-3xl font-bold tabular-nums">{fmt(s.v)}</p><p className="mt-2 text-xs text-muted-foreground">{s.l}</p></div>)}</div></section>
    <ProductPreview />
    <RoleTabs />
    <section className="border-y border-border bg-muted/30 px-4 py-12 sm:px-6"><div className="mx-auto grid max-w-6xl items-center gap-8 md:grid-cols-[1fr_auto]"><div><p className="flex items-center gap-2 text-sm font-semibold text-primary"><ShieldCheck className="h-5 w-5" /> SV Guard</p><h2 className="mt-3 text-2xl font-bold">Ramu tau. Sunku botams.</h2><p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">Vienkartinės patikros ir serverio tikrinami QR įrodymai. Apsauga veikia fone; prireikus — trumpa, aiški patikra.</p></div><Button asChild variant="outline"><Link to="/securityguard">Apie apsaugą<ArrowRight /></Link></Button></div></section>
    <section className="px-4 py-14 sm:px-6 sm:py-20" aria-labelledby="faq"><div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[1fr_2fr]"><div><p className="text-xs font-semibold text-primary">VISKAS AIŠKU</p><h2 id="faq" className="mt-3 text-3xl font-bold">Dažni klausimai</h2><a href="mailto:pagalba@socialinesvalandos.dev" className="mt-5 inline-block break-all text-sm text-muted-foreground hover:text-primary">pagalba@socialinesvalandos.dev</a></div><div className="divide-y divide-border border-t border-border">{HOME_FAQ.map((f)=><details key={f.id} className="group py-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold">{f.q}<ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" /></summary><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p></details>)}</div></div></section>
    <section className="border-t border-border px-4 py-12 sm:px-6"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6"><div><h2 className="text-2xl font-bold">Kitas geras darbas prasideda čia.</h2><p className="mt-3 text-sm text-muted-foreground">socialinesvalandos.dev · pagalba@socialinesvalandos.dev</p></div><Button asChild size="lg"><Link to="/tasks">Rasti veiklą<ArrowUpRight /></Link></Button></div></section>
  </div></PageShell>;
}
