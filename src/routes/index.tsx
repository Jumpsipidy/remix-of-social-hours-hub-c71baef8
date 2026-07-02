import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { PageShell } from "../components/layout";
import { TiltCard } from "../components/tilt-card";
import { organizations } from "../lib/mock-data";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Search, CalendarCheck, Award, ArrowRight, Star, Users, Clock, Building2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Socialinės Valandos — moksleivių savanorystės platforma" },
      { name: "description", content: "Rask organizacijas, rezervuok savanorystės valandas ir stebėk pažangą vienoje vietoje." },
    ],
  }),
  component: Home,
});

function Home() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: heroP } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(heroP, [0, 1], [0, 120]);
  const heroScale = useTransform(heroP, [0, 1], [1, 0.92]);
  const heroOpacity = useTransform(heroP, [0, 1], [1, 0.3]);
  const cardRotate = useTransform(heroP, [0, 1], [0, -12]);
  const cardY = useSpring(useTransform(heroP, [0, 1], [0, -80]), { stiffness: 60, damping: 20 });

  const statsRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: statsP } = useScroll({ target: statsRef, offset: ["start end", "end start"] });
  const statsBgX = useTransform(statsP, [0, 1], ["-10%", "10%"]);

  const [counts, setCounts] = useState({ students: 0, orgs: 0, hours: 0, schools: 0 });
  useEffect(() => {
    let alive = true;
    (async () => {
      const [s, o, h, sc] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "organization"),
        supabase.from("profiles").select("hours_earned").eq("role", "student"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "school_admin"),
      ]);
      if (!alive) return;
      const totalHours = (h.data ?? []).reduce((a: number, r: { hours_earned: number | null }) => a + (r.hours_earned ?? 0), 0);
      setCounts({
        students: s.count ?? 0,
        orgs: o.count ?? 0,
        hours: Math.round(totalHours),
        schools: sc.count ?? 0,
      });
    })();
    return () => { alive = false; };
  }, []);
  const fmt = (n: number) => new Intl.NumberFormat("lt-LT").format(n);

  return (
    <PageShell>
      {/* HERO */}
      <section ref={heroRef} className="relative overflow-hidden">
        <motion.div style={{ y: heroY, scale: heroScale, opacity: heroOpacity }} className="relative mx-auto max-w-7xl px-4 pb-24 pt-20 sm:px-6 lg:pt-28">
          <div className="grid items-center gap-12 lg:grid-cols-2" style={{ perspective: 1400 }}>
            <div>
              <motion.span
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur"
              >
                <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" /> Nauja karta Lietuvos mokyklose
              </motion.span>
              <motion.h1
                initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.05 }}
                className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
              >
                Socialinės valandos, <span className="text-gradient">be popierizmo</span>.
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15 }}
                className="mt-6 max-w-xl text-lg text-muted-foreground"
              >
                Vienoje vietoje rask patikimas organizacijas, rezervuok savanorystės laiką ir automatiškai sukauptas valandas pateik mokyklai.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.25 }}
                className="mt-8 flex flex-wrap gap-3"
              >
                <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.97 }} transition={{ type: "spring", stiffness: 300, damping: 15 }}>
                  <Link to="/register" className="group inline-flex items-center gap-2 rounded-full bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow">
                    Pradėti nemokamai <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.97 }} transition={{ type: "spring", stiffness: 300, damping: 15 }}>
                  <Link to="/tasks" className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-6 py-3 text-sm font-semibold backdrop-blur transition hover:bg-accent">
                    Naršyti organizacijas
                  </Link>
                </motion.div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.4 }}
                className="mt-10 flex items-center gap-6 text-sm text-muted-foreground"
              >
                <div className="flex -space-x-2">
                  {["🧑‍🎓","👩‍🎓","🧒","👨‍🎓"].map((e,i)=>(
                    <motion.div
                      key={i}
                      whileHover={{ y: -4, scale: 1.15, zIndex: 10 }}
                      className="grid h-9 w-9 place-items-center rounded-full border-2 border-background bg-accent text-sm shadow-md"
                    >{e}</motion.div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1 text-warning">
                    {[...Array(5)].map((_,i)=>(<Star key={i} className="h-3.5 w-3.5" fill="currentColor" />))}
                  </div>
                  <span>Nauja platforma — {fmt(counts.students)} moksleivių</span>
                </div>
              </motion.div>
            </div>

            <motion.div style={{ y: cardY, rotate: cardRotate }}>
              <TiltCard intensity={14}>
                <div className="relative rounded-3xl">
                  <div className="absolute -inset-4 rounded-3xl bg-gradient-primary opacity-30 blur-2xl" aria-hidden />
                  <div className="relative rounded-3xl border border-border bg-gradient-card/90 p-6 shadow-elegant backdrop-blur-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">Tavo pažanga</p>
                        <p className="mt-1 font-display text-3xl font-bold">42 / 60 val.</p>
                      </div>
                      <motion.div
                        animate={{ rotate: [0, 8, -8, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow"
                      >
                        <Award className="h-5 w-5" />
                      </motion.div>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
                      <motion.div
                        initial={{ width: 0 }} animate={{ width: "70%" }} transition={{ duration: 1.2, delay: 0.6, ease: "easeOut" }}
                        className="h-full rounded-full bg-gradient-primary"
                      />
                    </div>
                    <div className="mt-6 grid grid-cols-2 gap-3">
                      {[
                        { label: "Užbaigta", value: "42 val." },
                        { label: "Suplanuota", value: "3 vizitai" },
                      ].map((s)=>(
                        <div key={s.label} className="rounded-2xl border border-border bg-background/50 p-4 backdrop-blur">
                          <p className="text-xs text-muted-foreground">{s.label}</p>
                          <p className="mt-1 font-display text-lg font-bold">{s.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 space-y-3">
                      {organizations.slice(0,3).map((o, i)=>(
                        <motion.div
                          key={o.id}
                          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 + i * 0.1 }}
                          whileHover={{ x: 4 }}
                          className="flex items-center gap-3 rounded-xl bg-background/60 p-3 backdrop-blur transition"
                        >
                          <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-lg">{o.emoji}</div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{o.name}</p>
                            <p className="text-xs text-muted-foreground">{o.town} · {o.hoursOffered} val.</p>
                          </div>
                          <span className="rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success">Aktyvi</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </TiltCard>
            </motion.div>
          </div>
        </motion.div>

        {/* scroll cue */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
          className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 text-xs text-muted-foreground"
        >
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.8, repeat: Infinity }}>
            ↓ Slink žemyn
          </motion.div>
        </motion.div>
      </section>

      {/* STATS */}
      <section ref={statsRef} className="relative border-y border-border/60 bg-card/40 backdrop-blur-xl">
        <motion.div
          style={{ x: statsBgX }}
          className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,oklch(0.72_0.18_310/0.15),transparent_50%),radial-gradient(circle_at_80%_50%,oklch(0.58_0.20_268/0.15),transparent_50%)]"
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-14 sm:px-6 md:grid-cols-4">
          {[
            { icon: Users, value: fmt(counts.students), label: "Aktyvių moksleivių" },
            { icon: Building2, value: fmt(counts.orgs), label: "Patikrintų organizacijų" },
            { icon: Clock, value: fmt(counts.hours), label: "Atliktų valandų" },
            { icon: Award, value: fmt(counts.schools), label: "Prisijungusių mokyklų" },
          ].map((s, i)=>(
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 30, rotateX: -20 }}
              whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: i * 0.08, type: "spring", stiffness: 120, damping: 18 }}
              whileHover={{ y: -6, scale: 1.03 }}
              style={{ transformPerspective: 800 }}
              className="text-center"
            >
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.8 }}
                className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow"
              >
                <s.icon className="h-6 w-6" />
              </motion.div>
              <p className="mt-4 font-display text-3xl font-bold tracking-tight">{s.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="relative mx-auto max-w-7xl px-4 py-28 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">Kaip tai veikia</span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">Trys žingsniai iki pirmos valandos</h2>
          <p className="mt-4 text-muted-foreground">Sukurta moksleiviams ir organizacijoms — be skambučių, popierių ar nereikalingo laukimo.</p>
        </motion.div>
        <div className="mt-16 grid gap-6 md:grid-cols-3" style={{ perspective: 1400 }}>
          {[
            { icon: Search, title: "Rask organizaciją", desc: "Naršyk pagal miestą, sritį ar laisvas vietas. Visos organizacijos patikrintos." },
            { icon: CalendarCheck, title: "Rezervuok laiką", desc: "Vienu paspaudimu rezervuok savanorystės vizitą tau patogiu metu." },
            { icon: Award, title: "Sukaupk valandas", desc: "Organizacija patvirtina dalyvavimą — valandos automatiškai įskaitomos mokyklai." },
          ].map((s,i)=>(
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 60, rotateY: -25 }}
              whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.12, type: "spring", stiffness: 100, damping: 18 }}
            >
              <TiltCard intensity={12}>
                <div className="group relative overflow-hidden rounded-3xl border border-border bg-gradient-card/80 p-8 shadow-md backdrop-blur-xl transition hover:shadow-elegant">
                  <motion.div
                    aria-hidden
                    className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-primary opacity-10 blur-2xl transition-opacity group-hover:opacity-30"
                  />
                  <div className="absolute right-6 top-6 font-display text-6xl font-bold text-muted/30">0{i+1}</div>
                  <motion.div
                    whileHover={{ scale: 1.15, rotate: -8 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow"
                  >
                    <s.icon className="h-6 w-6" />
                  </motion.div>
                  <h3 className="mt-6 text-xl font-bold">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ORGS SHOWCASE */}
      <section className="relative mx-auto max-w-7xl px-4 pb-28 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="flex flex-wrap items-end justify-between gap-4"
        >
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">Populiariausios</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Organizacijos, kurioms reikia tavęs</h2>
          </div>
          <Link to="/tasks" className="group inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
            Visos organizacijos <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" style={{ perspective: 1400 }}>
          {organizations.slice(0,6).map((o, i)=>(
            <motion.div
              key={o.id}
              initial={{ opacity: 0, y: 40, rotateX: -15 }}
              whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: (i % 3) * 0.08, type: "spring", stiffness: 110, damping: 18 }}
            >
              <TiltCard intensity={10}>
                <article className="group relative overflow-hidden rounded-3xl border border-border bg-gradient-card/80 p-6 shadow-md backdrop-blur-xl transition hover:shadow-elegant">
                  <div className="flex items-center justify-between">
                    <motion.div
                      whileHover={{ rotate: [0, -12, 12, 0], scale: 1.1 }}
                      transition={{ duration: 0.6 }}
                      className="grid h-14 w-14 place-items-center rounded-2xl bg-accent text-2xl shadow-md"
                    >{o.emoji}</motion.div>
                    <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-medium text-success">{o.spotsLeft} laisvos vietos</span>
                  </div>
                  <h3 className="mt-5 text-lg font-bold leading-tight">{o.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{o.town} · {o.category}</p>
                  <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{o.description}</p>
                  <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-warning" fill="currentColor" /> {o.rating}</span>
                    <span>{o.totalVolunteers} savanorių</span>
                    <span className="font-semibold text-foreground">{o.hoursOffered} val.</span>
                  </div>
                </article>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-28 sm:px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 40 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ type: "spring", stiffness: 90, damping: 18 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-hero p-10 text-center shadow-glow sm:p-16"
        >
          <motion.div
            animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"
            aria-hidden
          />
          <motion.div
            animate={{ x: [0, -30, 0], y: [0, 20, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"
            aria-hidden
          />
          <h2 className="relative text-3xl font-bold text-white sm:text-5xl">Pasiruošę pradėti savanorystę?</h2>
          <p className="relative mx-auto mt-3 max-w-xl text-white/80">Prisijunk prie moksleivių bendruomenės, kuri atlieka socialines valandas paprastai ir prasmingai.</p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <motion.div whileHover={{ scale: 1.06, y: -2 }} whileTap={{ scale: 0.97 }}>
              <Link to="/register" className="inline-block rounded-full bg-white px-6 py-3 text-sm font-semibold text-primary transition hover:bg-white/90">Sukurti paskyrą</Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.06, y: -2 }} whileTap={{ scale: 0.97 }}>
              <Link to="/tasks" className="inline-block rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20">Naršyti organizacijas</Link>
            </motion.div>
          </div>
        </motion.div>
      </section>
    </PageShell>
  );
}
