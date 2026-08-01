import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useInView, useScroll, useTransform, useSpring, useMotionValue } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { PageShell } from "../components/layout";
import { supabase } from "@/integrations/supabase/client";
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
  LT_GREEN,
  LT_RED,
  LT_YELLOW,
} from "@/components/motion-kit";
import { ArrowRight, Sparkles, Users, Building2, GraduationCap, Clock } from "lucide-react";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Socialinės Valandos — socialinių valandų centras mokiniams | socialinesvalandos.dev" },
      { name: "description", content: "Socialinės Valandos (socialinesvalandos.dev) — Lietuvos mokinių socialinių valandų centras. Rezervuok savanorystės valandas, sekk pažangą ir gauk automatinę apskaitą vienoje vietoje." },
      { property: "og:title", content: "Socialinės Valandos — socialinių valandų centras | socialinesvalandos.dev" },
      { property: "og:description", content: "Socialinesvalandos.dev — Lietuvos moksleivių savanorystės ir socialinių valandų valdymo platforma. Rezervuok, sekk ir surink savo valandas." },
      { property: "og:url", content: "https://socialinesvalandos.dev/" },

    ],
    links: [{ rel: "canonical", href: "https://socialinesvalandos.dev/" }],
  }),
  component: Home,
});

// Accent palette — sits on top of the site's dark navy BackgroundFX
const EMBER = "#C8452A";
const GOLD = "#E9B44C";




/** Cursor-tracking spotlight card with parallax tilt + sheen sweep */
function SpotlightCard({
  children,
  className = "",
  accent = EMBER,
}: { children: React.ReactNode; className?: string; accent?: string }) {
  const calm = useCalmMotion();
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(50);
  const my = useMotionValue(50);
  const rx = useSpring(useTransform(my, [0, 100], [7, -7]), { stiffness: 140, damping: 16 });
  const ry = useSpring(useTransform(mx, [0, 100], [-7, 7]), { stiffness: 140, damping: 16 });
  const glow = useTransform(
    [mx, my] as never,
    ([x, y]: number[]) => `radial-gradient(420px circle at ${x}% ${y}%, ${accent}26, transparent 62%)`,
  );

  return (
    <motion.div
      ref={ref}
      onPointerMove={(e) => {
        if (calm || e.pointerType !== "mouse" || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        mx.set(((e.clientX - r.left) / r.width) * 100);
        my.set(((e.clientY - r.top) / r.height) * 100);
      }}
      onPointerLeave={() => { mx.set(50); my.set(50); }}
      whileHover={calm ? undefined : { y: -6 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      style={calm ? undefined : { rotateX: rx, rotateY: ry, transformPerspective: 1000 }}
      className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl transition-colors hover:border-white/25 ${className}`}
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: glow }}
      />
      {/* diagonal sheen that sweeps across on hover */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-[900ms] ease-out group-hover:translate-x-full motion-reduce:hidden"
      />
      {children}
    </motion.div>
  );
}


function Home() {
  const { profile, isAuthenticated } = useAuth();
  const isStudent = isAuthenticated && profile?.role === "student";

  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.2]);

  const [counts, setCounts] = useState({ students: 0, orgs: 0, hours: 0, schools: 0 });
  useEffect(() => {
    let alive = true;
    (async () => {
      const [s, o, h, sc] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "organization"),
        supabase.from("profiles").select("hours_earned").eq("role", "student"),
        supabase.from("schools").select("id", { count: "exact", head: true }),
      ]);
      if (!alive) return;
      const totalHours = (h.data ?? []).reduce(
        (a: number, r: { hours_earned: number | null }) => a + (r.hours_earned ?? 0), 0,
      );
      setCounts({
        students: s.count ?? 0,
        orgs: o.count ?? 0,
        hours: Math.round(totalHours),
        schools: sc.count ?? 0,
      });
    })();
    return () => { alive = false; };
  }, []);

  const primaryCta = isStudent ? "/student" : "/register";
  const primaryLabel = isStudent ? "Į mano sritį" : "Pradėti savanorystę";

  const roles = [
    {
      tag: "Mokiniams",
      title: "Atrask save",
      body: "Rinkis iš šimtų veiklų, kaupk valandas ir formuok savo ateities CV per prasmingą darbą.",
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
        Socialinės Valandos — socialinių valandų centras mokiniams (socialinesvalandos.dev)
      </h1>

      <div className="relative selection:bg-[#C8452A] selection:text-white">
        {/* HERO ─────────────────────────────────────────────────────────── */}
        <section ref={heroRef} className="relative overflow-hidden px-4 pt-14 pb-20 sm:px-6 sm:pt-24 sm:pb-32 md:pt-36 md:pb-44">
          {/* animated halos on top of the shell BackgroundFX */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ y: heroY, opacity: heroOpacity }}
          >
            <motion.div
              className="absolute -left-40 top-10 h-[520px] w-[520px] rounded-full blur-3xl"
              style={{ background: `radial-gradient(circle, ${EMBER}33, transparent 65%)` }}
              animate={{ x: [0, 40, 0], y: [0, 20, 0] }}
              transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute -right-40 top-40 h-[460px] w-[460px] rounded-full blur-3xl"
              style={{ background: `radial-gradient(circle, ${GOLD}22, transparent 65%)` }}
              animate={{ x: [0, -30, 0], y: [0, -20, 0] }}
              transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>

          <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative mx-auto max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[11px] uppercase tracking-[0.24em] text-white/70 backdrop-blur"
            >
              <Sparkles className="h-3 w-3" style={{ color: GOLD }} />
              Lietuvos moksleiviams · nemokamai
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0)" }}
              transition={{ duration: 0.9, delay: 0.05 }}
              className="mb-6 sm:mb-8 leading-[1.05] text-[40px] sm:text-5xl md:text-7xl lg:text-[88px] font-display"
              style={{ fontWeight: 500 }}
            >
              Kiekviena{" "}
              <span className="relative inline-block italic" style={{ fontWeight: 400 }}>
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage: `linear-gradient(120deg, ${GOLD}, ${EMBER}, ${GOLD})`,
                    backgroundSize: "200% 100%",
                    animation: "shine 6s linear infinite",
                  }}
                >
                  valanda
                </span>
              </span>{" "}
              — žingsnis pokyčio link
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25 }}
              className="mx-auto mb-8 sm:mb-12 max-w-xl text-base sm:text-lg md:text-xl leading-[1.6] text-white/70"
            >
              Vienintelė Lietuvoje platforma, sujungianti ambicingus mokinius su prasmingomis
              savanorystės galimybėmis.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="flex flex-col items-center justify-center gap-4 sm:flex-row"
            >
              <Link
                to={primaryCta}
                className="group relative w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-base font-semibold text-white overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${EMBER}, #A63922)` }}
              >
                <span className="relative z-10">{primaryLabel}</span>
                <ArrowRight className="relative z-10 h-4 w-4 transition-transform group-hover:translate-x-1" />
                <span
                  aria-hidden
                  className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{ background: `linear-gradient(135deg, ${GOLD}, ${EMBER})` }}
                />
              </Link>
              <Link
                to="/tasks"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-full px-8 py-4 text-base font-semibold border border-white/20 bg-white/5 text-white backdrop-blur transition-colors hover:bg-white/10 hover:border-white/40"
              >
                Naršyti užduotis
              </Link>
            </motion.div>

            {/* floating stat pill under CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="mx-auto mt-10 sm:mt-16 flex max-w-md items-center justify-center gap-4 sm:gap-6 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 sm:px-6 sm:py-4 backdrop-blur-xl"
            >
              <Clock className="h-5 w-5" style={{ color: GOLD }} />
              <div className="text-left">
                <div className="text-2xl font-display font-semibold text-white">
                  <CountUp value={counts.hours} /> val.
                </div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">
                  jau užregistruota mūsų bendruomenėje
                </div>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* LIVE STATS ───────────────────────────────────────────────────── */}
        <section className="relative border-y border-white/10 backdrop-blur-sm">
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
                transition={{ delay: i * 0.1, duration: 0.6 }}
                className="relative px-6 py-10 sm:py-14 text-center border-t border-white/5 first:border-t-0 md:border-t-0"
                style={{ borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.08)" : undefined }}
              >
                <div className="mb-3 text-4xl sm:text-5xl md:text-6xl font-display" style={{ fontWeight: 300, color: s.c }}>
                  <CountUp value={s.v} />
                </div>
                <div className="text-[11px] uppercase tracking-[0.24em] text-white/60">{s.l}</div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ROLES ─────────────────────────────────────────────────────────── */}
        <section className="relative px-4 py-16 sm:px-6 sm:py-24 md:py-32">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 sm:mb-16 max-w-3xl">
              <p className="mb-3 sm:mb-4 text-[11px] uppercase tracking-[0.32em] text-white/50">
                Nr. 02 · Bendruomenė
              </p>
              <h2 className="text-3xl sm:text-4xl md:text-6xl font-display text-white" style={{ fontWeight: 500, letterSpacing: "-0.01em" }}>
                Platforma skirta{" "}
                <span className="italic bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(120deg, ${EMBER}, ${GOLD})` }}>
                  visiems
                </span>
              </h2>
            </div>

            <div className="grid gap-5 sm:gap-8 md:grid-cols-3">
              {roles.map((c, i) => (
                <motion.div
                  key={c.tag}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ delay: i * 0.1, duration: 0.6 }}
                >
                  <SpotlightCard accent={c.accent} className="h-full p-6 sm:p-8">
                    <div
                      className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl"
                      style={{ background: `${c.accent}22`, border: `1px solid ${c.accent}44` }}
                    >
                      <c.icon className="h-6 w-6" style={{ color: c.accent }} />
                    </div>
                    <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.24em] text-white/50">
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

        {/* MARQUEE — school band ─────────────────────────────────────────── */}
        <section className="relative overflow-hidden border-y border-white/10 py-14">
          <p className="mb-8 text-center text-[11px] uppercase tracking-[0.32em] text-white/50">
            Mūsų bendruomenėje jau dalyvauja
          </p>
          <div className="flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
            <motion.div
              className="flex shrink-0 items-center gap-6 sm:gap-12 pr-6 sm:pr-12 font-display italic text-base sm:text-xl md:text-2xl text-white/60 whitespace-nowrap"
              style={{ fontWeight: 400 }}
              animate={{ x: ["0%", "-50%"] }}
              transition={{ duration: 40, ease: "linear", repeat: Infinity }}
            >
              {Array.from({ length: 2 }).flatMap((_, k) => [
                "Šeduvos gimnazija",
                "Vilniaus licėjus",
                "Kauno KTU gimnazija",
                "Klaipėdos Ąžuolyno gimnazija",
                "Panevėžio J. Balčikonio gimnazija",
                "Šiaulių Didždvario gimnazija",
              ].map((name, j) => (
                <span key={`${k}-${j}`} className="flex items-center gap-6 sm:gap-12">
                  <span>{name}</span>
                  <span aria-hidden style={{ color: EMBER }}>◆</span>
                </span>
              )))}
            </motion.div>
          </div>
        </section>

        {/* CLOSING CTA ─────────────────────────────────────────────────── */}
        <section className="relative px-4 py-16 sm:px-6 sm:py-24 md:py-32 text-center overflow-hidden">
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <motion.div
              className="h-[600px] w-[600px] rounded-full blur-3xl"
              style={{ background: `radial-gradient(circle, ${EMBER}33, transparent 60%)` }}
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>

          <div className="relative mx-auto max-w-3xl">
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7 }}
              className="mb-6 sm:mb-8 text-3xl sm:text-4xl md:text-6xl leading-[1.05] font-display text-white"
              style={{ fontWeight: 500 }}
            >
              Pasiruošęs{" "}
              <span className="italic bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(120deg, ${GOLD}, ${EMBER})` }}>
                pradėti?
              </span>
            </motion.h2>
            <p className="mb-8 sm:mb-12 text-base sm:text-lg text-white/70 leading-relaxed">
              Prisijunk prie didžiausio Lietuvoje savanorystės tinklo ir kurk vertę sau ir kitiems.
            </p>
            <Link
              to="/register"
              className="group inline-flex items-center gap-2 rounded-full px-6 py-3.5 sm:px-10 sm:py-5 text-base sm:text-lg font-bold text-white transition-transform hover:scale-[1.03]"
              style={{ background: `linear-gradient(135deg, ${EMBER}, ${GOLD})` }}
            >
              Sukurti nemokamą paskyrą
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </section>

        <style>{`
          @keyframes shine {
            0% { background-position: 0% 50%; }
            100% { background-position: 200% 50%; }
          }
        `}</style>
      </div>
    </PageShell>
  );
}
