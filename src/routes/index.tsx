import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { PageShell } from "../components/layout";
import { TiltCard } from "../components/tilt-card";
import { organizations } from "../lib/mock-data";
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
  return (
    <PageShell>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-mesh" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-20 sm:px-6 lg:pt-28">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="animate-fade-up">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Nauja karta Lietuvos mokyklose
              </span>
              <h1 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                Socialinės valandos, <span className="text-gradient">be popierizmo</span>.
              </h1>
              <p className="mt-6 max-w-xl text-lg text-muted-foreground">
                Vienoje vietoje rask patikimas organizacijas, rezervuok savanorystės laiką ir automatiškai sukauptas valandas pateik mokyklai.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                  <Link to="/register" className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow">
                    Pradėti nemokamai <ArrowRight className="h-4 w-4" />
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                  <Link to="/tasks" className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold transition hover:bg-accent">
                    Naršyti organizacijas
                  </Link>
                </motion.div>
              </div>
              <div className="mt-10 flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex -space-x-2">
                  {["🧑‍🎓","👩‍🎓","🧒","👨‍🎓"].map((e,i)=>(
                    <div key={i} className="grid h-9 w-9 place-items-center rounded-full border-2 border-background bg-accent text-sm">{e}</div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1 text-warning">
                    {[...Array(5)].map((_,i)=>(<Star key={i} className="h-3.5 w-3.5" fill="currentColor" />))}
                  </div>
                  <span>4.9/5 — 2 400+ moksleivių</span>
                </div>
              </div>
            </div>

            <div className="animate-fade-up [animation-delay:120ms]">
              <div className="relative">
                <div className="absolute -inset-4 rounded-3xl bg-gradient-primary opacity-20 blur-2xl" aria-hidden />
                <div className="relative rounded-3xl border border-border bg-gradient-card p-6 shadow-elegant">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Tavo pažanga</p>
                      <p className="mt-1 font-display text-3xl font-bold">42 / 60 val.</p>
                    </div>
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-accent-foreground">
                      <Award className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-gradient-primary" style={{ width: "70%" }} />
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    {[
                      { label: "Užbaigta", value: "42 val." },
                      { label: "Suplanuota", value: "3 vizitai" },
                    ].map((s)=>(
                      <div key={s.label} className="rounded-2xl border border-border bg-background/50 p-4">
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                        <p className="mt-1 font-display text-lg font-bold">{s.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 space-y-3">
                    {organizations.slice(0,3).map((o)=>(
                      <div key={o.id} className="flex items-center gap-3 rounded-xl bg-background/60 p-3">
                        <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-lg">{o.emoji}</div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{o.name}</p>
                          <p className="text-xs text-muted-foreground">{o.town} · {o.hoursOffered} val.</p>
                        </div>
                        <span className="rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success">Aktyvi</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-y border-border bg-card/40">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-12 sm:px-6 md:grid-cols-4">
          {[
            { icon: Users, value: "12 480", label: "Aktyvių moksleivių" },
            { icon: Building2, value: "320+", label: "Patikrintų organizacijų" },
            { icon: Clock, value: "184 200", label: "Atliktų valandų" },
            { icon: Award, value: "98 %", label: "Patenkintų mokyklų" },
          ].map((s, i)=>(
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -4 }}
              className="text-center"
            >
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
                <s.icon className="h-5 w-5" />
              </div>
              <p className="mt-4 font-display text-3xl font-bold tracking-tight">{s.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">Kaip tai veikia</span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Trys žingsniai iki pirmos valandos</h2>
          <p className="mt-4 text-muted-foreground">Sukurta moksleiviams ir organizacijoms — be skambučių, popierių ar nereikalingo laukimo.</p>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {[
            { icon: Search, title: "Rask organizaciją", desc: "Naršyk pagal miestą, sritį ar laisvas vietas. Visos organizacijos patikrintos." },
            { icon: CalendarCheck, title: "Rezervuok laiką", desc: "Vienu paspaudimu rezervuok savanorystės vizitą tau patogiu metu." },
            { icon: Award, title: "Sukaupk valandas", desc: "Organizacija patvirtina dalyvavimą — valandos automatiškai įskaitomos mokyklai." },
          ].map((s,i)=>(
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <TiltCard>
                <div className="group relative overflow-hidden rounded-3xl border border-border bg-gradient-card p-8 shadow-md transition hover:shadow-elegant">
                  <div className="absolute right-6 top-6 font-display text-6xl font-bold text-muted/30">0{i+1}</div>
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-6 text-xl font-bold">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ORGS SHOWCASE */}
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">Populiariausios</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Organizacijos, kurioms reikia tavęs</h2>
          </div>
          <Link to="/tasks" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
            Visos organizacijos <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {organizations.slice(0,6).map((o, i)=>(
            <motion.div
              key={o.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
            >
              <TiltCard>
                <article className="group rounded-3xl border border-border bg-gradient-card p-6 shadow-md transition hover:shadow-elegant">
                  <div className="flex items-center justify-between">
                    <motion.div whileHover={{ rotate: [0, -8, 8, 0] }} transition={{ duration: 0.6 }} className="grid h-14 w-14 place-items-center rounded-2xl bg-accent text-2xl">{o.emoji}</motion.div>
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
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-hero p-10 text-center shadow-glow sm:p-16">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" aria-hidden />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" aria-hidden />
          <h2 className="relative text-3xl font-bold text-white sm:text-4xl">Pasiruošę pradėti savanorystę?</h2>
          <p className="relative mx-auto mt-3 max-w-xl text-white/80">Prisijunk prie 12 000+ moksleivių, kurie jau atlieka socialines valandas paprastai ir prasmingai.</p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/register" className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-primary transition hover:bg-white/90">Sukurti paskyrą</Link>
            <Link to="/tasks" className="rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20">Naršyti organizacijas</Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
