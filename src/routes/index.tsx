import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { PageShell } from "../components/layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Socialinės Valandos — moksleivių savanorystės platforma" },
      {
        name: "description",
        content:
          "Kiekviena valanda — tai žingsnis pokyčio link. Vienintelė Lietuvoje platforma, sujungianti mokinius, mokyklas ir savanorystės organizacijas.",
      },
      { property: "og:title", content: "Socialinės Valandos — moksleivių savanorystės platforma" },
      {
        property: "og:description",
        content:
          "Rezervuok savanorystės valandas, sekk savo pažangą ir gauk automatinę apskaitą — vienoje ramioje vietoje.",
      },
      { property: "og:url", content: "https://socialinesvalandos.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://socialinesvalandos.lovable.app/" }],
  }),
  component: Home,
});

// Palette (locked from picked direction "Ink on Paper")
const INK = "#0B0B0F";
const PAPER = "#F5F1E8";
const EMBER = "#C8452A";
const EMBER_DARK = "#A63922";
const GOLD = "#E9B44C";

const fmt = (n: number) => new Intl.NumberFormat("lt-LT").format(n);

/** Number that eases from 0 → value once when scrolled into view. */
function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const dur = 1400;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value]);
  return <span ref={ref} className={className}>{fmt(n)}</span>;
}

function Home() {
  const { profile, isAuthenticated } = useAuth();
  const isStudent = isAuthenticated && profile?.role === "student";

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
        (a: number, r: { hours_earned: number | null }) => a + (r.hours_earned ?? 0),
        0,
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

  return (
    <PageShell>
      <div
        style={{ background: INK, color: PAPER, fontFamily: "'Inter', sans-serif" }}
        className="selection:bg-[#C8452A] selection:text-white"
      >
        {/* HERO ─────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden px-6 pt-24 pb-32 md:pt-40 md:pb-48">
          {/* soft ember + gold halos, very subtle */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div
              className="absolute -left-40 top-0 h-[520px] w-[520px] rounded-full opacity-[0.08] blur-3xl"
              style={{ background: `radial-gradient(circle, ${EMBER}, transparent 60%)` }}
            />
            <div
              className="absolute -right-40 top-40 h-[460px] w-[460px] rounded-full opacity-[0.06] blur-3xl"
              style={{ background: `radial-gradient(circle, ${GOLD}, transparent 60%)` }}
            />
          </div>

          <div className="relative mx-auto max-w-4xl text-center">
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-8 text-[11px] uppercase tracking-[0.32em]"
              style={{ color: `${PAPER}80` }}
            >
              Lietuvos moksleiviams · nemokamai
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0)" }}
              transition={{ duration: 0.9, delay: 0.05 }}
              className="mb-10 leading-[1.02] text-5xl md:text-7xl lg:text-[92px]"
              style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }}
            >
              Kiekviena{" "}
              <span className="italic" style={{ color: GOLD, fontWeight: 400 }}>valanda</span>{" "}
              — tai žingsnis pokyčio link
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25 }}
              className="mx-auto mb-12 max-w-xl text-lg md:text-xl leading-[1.6]"
              style={{ color: `${PAPER}B3` }}
            >
              Vienintelė Lietuvoje platforma, sujungianti ambicingus mokinius su
              prasmingomis savanorystės galimybėmis.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="flex flex-col items-center justify-center gap-4 sm:flex-row"
            >
              <Link
                to={primaryCta}
                className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-9 py-4 text-base font-semibold text-white transition-colors"
                style={{ background: EMBER }}
                onMouseEnter={(e) => (e.currentTarget.style.background = EMBER_DARK)}
                onMouseLeave={(e) => (e.currentTarget.style.background = EMBER)}
              >
                {primaryLabel}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/tasks"
                className="w-full sm:w-auto inline-flex items-center justify-center px-9 py-4 text-base font-semibold border transition-colors"
                style={{ borderColor: `${PAPER}4D`, color: PAPER }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = PAPER)}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = `${PAPER}4D`)}
              >
                Naršyti užduotis
              </Link>
            </motion.div>
          </div>
        </section>

        {/* LIVE STATS ───────────────────────────────────────────────────── */}
        <section className="border-y" style={{ borderColor: `${PAPER}1A` }}>
          <div
            className="mx-auto grid max-w-7xl grid-cols-1 md:grid-cols-3"
            style={{ background: INK }}
          >
            {[
              { v: counts.hours, l: "Užregistruota valandų" },
              { v: counts.students, l: "Aktyvių mokinių" },
              { v: counts.orgs, l: "Partnerių organizacijų" },
            ].map((s, i) => (
              <div
                key={s.l}
                className="px-6 py-14 text-center"
                style={{
                  borderLeft: i > 0 ? `1px solid ${PAPER}1A` : undefined,
                }}
              >
                <div
                  className="mb-3 text-5xl md:text-6xl"
                  style={{
                    fontFamily: "'Fraunces', serif",
                    fontWeight: 300,
                    color: GOLD,
                  }}
                >
                  <CountUp value={s.v} />
                </div>
                <div
                  className="text-[11px] uppercase tracking-[0.24em]"
                  style={{ color: `${PAPER}99` }}
                >
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ROLES — cream paper section ─────────────────────────────────── */}
        <section
          className="px-6 py-24 md:py-32"
          style={{ background: PAPER, color: INK }}
        >
          <div className="mx-auto max-w-7xl">
            <div className="mb-16 max-w-3xl">
              <p className="mb-4 text-[11px] uppercase tracking-[0.32em]" style={{ color: `${INK}80` }}>
                Nr. 02 · Bendruomenė
              </p>
              <h2
                className="text-4xl md:text-6xl"
                style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, letterSpacing: "-0.01em" }}
              >
                Platforma skirta <span className="italic" style={{ color: EMBER }}>visiems</span>
              </h2>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {[
                {
                  tag: "Mokiniams",
                  title: "Atrask save",
                  body: "Rinkis iš šimtų veiklų, kaupk valandas ir formuok savo ateities CV per prasmingą darbą.",
                  cta: "Sužinoti daugiau",
                  to: "/tasks",
                  hoverBg: INK,
                  hoverFg: PAPER,
                },
                {
                  tag: "Organizacijoms",
                  title: "Rask pagalbą",
                  body: "Paskelbkite savo iniciatyvas ir pritraukite motyvuotus jaunus žmones prisidėti prie jūsų tikslų.",
                  cta: "Sukurti profilį",
                  to: "/register",
                  hoverBg: EMBER,
                  hoverFg: "#FFFFFF",
                },
                {
                  tag: "Mokykloms",
                  title: "Valdyk paprastai",
                  body: "Skaitmenizuokite socialinių valandų apskaitą ir stebėkite savo bendruomenės poveikį.",
                  cta: "Mokyklų portalas",
                  to: "/register",
                  hoverBg: GOLD,
                  hoverFg: INK,
                },
              ].map((c, i) => (
                <motion.article
                  key={c.tag}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ delay: i * 0.08, duration: 0.6 }}
                  className="group relative p-10 border transition-colors duration-300"
                  style={
                    {
                      borderColor: `${INK}1A`,
                      "--h-bg": c.hoverBg,
                      "--h-fg": c.hoverFg,
                    } as React.CSSProperties
                  }
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = c.hoverBg;
                    e.currentTarget.style.color = c.hoverFg;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = INK;
                  }}
                >
                  <div className="mb-8 text-[11px] font-bold uppercase tracking-[0.24em] opacity-60">
                    {c.tag}
                  </div>
                  <h3
                    className="mb-5 text-3xl italic"
                    style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }}
                  >
                    {c.title}
                  </h3>
                  <p className="mb-10 text-[15px] leading-relaxed opacity-80">{c.body}</p>
                  <Link
                    to={c.to}
                    className="inline-flex items-center gap-2 text-sm font-bold"
                  >
                    {c.cta} <span aria-hidden>→</span>
                  </Link>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        {/* TRUST — school band ─────────────────────────────────────────── */}
        <section className="py-20 md:py-24" style={{ background: INK }}>
          <div className="mx-auto max-w-7xl px-6">
            <p
              className="mb-10 text-center text-[11px] uppercase tracking-[0.32em]"
              style={{ color: `${PAPER}66` }}
            >
              Mūsų bendruomenėje jau dalyvauja
            </p>
            <div
              className="flex flex-wrap justify-center gap-x-12 gap-y-6 italic md:text-xl text-lg"
              style={{ fontFamily: "'Fraunces', serif", color: `${PAPER}99`, fontWeight: 400 }}
            >
              <span>Šeduvos gimnazija</span>
              <span aria-hidden style={{ color: EMBER }}>◆</span>
              <span>Vilniaus licėjus</span>
              <span aria-hidden style={{ color: EMBER }}>◆</span>
              <span>Kauno KTU gimnazija</span>
              <span aria-hidden style={{ color: EMBER }}>◆</span>
              <span>Klaipėdos Ąžuolyno gimnazija</span>
              <span aria-hidden style={{ color: EMBER }}>◆</span>
              <span>Panevėžio J. Balčikonio gimnazija</span>
              <span aria-hidden style={{ color: EMBER }}>◆</span>
              <span>Šiaulių Didždvario gimnazija</span>
            </div>
          </div>
        </section>

        {/* CLOSING CTA ─────────────────────────────────────────────────── */}
        <section
          className="px-6 py-24 md:py-32 text-center"
          style={{ background: EMBER, color: "#FFFFFF" }}
        >
          <div className="mx-auto max-w-3xl">
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7 }}
              className="mb-8 text-4xl md:text-6xl leading-[1.05]"
              style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }}
            >
              Pasiruošę pradėti?
            </motion.h2>
            <p className="mb-12 text-lg opacity-90 leading-relaxed">
              Prisijunkite prie didžiausio Lietuvoje savanorystės tinklo ir kurkite
              vertę sau ir kitiems.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-10 py-5 text-lg font-bold transition-transform hover:scale-[1.03]"
              style={{ background: "#FFFFFF", color: INK }}
            >
              Sukurti nemokamą paskyrą <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </section>

        {/* FOOTER strip ────────────────────────────────────────────────── */}
        <footer
          className="border-t px-6 py-12"
          style={{ background: INK, borderColor: `${PAPER}1A`, color: `${PAPER}66` }}
        >
          <div className="mx-auto max-w-7xl flex flex-col md:flex-row justify-between items-center gap-6 text-sm">
            <div
              className="text-xl italic"
              style={{ fontFamily: "'Fraunces', serif", color: PAPER, fontWeight: 300 }}
            >
              Socialinės Valandos
            </div>
            <div className="flex gap-8 text-[11px] uppercase tracking-[0.24em]">
              <Link to="/terms" className="hover:opacity-100" style={{ color: `${PAPER}99` }}>
                Taisyklės
              </Link>
              <Link to="/terms" className="hover:opacity-100" style={{ color: `${PAPER}99` }}>
                Privatumas
              </Link>
              <Link to="/login" className="hover:opacity-100" style={{ color: `${PAPER}99` }}>
                Prisijungti
              </Link>
            </div>
            <div className="text-xs">© {new Date().getFullYear()} Socialinės Valandos</div>
          </div>
        </footer>
      </div>
    </PageShell>
  );
}
