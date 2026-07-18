import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { PageShell } from "../components/layout";
import { TiltCard } from "../components/tilt-card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  ArrowRight,
  Award,
  Building2,
  CalendarCheck,
  Clock,
  GraduationCap,
  HandHeart,
  ShieldCheck,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Socialinės Valandos — moksleivių savanorystės platforma" },
      {
        name: "description",
        content:
          "Moderni platforma Lietuvos mokykloms, moksleiviams ir organizacijoms: rezervuok savanorystės valandas ir gauk automatinę apskaitą vienoje vietoje.",
      },
      { property: "og:title", content: "Socialinės Valandos — moksleivių savanorystės platforma" },
      {
        property: "og:description",
        content:
          "Vienas įrankis mokykloms, moksleiviams ir organizacijoms. Rezervacijos, patvirtinimas, apskaita — be popierių.",
      },
      { property: "og:url", content: "https://socialinesvalandos.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://socialinesvalandos.lovable.app/" }],
  }),
  component: Home,
});

function Home() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: heroP } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(heroP, [0, 1], [0, 80]);
  const heroOpacity = useTransform(heroP, [0, 1], [1, 0.4]);

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
    return () => {
      alive = false;
    };
  }, []);

  const { profile, isAuthenticated } = useAuth();
  const isStudent = isAuthenticated && profile?.role === "student";
  const myEarned = isStudent ? Math.round(profile?.hours_earned ?? 0) : 0;
  const myNeeded = isStudent ? Math.max(profile?.hours_needed ?? 0, 1) : 20;
  const myPct = isStudent ? Math.min(100, Math.round((myEarned / myNeeded) * 100)) : 0;

  const [myPlanned, setMyPlanned] = useState(0);
  const [myCompleted, setMyCompleted] = useState(0);
  useEffect(() => {
    if (!isStudent || !profile?.id) {
      setMyPlanned(0);
      setMyCompleted(0);
      return;
    }
    let alive = true;
    (async () => {
      const [p, c] = await Promise.all([
        supabase
          .from("reservations")
          .select("id", { count: "exact", head: true })
          .eq("student_id", profile.id)
          .in("status", ["pending", "approved"]),
        supabase
          .from("reservations")
          .select("id", { count: "exact", head: true })
          .eq("student_id", profile.id)
          .eq("status", "completed"),
      ]);
      if (!alive) return;
      setMyPlanned(p.count ?? 0);
      setMyCompleted(c.count ?? 0);
    })();
    return () => {
      alive = false;
    };
  }, [isStudent, profile?.id]);

  const fmt = (n: number) => new Intl.NumberFormat("lt-LT").format(n);

  return (
    <PageShell>
      {/* HERO — editorial, magazine-style */}
      <section ref={heroRef} className="relative overflow-hidden">
        {/* Soft warm halo */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <motion.div
            animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -left-40 top-10 h-[560px] w-[560px] rounded-full opacity-40 blur-3xl"
            style={{ background: "radial-gradient(circle, oklch(0.65 0.15 240 / 0.35), transparent 65%)" }}
          />
          <motion.div
            animate={{ x: [0, -30, 0], y: [0, 40, 0] }}
            transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -right-40 top-40 h-[520px] w-[520px] rounded-full opacity-30 blur-3xl"
            style={{ background: "radial-gradient(circle, oklch(0.7 0.12 60 / 0.3), transparent 65%)" }}
          />
        </div>

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative mx-auto max-w-6xl px-4 pb-20 pt-20 sm:px-6 lg:pt-28"
        >
          {/* Top masthead rule */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="mb-14 flex items-center justify-between border-b border-border/60 pb-4 text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground"
          >
            <span>Nr. 01 · Leidimas 2026</span>
            <span className="hidden sm:inline">Lietuvos mokykloms · nemokamai</span>
            <span className="font-mono">SV / vol. 01</span>
          </motion.div>

          <div className="grid items-start gap-16 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.05 }}
                className="font-display font-semibold leading-[0.98] tracking-[-0.02em] text-[52px] sm:text-[72px] lg:text-[92px]"
              >
                Socialinės
                <br />
                valandos,
                <br />
                <span className="text-gradient italic">tvarkingai.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="mt-8 max-w-xl text-[17px] leading-[1.65] text-muted-foreground"
              >
                Vienas ramus įrankis mokyklai, moksleiviui ir organizacijai.
                Be popieriaus, be skambučių, be pamestų sąrašų — tik aiški apskaita
                ir prasminga savanorystė.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3 }}
                className="mt-10 flex flex-wrap items-center gap-4"
              >
                <Link
                  to="/register"
                  className="group inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition hover:opacity-90"
                >
                  Pradėti nemokamai
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  to="/tasks"
                  className="inline-flex items-center gap-2 text-sm font-semibold underline-offset-8 hover:underline"
                >
                  Peržiūrėti organizacijas →
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="mt-14 grid max-w-lg grid-cols-3 gap-8 border-t border-border/70 pt-8"
              >
                {[
                  { v: fmt(counts.schools), l: "Mokyklos" },
                  { v: fmt(counts.orgs), l: "Organizacijos" },
                  { v: fmt(counts.hours), l: "Atliktos val." },
                ].map((s) => (
                  <div key={s.l}>
                    <p className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{s.v}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{s.l}</p>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right card — progress preview */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.35 }}
              className="lg:mt-8"
              style={{ perspective: 1400 }}
            >
              <TiltCard intensity={12}>
                <div className="relative rounded-3xl">
                  <div className="absolute -inset-4 rounded-3xl bg-gradient-primary opacity-25 blur-2xl" aria-hidden />
                  <div className="relative rounded-3xl border border-border bg-gradient-card/95 p-6 shadow-elegant backdrop-blur-xl sm:p-8">
                    {/* Simulated app chrome */}
                    <div className="mb-5 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-rose-400/70" />
                      <span className="h-2 w-2 rounded-full bg-amber-400/70" />
                      <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
                      <span className="ml-auto text-[10px] uppercase tracking-widest text-muted-foreground">tavo pažanga · live</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                          {isStudent ? "Tavo pažanga" : "Kaip atrodo pažanga"}
                        </p>
                        <p className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                          <motion.span
                            key={myEarned}
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                          >
                            {myEarned}
                          </motion.span>
                          <span className="text-2xl text-muted-foreground"> / {myNeeded} val.</span>
                        </p>
                      </div>
                      <motion.div
                        animate={{ rotate: [0, 6, -6, 0] }}
                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                        className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow"
                      >
                        <Award className="h-5 w-5" />
                      </motion.div>
                    </div>

                    <div className="mt-6 h-2 overflow-hidden rounded-full bg-secondary">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${myPct}%` }}
                        transition={{ duration: 1.6, delay: 0.6, ease: "easeOut" }}
                        className="h-full rounded-full bg-gradient-primary"
                      />
                    </div>
                    <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                      <span>{myPct}% įvykdyta</span>
                      <span>{isStudent ? "Realaus laiko duomenys" : "Prisijunk, kad matytum savo"}</span>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-border bg-background/50 p-4 backdrop-blur">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Užbaigta</p>
                        <p className="mt-2 font-display text-xl font-semibold">{myCompleted}</p>
                      </div>
                      <div className="rounded-2xl border border-border bg-background/50 p-4 backdrop-blur">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Suplanuota</p>
                        <p className="mt-2 font-display text-xl font-semibold">{myPlanned}</p>
                      </div>
                    </div>

                    <div className="mt-6 border-t border-border/70 pt-5 text-xs text-muted-foreground">
                      <p className="italic leading-relaxed">
                        „Pirmą kartą matau, kur nueina mokinių valandos. Viskas viename lange."
                      </p>
                      <p className="mt-2 not-italic">— Mokyklos administratorius, pilotinė mokykla</p>
                    </div>
                  </div>
                </div>
              </TiltCard>
            </motion.div>
          </div>
        </motion.div>

        {/* Marquee band */}
        <div className="border-y border-border/60 bg-card/20 py-4">
          <motion.div
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            className="flex whitespace-nowrap gap-14 text-[12px] uppercase tracking-[0.32em] text-muted-foreground/70"
          >
            {Array.from({ length: 2 }).flatMap((_, k) => [
              "Šeduvos gimnazija",
              "◆",
              "Vilniaus Licėjus",
              "◆",
              "Kauno Jėzuitų gimnazija",
              "◆",
              "Klaipėdos „Vėtrungės" gimnazija",
              "◆",
              "Panevėžio 5-oji gimnazija",
              "◆",
              "Alytaus Adolfo Ramanausko-Vanago gimnazija",
              "◆",
            ].map((t, i) => (
              <span key={`${k}-${i}`}>{t}</span>
            )))}
          </motion.div>
        </div>
      </section>

      {/* MANIFESTO / PULL QUOTE */}
      <section className="relative mx-auto max-w-4xl px-4 py-28 sm:px-6">
        <motion.blockquote
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9 }}
          className="text-balance text-center font-display text-3xl font-medium leading-snug tracking-tight sm:text-4xl lg:text-5xl"
        >
          Savanorystė yra rimtas dalykas.
          <span className="text-muted-foreground"> Todėl ir įrankis, kuriuo ji tvarkoma, turi būti rimtas — švarus, patikrintas, be triukšmo.</span>
        </motion.blockquote>
      </section>

      {/* THREE AUDIENCES — editorial cards */}
      <section className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-14 flex flex-wrap items-end justify-between gap-4 border-b border-border/70 pb-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Nr. 02 · Kam skirta
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Vienas įrankis, trys pusės
            </h2>
          </div>
          <p className="max-w-md text-sm text-muted-foreground">
            Nuo pirmos rezervacijos iki oficialaus valandų patvirtinimo — kiekviena
            pusė mato tik tai, ko jai reikia.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: GraduationCap,
              n: "01",
              tag: "Moksleiviams",
              title: "Aiškus tikslas, aiškus progresas",
              body: "Rezervuok, dalyvauk, gauk patvirtinimą. Valandos atsiranda tavo mokyklos apskaitoje automatiškai — nereikia rankomis rinkti pažymų.",
            },
            {
              icon: Building2,
              n: "02",
              tag: "Organizacijoms",
              title: "Rimti savanoriai, ne pamiršti pranešimai",
              body: "Skelbk užduotis, tvirtink dalyvavimą per kelis paspaudimus. Bendrauk su moksleiviu ir jo mokykla vienoje saugioje vietoje.",
            },
            {
              icon: ShieldCheck,
              n: "03",
              tag: "Mokykloms",
              title: "Auditas be Excel'io",
              body: "Realaus laiko vaizdas: kas ką padarė, kada ir kur. Priedas — galimybė pridėti savo patikrintus renginius ir organizacijas.",
            },
          ].map((c, i) => (
            <motion.article
              key={c.tag}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.08, duration: 0.6 }}
              whileHover={{ y: -4 }}
              className="group relative rounded-2xl border border-border/70 bg-card/40 p-8 transition-colors hover:border-border hover:bg-card/70"
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-3xl font-semibold text-muted-foreground/40">{c.n}</span>
                <div className="grid h-10 w-10 place-items-center rounded-full border border-border">
                  <c.icon className="h-4 w-4" />
                </div>
              </div>
              <span className="mt-6 inline-block text-[10px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
                {c.tag}
              </span>
              <h3 className="mt-3 font-display text-xl font-semibold leading-snug tracking-tight">
                {c.title}
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{c.body}</p>
              <div className="mt-6 flex items-center gap-2 text-xs font-medium text-foreground opacity-0 transition group-hover:opacity-100">
                Sužinoti daugiau <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </motion.article>
          ))}
        </div>
      </section>



      {/* HOW IT WORKS — editorial numbered list */}
      <section className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <div className="mb-14 border-b border-border/70 pb-6">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Nr. 03 · Kaip tai veikia
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Trys žingsniai. Jokių popierių.
          </h2>
        </div>

        <ol className="divide-y divide-border/70">
          {[
            {
              icon: HandHeart,
              n: "01",
              title: "Rask organizaciją",
              body: "Naršyk pagal miestą, sritį ir laisvas vietas. Visos organizacijos patvirtintos mokyklos administratoriaus arba platformos.",
            },
            {
              icon: CalendarCheck,
              n: "02",
              title: "Rezervuok laiką",
              body: "Pasirink datą ir trukmę. Sistema iš karto parodo, kiek valandų gausi, ir įtraukia rezervaciją į tavo tvarkaraštį.",
            },
            {
              icon: Award,
              n: "03",
              title: "Sukaupk ir pristatyk mokyklai",
              body: "Kai organizacija patvirtina dalyvavimą, valandos automatiškai užskaitomos ir matomos mokyklos administratoriui.",
            },
          ].map((s, i) => (
            <motion.li
              key={s.n}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.08, duration: 0.6 }}
              className="grid gap-8 py-10 md:grid-cols-[80px_1fr_auto] md:items-center"
            >
              <p className="font-display text-4xl font-semibold text-muted-foreground/60">{s.n}</p>
              <div>
                <h3 className="font-display text-2xl font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
              <div className="hidden h-12 w-12 place-items-center rounded-full border border-border md:grid">
                <s.icon className="h-5 w-5" />
              </div>
            </motion.li>
          ))}
        </ol>
      </section>

      {/* NUMBERS STRIP */}
      <section className="relative border-y border-border/70 bg-card/30">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-16 sm:px-6 md:grid-cols-4">
          {[
            { icon: Users, value: fmt(counts.students), label: "Moksleivių" },
            { icon: Building2, value: fmt(counts.orgs), label: "Organizacijų" },
            { icon: Clock, value: fmt(counts.hours), label: "Atliktų valandų" },
            { icon: GraduationCap, value: fmt(counts.schools), label: "Mokyklų" },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.06, duration: 0.5 }}
            >
              <s.icon className="h-5 w-5 text-muted-foreground" />
              <p className="mt-4 font-display text-4xl font-semibold tracking-tight">{s.value}</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FINAL CTA — quiet */}
      <section className="relative mx-auto max-w-4xl px-4 py-28 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="text-center"
        >
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Nr. 04 · Pradžia
          </p>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Padaryk savanorystę <span className="italic text-muted-foreground">paprastą</span>.
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-sm leading-relaxed text-muted-foreground">
            Registracija — vienai mokyklai, vienam moksleiviui ar visai klasei. Be sutarčių,
            be įrengimo, be mokesčio.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-7 py-3 text-sm font-semibold text-background transition hover:opacity-90"
            >
              Sukurti paskyrą <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/tasks"
              className="inline-flex items-center gap-2 rounded-full border border-border px-7 py-3 text-sm font-semibold transition hover:bg-card/60"
            >
              Peržiūrėti organizacijas
            </Link>
          </div>
        </motion.div>
      </section>
    </PageShell>
  );
}
