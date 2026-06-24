import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "../components/layout";
import { studentStats, upcomingReservations, recentActivity } from "../lib/mock-data";
import { Clock, Target, CalendarCheck, Building2, TrendingUp, CheckCircle2, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/student")({
  head: () => ({
    meta: [
      { title: "Mokinio sritis — Socialinės Valandos" },
      { name: "description", content: "Stebėk sukauptas valandas, suplanuotus vizitus ir savanorystės progresą." },
    ],
  }),
  component: StudentDashboard,
});

function StudentDashboard() {
  const progress = Math.round((studentStats.completed / studentStats.required) * 100);
  const remaining = studentStats.required - studentStats.completed;

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Mokinio sritis</p>
            <h1 className="mt-1 truncate text-3xl font-bold tracking-tight sm:text-4xl">Sveika, Emilija 👋</h1>
            <p className="mt-1 text-sm text-muted-foreground">Vilniaus Žemynos gimnazija · 11a klasė</p>
          </div>
          <Link to="/organizations" className="shrink-0 rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow">
            + Rezervuoti
          </Link>
        </div>
      </section>

      {/* STATS GRID */}
      <section className="mx-auto mt-8 max-w-7xl px-4 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Clock, label: "Užbaigtos valandos", value: `${studentStats.completed}`, sub: `iš ${studentStats.required} reikalingų`, tone: "primary" },
            { icon: Target, label: "Liko valandų", value: `${remaining}`, sub: `dar 4 vizitai`, tone: "warning" },
            { icon: CalendarCheck, label: "Suplanuoti vizitai", value: `${studentStats.upcoming}`, sub: `artimiausias birželio 28`, tone: "success" },
            { icon: Building2, label: "Organizacijos", value: `${studentStats.organizations}`, sub: `bendradarbiauta`, tone: "accent" },
          ].map((s)=>(
            <div key={s.label} className="rounded-3xl border border-border bg-gradient-card p-6 shadow-md">
              <div className="flex items-center justify-between">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
                  <s.icon className="h-5 w-5" />
                </div>
                <TrendingUp className="h-4 w-4 text-success" />
              </div>
              <p className="mt-5 font-display text-3xl font-bold">{s.value}</p>
              <p className="text-sm font-medium text-foreground">{s.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PROGRESS */}
      <section className="mx-auto mt-6 max-w-7xl px-4 sm:px-6">
        <div className="rounded-3xl border border-border bg-gradient-card p-8 shadow-md">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Metinė pažanga</p>
              <p className="mt-1 font-display text-2xl font-bold">{progress}% iki tikslo</p>
            </div>
            <p className="text-sm text-muted-foreground">{studentStats.completed} / {studentStats.required} val.</p>
          </div>
          <div className="mt-6 h-3 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-gradient-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-muted-foreground">
            <span>0 val.</span>
            <span className="text-center">30 val.</span>
            <span className="text-right">60 val.</span>
          </div>
        </div>
      </section>

      {/* TWO COLUMNS */}
      <section className="mx-auto mt-6 grid max-w-7xl gap-6 px-4 pb-12 sm:px-6 lg:grid-cols-5">
        <div className="rounded-3xl border border-border bg-gradient-card p-6 shadow-md lg:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Suplanuoti vizitai</h2>
            <Link to="/organizations" className="text-xs font-semibold text-primary hover:underline">Naujas vizitas</Link>
          </div>
          <div className="mt-5 space-y-3">
            {upcomingReservations.map((r)=>(
              <div key={r.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border border-border bg-background/60 p-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent">
                  <CalendarCheck className="h-5 w-5 text-accent-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{r.org}</p>
                  <p className="text-xs text-muted-foreground">{r.date} · {r.hours} val.</p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                  r.status === "Patvirtinta"
                    ? "bg-success/15 text-success"
                    : "bg-warning/20 text-warning-foreground"
                }`}>{r.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-gradient-card p-6 shadow-md lg:col-span-2">
          <h2 className="text-lg font-bold">Paskutinė veikla</h2>
          <div className="mt-5 space-y-4">
            {recentActivity.map((a)=>(
              <div key={a.id} className="flex items-start gap-3">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-success/15 text-success">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.org}</p>
                  <p className="text-xs text-muted-foreground">{a.date} · +{a.hours} val.</p>
                </div>
              </div>
            ))}
          </div>
          <Link to="/organizations" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-semibold transition hover:bg-accent">
            Rasti daugiau vietų <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
