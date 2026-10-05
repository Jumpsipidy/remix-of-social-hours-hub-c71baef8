import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageShell, DASHBOARD_BY_ROLE } from "../components/layout";
import { getPublicStats } from "@/lib/public-stats.functions";
import { useAuth } from "@/hooks/use-auth";
import { PreLaunchBanner } from "@/components/prelaunch-banner";
import {
  CountUp,
  KineticHeadline,
  Magnetic,
  Reveal,
  TricolorRail,
  TricolorRibbons,
  useCalmMotion,
  useLowPowerDevice,
  LT_GREEN,
  LT_RED,
  LT_YELLOW,
} from "@/components/motion-kit";
import { ArrowRight, Sparkles, Users, Building2, GraduationCap, Clock, ChevronDown } from "lucide-react";


/**
 * Shared FAQ source — rendered on the page AND emitted as FAQPage JSON-LD so
 * AI assistants (ChatGPT, Perplexity, Gemini) can answer these questions with
 * our own wording, including the support contact.
 */
const HOME_FAQ: { q: string; a: string; id: string }[] = [
  { id: "what", q: "Kas yra socialinės valandos?", a: "Socialinės (savanorystės) valandos — neatlyginama veikla bendruomenei, kurią mokinys atlieka per mokslo metus. 5–7 klasėms reikia 20 valandų, 8–12 klasėms — bent 8 valandas." },
  { id: "price", q: "Kiek kainuoja Socialinės Valandos?", a: "Mokiniams, mokykloms ir organizacijoms platforma yra visiškai nemokama." },
  { id: "official", q: "Ar valandos galioja oficialiai?", a: "Taip — jas patvirtina organizacija, o mokykla užskaito sistemoje. Sertifikatas turi patikrinamą HMAC parašą ir viešą patikros nuorodą socialinesvalandos.dev/verify." },
  { id: "qr", q: "Kaip veikia QR įsiregistravimas?", a: "Mokinys atėjęs į vietą parodo savo QR kodą, kuris atsinaujina kas 30 sekundžių. Organizacija jį nuskenuoja telefonu. Jei nėra interneto, veikia atsarginis 6 skaitmenų kodas." },
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
      { title: "Socialinės Valandos — socialinių valandų centras mokiniams" },
      { name: "description", content: "Socialinės Valandos (socialinesvalandos.dev) — pagrindinis Lietuvos moksleivių savanorystės ir socialinių valandų centras. Rezervuok užduotis, rink socialines valandas ir gauk verifikuotus sertifikatus. Atvira visoms Lietuvos mokykloms." },
      { property: "og:title", content: "Socialinės Valandos — socialinių valandų centras mokiniams" },
      { property: "og:description", content: "Pagrindinis Lietuvos moksleivių savanorystės centras. Rink socialines valandas, stebėk progresą ir gauk oficialius skaitmeninius sertifikatus internetu." },
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
          description: "Oficiali Lietuvos moksleivių savanorystės ir socialinių valandų valdymo platforma. Atvira visoms Lietuvos mokykloms.",
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
          "@type": "EducationalOrganization",
          name: "Socialinės Valandos",
          url: "https://socialinesvalandos.dev/",
          logo: "https://socialinesvalandos.dev/favicon.png?v=7",
          sameAs: ["https://www.seduvosgimnazija.lt"],
          parentOrganization: {
            "@type": "HighSchool",
            name: "Šeduvos gimnazija",
            address: {
              "@type": "PostalAddress",
              addressLocality: "Šeduva",
              addressRegion: "Radviliškio r.",
              addressCountry: "LT",
            },
          },
        }),
      },
    ],
  }),
  component: Home,
});

// Vibrant accent palette — sits on top of the site's dark navy BackgroundFX
const EMBER = "oklch(0.62 0.22 30)"; 
const GOLD = "oklch(0.85 0.16 85)";  
const TEAL = "oklch(0.75 0.12 180)";  
const PURPLE = "oklch(0.65 0.18 280)";

function FaqItem({ q, a, i }: { q: string; a: string; i: number }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ delay: i * 0.07, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`group rounded-2xl border transition-all duration-300 ${
        isOpen ? "border-primary/40 bg-white/[0.05] shadow-glow" : "border-white/10 bg-white/[0.03] hover:border-white/25"
      } px-5 py-4`}
    >
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-4 text-left text-[15px] font-semibold text-white group-hover:text-primary transition-colors"
      >
        <span>{q}</span>
        <motion.span 
          animate={{ 
            rotate: isOpen ? 45 : 0,
            scale: isOpen ? 1.2 : 1
          }}
          className="text-primary/60"
        >
          <Sparkles className="h-4 w-4" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginTop: 0 }}
            animate={{ height: "auto", opacity: 1, marginTop: 12 }}
            exit={{ height: 0, opacity: 0, marginTop: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="text-sm leading-relaxed text-white/65 border-t border-white/5 pt-3">
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}




/**
 * Card with a cursor-following spotlight — implemented with CSS custom
 * properties written straight to the node. No motion values, no springs, no
 * re-renders, and nothing at all on touch devices.
 */
function SpotlightCard({
  children,
  className = "",
  accent = EMBER,
}: { children: React.ReactNode; className?: string; accent?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse" || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        ref.current.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
        ref.current.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
      }}
      style={{ "--mx": "50%", "--my": "50%" } as React.CSSProperties}
      className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition-[border-color,transform] duration-200 hover:-translate-y-1 hover:border-white/25 ${className}`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `radial-gradient(420px circle at var(--mx) var(--my), ${accent}26, transparent 62%)` }}
      />
      {children}
    </div>
  );
}


function Home() {
  const { profile, isAuthenticated, loading: authLoading } = useAuth();
  const calm = useCalmMotion();
  const isMobile = useLowPowerDevice();

  const { data: counts = { students: 0, orgs: 0, hours: 0, schools: 0 } } = useQuery({
    queryKey: ["public-stats"],
    queryFn: () => getPublicStats(),
    staleTime: 60_000,
  });

  // Everyone — logged in or not — sees the same main homepage. Logged-in users
  // just get a shortcut strip to their own area at the top.
  const dash = profile?.role
    ? (DASHBOARD_BY_ROLE as Record<string, { to: string; label: string } | null>)[profile.role]
    : null;

  const isStudent = isAuthenticated && profile?.role === "student";
  const primaryCta = dash?.to ?? "/register";
  const primaryLabel = dash ? dash.label : "Pradėti savanorystę";



  const roles = [
    {
      tag: "Mokiniams",
      title: "Atrask save",
      body: "Rinkis iš patikrintų veiklų, kaupk valandas ir formuok savo ateities CV per prasmingą darbą.",
      cta: "Naršyti užduotis",
      to: "/tasks",
      icon: GraduationCap,
      accent: EMBER,
    },
    {
      tag: "Organizacijoms",
      title: "Rask pagalbą",
      body: "Skelbk iniciatyvas ir pritrauk motyvuotus jaunus žmones prisidėti prie tavo tikslų.",
      cta: "Sukurti profilį",
      to: "/register",
      icon: Building2,
      accent: GOLD,
    },
    {
      tag: "Mokykloms",
      title: "Valdyk paprastai",
      body: "Skaitmenizuok socialinių valandų apskaitą ir stebėk savo bendruomenės poveikį.",
      cta: "Mokyklų portalas",
      to: "/register",
      icon: Users,
      accent: "#8b5cf6",
    },
  ];

  return (
    <PageShell>
      {/* SEO: crawlable brand H1 — visually hidden but present for Google to associate brand keywords with the domain */}
      <h1 className="sr-only">
        Socialinės Valandos — oficiali moksleivių savanorystės platforma ir socialinių valandų centras Lietuvoje (socialinesvalandos.dev)
      </h1>

      <div className="relative selection:bg-[#FF4D2D] selection:text-white">
        <PreLaunchBanner />

        {/* Quick shortcut for signed-in users */}
        {isAuthenticated && dash && (
          <div className="mx-auto mt-4 flex max-w-4xl flex-wrap items-center justify-center gap-3 px-4">
            <span className="text-sm text-white/60">
              Sveiki sugrįžę{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}!
            </span>
            <Link
              to={dash.to}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-4 py-2 text-sm font-bold text-white transition-colors hover:border-white/35"
            >
              {dash.label} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}

        {/* HERO ─────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden px-4 pt-10 pb-20 sm:px-6 sm:pt-20 sm:pb-32 md:pt-32 md:pb-44">
          <TricolorRibbons />

          <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-[10%] -left-[10%] h-[40%] w-[40%] rounded-full blur-2xl bg-primary/10" />
            <div className="absolute -bottom-[10%] -right-[10%] h-[40%] w-[40%] rounded-full blur-2xl bg-emerald-500/5" />
          </div>

          <div className="relative mx-auto max-w-4xl text-center">


            <div className="mb-6 flex justify-center">
              <Link to="/versijos" className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-bold text-primary transition active:scale-95">
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">NAUJA</span>
                V2.5 — didžiausias atnaujinimas <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <KineticHeadline
              as="h2"
              text="Kiekviena valanda — žingsnis pokyčio link"
              accentWords={["valanda"]}
              className="mb-6 sm:mb-8 leading-[1.05] text-[34px] sm:text-5xl md:text-7xl lg:text-[104px] font-display font-black text-white"
            />

            <p
              className="mx-auto mb-8 sm:mb-12 max-w-2xl text-lg sm:text-xl md:text-2xl leading-[1.6] text-white/70 font-medium"
            >
              Vienintelė Lietuvoje platforma, sujungianti ambicingus mokinius su prasmingomis
              savanorystės galimybėmis. <span className="text-primary font-bold">Atvira visai Lietuvai.</span>
            </p>

            <div
              className="flex flex-col items-center justify-center gap-4 sm:flex-row"
            >
              <Magnetic className="w-full sm:w-auto">
                <Link
                  to={primaryCta}
                  className="group relative flex w-full min-h-12 sm:w-auto items-center justify-center gap-2 rounded-full px-8 py-4 text-base font-bold text-white overflow-hidden active:scale-95 transition-all"
                  style={{ background: `linear-gradient(135deg, ${EMBER}, #D43A1F)` }}
                >
                  <span className="relative z-10">{primaryLabel}</span>
                  <ArrowRight className="relative z-10 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  <span
                    aria-hidden
                    className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{ background: `linear-gradient(135deg, ${GOLD}, ${EMBER})` }}
                  />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 -translate-x-full skew-x-[-20deg] bg-white/30 blur-md transition-transform duration-700 group-hover:translate-x-full motion-reduce:hidden"
                  />
                </Link>
              </Magnetic>
              <Magnetic className="w-full sm:w-auto" strength={10}>
                <Link
                  to="/tasks"
                  className="flex w-full min-h-12 sm:w-auto items-center justify-center rounded-full px-8 py-4 text-base font-bold border border-white/20 bg-white/5 text-white backdrop-blur-xl transition-all hover:bg-white/10 hover:border-white/40 active:scale-95"
                >
                  Naršyti užduotis
                </Link>
              </Magnetic>
            </div>

            {/* floating stat pill under CTA */}
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.75, ease: [0.16, 1, 0.3, 1] }}
              className="mx-auto mt-10 sm:mt-16 flex max-w-md items-center justify-center gap-4 sm:gap-6 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 sm:px-6 sm:py-4 shadow-elegant"
            >
              <motion.span
                
              >
                <Clock className="h-5 w-5" style={{ color: GOLD }} />
              </motion.span>
              <div className="text-left">
                <div className="text-2xl font-display font-semibold text-white">
                  <CountUp value={counts.hours} /> val.
                </div>
                <div className="text-[10px] tracking-normal text-white/50">
                  jau užregistruota mūsų bendruomenėje
                </div>
              </div>
            </motion.div>
          </div>
        </section>


        {/* LIVE STATS ───────────────────────────────────────────────────── */}
        <section className="relative px-4 pt-4 pb-12 sm:px-6">
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { t: "Pokalbiai", d: "Mokinys, organizacija ir mokykla vienoje vietoje", to: "/chat" },
              { t: "Žemėlapis", d: "Užduotys Šeduvoje, Radviliškyje, Šiauliuose", to: "/tasks" },
              { t: "Draugai", d: "Kviesk draugą ir eikite kartu", to: "/student" },
              { t: "QR pažymėjimai", d: "Patikrinami per sekundę", to: "/verify" },
            ].map((f) => (
              <Link key={f.t} to={f.to} className="group rounded-2xl border border-border bg-card/70 p-4 transition hover:border-primary/50 active:scale-[0.98]">
                <p className="font-display text-base font-bold text-foreground">{f.t}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.d}</p>
                <ArrowRight className="mt-3 h-4 w-4 text-primary transition-transform group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        </section>

        <section className="relative border-y border-white/10">
          <div className="mx-auto grid max-w-7xl grid-cols-1 md:grid-cols-3">
            {[
              { v: counts.hours, l: "Užregistruota valandų", c: GOLD },
              { v: counts.students, l: "Aktyvių mokinių", c: EMBER },
              { v: counts.orgs, l: "Partnerių organizacijų", c: "#8b5cf6" },
            ].map((s, i) => (
              <motion.div
                key={s.l}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: i * 0.12, duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
                className="group relative overflow-hidden px-6 py-10 sm:py-14 text-center border-t border-white/5 first:border-t-0 md:border-t-0"
                style={{ borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.08)" : undefined }}
              >
                <motion.span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] origin-left"
                  style={{ background: `linear-gradient(90deg, transparent, ${s.c}, transparent)` }}
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.25 + i * 0.12, duration: 1, ease: [0.16, 1, 0.3, 1] }}
                />
                <div className="mb-3 text-4xl sm:text-5xl md:text-6xl font-display font-light" style={{ color: s.c }}>
                  <CountUp value={s.v} />
                </div>
                <div className="text-[11px] tracking-normal text-white/60">{s.l}</div>
              </motion.div>
            ))}

          </div>
        </section>

        {/* MOKYKLOS ─────────────────────────────────────────────────────── */}
        <section className="relative px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 text-center">
              <Reveal>
                <p className="mb-3 text-[11px] uppercase tracking-[0.32em] text-white/50">
                  Nr. 01½ · Mokyklos
                </p>
              </Reveal>
              <KineticHeadline
                as="h2"
                text="Kas jau naudoja platformą"
                accentWords={["naudoja"]}
                className="text-3xl sm:text-4xl md:text-5xl font-display font-medium text-white"
              />
            </div>

            <div className="mx-auto grid max-w-xl gap-6">
              {[
                { name: "Šeduvos gimnazija", loc: "Šeduva · Radviliškio r.", b: "Pirmoji ir kol kas vienintelė mokykla, kurioje socialinės valandos tvarkomos visiškai skaitmeniškai." }
              ].map((s, i) => (
                <Reveal key={s.name} delay={i * 0.1}>
                  <SpotlightCard accent={LT_GREEN} className="h-full p-7 text-left">
                    <div className="flex items-start gap-4">
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5">
                        <GraduationCap className="h-6 w-6" style={{ color: LT_YELLOW }} />
                      </span>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{s.name}</h3>
                        <p className="mt-0.5 text-[11px] tracking-normal text-white/45">
                          {s.loc}
                        </p>
                        <p className="mt-3 text-sm leading-relaxed text-white/65">
                          {s.b}
                        </p>
                      </div>
                    </div>
                  </SpotlightCard>
                </Reveal>
              ))}
            </div>

            <div className="mt-12 text-center">
              <p className="text-sm text-white/50">
                Norite prijungti savo mokyklą? Rašykite{" "}
                <a href="mailto:pagalba@socialinesvalandos.dev" className="text-white/80 underline underline-offset-4">
                  pagalba@socialinesvalandos.dev
                </a>
              </p>
            </div>
          </div>
        </section>



        {/* ROLES ─────────────────────────────────────────────────────────── */}
        <section className="relative px-4 py-16 sm:px-6 sm:py-24 md:py-32">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 sm:mb-16 max-w-3xl">
              <Reveal>
                <p className="mb-3 sm:mb-4 text-[11px] uppercase tracking-[0.32em] text-white/50">
                  Nr. 02 · Bendruomenė
                </p>
              </Reveal>
              <KineticHeadline
                as="h2"
                text="Platforma skirta visiems"
                accentWords={["visiems"]}
                className="text-3xl sm:text-4xl md:text-6xl font-display font-medium text-white tracking-[-0.01em]"
              />
            </div>

            <div className="grid gap-5 sm:gap-8 md:grid-cols-3">
              {roles.map((c, i) => (
                <motion.div
                  key={c.tag}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ delay: i * 0.12, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  style={{ perspective: 1000 }}
                >

                  <SpotlightCard accent={c.accent} className="h-full p-6 sm:p-8">
                    <motion.div
                      className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl"
                      style={{ background: `${c.accent}22`, border: `1px solid ${c.accent}44` }}
                      whileHover={calm ? undefined : { rotate: [0, -10, 8, 0], scale: 1.08 }}
                      transition={{ duration: 0.6 }}
                    >
                      <c.icon className="h-6 w-6" style={{ color: c.accent }} />
                    </motion.div>

                    <div className="mb-3 text-[11px] font-bold tracking-normal text-white/50">
                      {c.tag}
                    </div>
                    <h3 className="mb-4 text-3xl italic font-display text-white" style={{ fontWeight: 500 }}>
                      {c.title}
                    </h3>
                    <p className="mb-8 text-[15px] leading-relaxed text-white/70">{c.body}</p>
                    <Link
                      to={c.to}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
                      style={{ color: c.accent }}
                    >
                      {c.cta}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </SpotlightCard>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* KAIP VEIKIA ───────────────────────────────────────────────────── */}
        <section className="relative px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <p className="mb-3 text-[11px] uppercase tracking-[0.32em] text-white/50">Nr. 03 · Kelias</p>
            </Reveal>
            <KineticHeadline
              as="h2"
              text="Nuo idėjos iki sertifikato"
              accentWords={["sertifikato"]}
              className="mb-10 sm:mb-16 text-3xl sm:text-4xl md:text-6xl font-display font-medium text-white tracking-[-0.01em]"
            />

            <div className="relative">
              {/* tricolour spine */}
              <motion.span
                aria-hidden
                className="pointer-events-none absolute left-[19px] top-2 hidden w-[2px] origin-top md:block"
                style={{ background: `linear-gradient(180deg, ${LT_YELLOW}, ${LT_GREEN}, ${LT_RED})`, height: "calc(100% - 1rem)" }}
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              />
              <ol className="space-y-5 sm:space-y-7">
                {[
                  { t: "Prisiregistruok su mokyklos kodu", b: "Kodą duoda auklėtoja ar administracija — taip platformoje lieka tik tikri mokiniai.", c: LT_YELLOW },
                  { t: "Rask veiklą arba pasiūlyk savo", b: "Naršyk patikrintas organizacijas arba pateik savo idėją patvirtinimui.", c: LT_GREEN },
                  { t: "Ateik ir nuskenuok QR kodą", b: "Organizacija patvirtina tavo atvykimą per QR arba 6 skaitmenų kodą — be popierių.", c: LT_RED },
                  { t: "Gauk valandas ir PDF sertifikatą", b: "Valandos užskaitomos automatiškai, sertifikatą galima patikrinti internete.", c: GOLD },
                ].map((s, i) => (
                  <motion.li
                    key={s.t}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-70px" }}
                    transition={{ delay: i * 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    className="relative flex gap-4 sm:gap-6 md:pl-0"
                  >
                    <span
                      className="relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full font-display text-sm font-bold text-black"
                      style={{ background: s.c, boxShadow: `0 0 32px ${s.c}66` }}
                    >
                      {i + 1}
                    </span>
                    <SpotlightCard accent={s.c} className="flex-1 p-5 sm:p-6">
                      <h3 className="text-lg sm:text-xl font-display font-medium text-white">{s.t}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-white/65">{s.b}</p>
                    </SpotlightCard>
                  </motion.li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* DKK ───────────────────────────────────────────────────────────── */}
        <section className="relative px-4 pb-16 sm:px-6 sm:pb-24">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <p className="mb-3 text-[11px] uppercase tracking-[0.32em] text-white/50">Nr. 04 · Klausimai</p>
            </Reveal>
            <KineticHeadline
              as="h2"
              text="Dažniausiai klausiama"
              accentWords={["klausiama"]}
              className="mb-8 sm:mb-12 text-3xl sm:text-4xl md:text-5xl font-display font-medium text-white"
            />
            <div className="space-y-3">
              {HOME_FAQ.map((f, i) => (
                <FaqItem key={f.id} q={f.q} a={f.a} i={i} />
              ))}
            </div>
          </div>
        </section>

        {/* SAUGUMAS — nepilnamečių duomenų apsauga ───────────────────────── */}
        <section className="relative px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="mb-3 text-[11px] uppercase tracking-[0.32em] text-white/50">Nr. 05 · Saugumas</p>
            </Reveal>
            <KineticHeadline
              as="h2"
              text="Kaip saugome mokinių duomenis"
              accentWords={["duomenis"]}
              className="mb-4 text-3xl sm:text-4xl md:text-5xl font-display font-medium text-white"
            />
            <Reveal delay={0.05}>
              <p className="mb-8 max-w-2xl text-sm sm:text-base leading-relaxed text-white/65">
                Platformoje tvarkomi nepilnamečių duomenys, todėl saugumas nėra papildoma savybė — tai pagrindas.
                Renkame tik tai, ko būtinai reikia valandoms užskaityti, ir niekada neparduodame duomenų.
              </p>
            </Reveal>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { t: "Minimalūs duomenys", b: "Vardas, mokykla, klasė ir valandos. Jokių asmens kodų, adresų ar sveikatos duomenų.", c: LT_GREEN },
                { t: "Šifruotas ryšys ir saugykla", b: "Visas srautas eina per HTTPS/TLS, duomenų bazė laikoma ES serveriuose su šifravimu.", c: LT_YELLOW },
                { t: "Griežta prieigos kontrolė", b: "Row Level Security: auklėtoja mato tik savo klases, direktorius – tik savo mokyklą, organizacija – tik savo savanorius.", c: LT_RED },
                { t: "Pokalbiai automatiškai trinami", b: "Žinutės sunaikinamos po 12 dienų — susirašinėjimas nekaupiamas amžinai.", c: LT_GREEN },
                { t: "Tėvų ir mokyklos kontrolė", b: "Mokinys registruojasi tik su mokyklos kodu. Tėvai ar mokykla bet kada gali paprašyti duomenų kopijos arba ištrynimo.", c: LT_YELLOW },
                { t: "Patikrinamos valandos", b: "QR įsiregistravimai ir HMAC parašu pasirašyti PDF sertifikatai — duomenų negalima suklastoti.", c: LT_RED },
              ].map((s) => (
                <SpotlightCard key={s.t} accent={s.c} className="p-5 sm:p-6">
                  <h3 className="text-base font-display font-semibold text-white">{s.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/65">{s.b}</p>
                </SpotlightCard>
              ))}
            </div>

            <Reveal delay={0.1}>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/saugumas"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 text-sm font-semibold text-white transition-colors hover:border-white/35"
                >
                  Visas saugumo aprašas <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/privatumas"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 px-5 text-sm font-semibold text-white/70 transition-colors hover:text-white"
                >
                  Privatumo politika
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        {/* MOKYKLA — vienintelė šiuo metu prisijungusi ────────────────────── */}
        <section className="relative overflow-hidden border-y border-white/10 py-14">
          <Reveal>
            <p className="mb-6 text-center text-[11px] uppercase tracking-[0.32em] text-white/50">
              Mūsų bendruomenėje jau dalyvauja
            </p>
          </Reveal>
          <div className="mx-auto max-w-xl px-4">
            <SpotlightCard accent={LT_GREEN} className="p-6 text-center sm:p-8">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-[11px] tracking-normal text-white/55">
                <GraduationCap className="h-3.5 w-3.5" style={{ color: LT_YELLOW }} /> Mokykla
              </span>
              <p className="mt-4 font-display text-2xl italic sm:text-3xl text-white">Šeduvos gimnazija</p>
              <p className="mt-2 text-sm text-white/60">Radviliškio r. · pirmoji platformą naudojanti mokykla</p>
              <p className="mt-5 text-xs text-white/45">
                Nauja mokykla? Parašyk <span className="text-white/70">pagalba@socialinesvalandos.dev</span> — prijungiame nemokamai.
              </p>
            </SpotlightCard>
          </div>
        </section>



        {/* CLOSING CTA ─────────────────────────────────────────────────── */}
        <section className="relative px-4 py-16 sm:px-6 sm:py-24 md:py-32 text-center overflow-hidden">
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <motion.div
              className="h-[600px] w-[600px] max-w-[130vw] rounded-full blur-2xl"
              style={{ background: `radial-gradient(circle, ${EMBER}33, transparent 60%)` }}
              
            />
          </motion.div>

          <div className="relative mx-auto max-w-3xl">
            <KineticHeadline
              as="h2"
              text="Pasiruošęs pradėti?"
              accentWords={["pradėti?"]}
              className="mb-6 sm:mb-8 text-3xl sm:text-4xl md:text-6xl leading-[1.05] font-display font-medium text-white"
            />
            <Reveal delay={0.1}>
              <p className="mb-8 sm:mb-12 text-base sm:text-lg text-white/70 leading-relaxed">
                Prisijunk prie didžiausio Lietuvoje savanorystės tinklo ir kurk vertę sau ir kitiems.
              </p>
            </Reveal>
            <Reveal delay={0.2}>
              <Magnetic strength={16}>
                <Link
                  to="/register"
                  className="group relative inline-flex min-h-12 items-center gap-2 overflow-hidden rounded-full px-6 py-3.5 sm:px-10 sm:py-5 text-base sm:text-lg font-bold text-white transition-transform hover:scale-[1.03]"
                  style={{ background: `linear-gradient(135deg, ${EMBER}, ${GOLD})` }}
                >
                  <span className="relative z-10">Sukurti nemokamą paskyrą</span>
                  <ArrowRight className="relative z-10 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 -translate-x-full skew-x-[-20deg] bg-white/30 blur-md transition-transform duration-700 group-hover:translate-x-full motion-reduce:hidden"
                  />
                </Link>
              </Magnetic>
            </Reveal>
          </div>
        </section>

      </div>
      
    </PageShell>
  );
}
