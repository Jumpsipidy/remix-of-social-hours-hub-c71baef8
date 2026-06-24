import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell } from "../components/layout";
import { pendingRequests, orgStats, completedVolunteers } from "../lib/mock-data";
import { Clock, CheckCircle2, Users, TrendingUp, Check, X, Star, Inbox } from "lucide-react";

export const Route = createFileRoute("/organization")({
  head: () => ({
    meta: [
      { title: "Organizacijos sritis — Socialinės Valandos" },
      { name: "description", content: "Tvarkyk savanorystės užklausas ir stebėk savo organizacijos statistiką." },
    ],
  }),
  component: OrgDashboard,
});

function OrgDashboard() {
  const [requests, setRequests] = useState(pendingRequests);
  const [toast, setToast] = useState<string | null>(null);

  const handle = (id: string, action: "approve" | "reject") => {
    setRequests((p) => p.filter((r) => r.id !== id));
    setToast(action === "approve" ? "Užklausa patvirtinta" : "Užklausa atmesta");
    setTimeout(() => setToast(null), 2000);
  };

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Organizacijos sritis</p>
            <h1 className="mt-1 truncate text-3xl font-bold tracking-tight sm:text-4xl">Vilniaus gyvūnų globos namai</h1>
            <p className="mt-1 text-sm text-muted-foreground">Vilnius · Gyvūnai · Aktyvi nuo 2024</p>
          </div>
          <span className="shrink-0 rounded-full bg-success/15 px-3 py-1.5 text-xs font-semibold text-success">● Online</span>
        </div>
      </section>

      <section className="mx-auto mt-8 max-w-7xl px-4 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Inbox, label: "Laukia patvirtinimo", value: requests.length, tone: "warning" },
            { icon: CheckCircle2, label: "Patvirtinta šį mėn.", value: orgStats.approvedMonth },
            { icon: Clock, label: "Suteikta valandų", value: orgStats.hoursDelivered },
            { icon: Users, label: "Aktyvūs savanoriai", value: orgStats.activeVolunteers },
          ].map((s) => (
            <div key={s.label} className="rounded-3xl border border-border bg-gradient-card p-6 shadow-md">
              <div className="flex items-center justify-between">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
                  <s.icon className="h-5 w-5" />
                </div>
                <TrendingUp className="h-4 w-4 text-success" />
              </div>
              <p className="mt-5 font-display text-3xl font-bold">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-6 grid max-w-7xl gap-6 px-4 pb-12 sm:px-6 lg:grid-cols-5">
        {/* PENDING */}
        <div className="rounded-3xl border border-border bg-gradient-card p-6 shadow-md lg:col-span-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Laukiančios užklausos</h2>
              <p className="text-xs text-muted-foreground">Patvirtink arba atmesk moksleivių rezervacijas</p>
            </div>
            <span className="rounded-full bg-warning/20 px-3 py-1 text-xs font-semibold text-warning-foreground">{requests.length} naujos</span>
          </div>

          <div className="mt-6 space-y-3">
            {requests.map((r) => (
              <div key={r.id} className="rounded-2xl border border-border bg-background/60 p-4">
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:flex-wrap sm:justify-between">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-primary text-sm font-bold text-primary-foreground">
                    {r.student.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{r.student}</p>
                    <p className="truncate text-xs text-muted-foreground">{r.school}</p>
                  </div>
                  <div className="col-span-2 mt-2 flex items-center justify-between gap-2 sm:col-span-1 sm:mt-0">
                    <div className="text-right text-xs text-muted-foreground sm:text-sm">
                      <p className="font-medium text-foreground">{r.date}</p>
                      <p>{r.hours} val.</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => handle(r.id, "approve")}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-success px-4 py-2 text-sm font-semibold text-success-foreground transition hover:opacity-90"
                  >
                    <Check className="h-4 w-4" /> Patvirtinti
                  </button>
                  <button
                    onClick={() => handle(r.id, "reject")}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="h-4 w-4" /> Atmesti
                  </button>
                </div>
              </div>
            ))}
            {requests.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center">
                <p className="text-sm font-semibold">Visos užklausos apdorotos 🎉</p>
                <p className="mt-1 text-xs text-muted-foreground">Naujos užklausos atsiras čia automatiškai.</p>
              </div>
            )}
          </div>
        </div>

        {/* COMPLETED */}
        <div className="rounded-3xl border border-border bg-gradient-card p-6 shadow-md lg:col-span-2">
          <h2 className="text-lg font-bold">Užbaigtos valandos</h2>
          <p className="text-xs text-muted-foreground">Paskutiniai patvirtinti savanoriai</p>
          <div className="mt-5 space-y-3">
            {completedVolunteers.map((c) => (
              <div key={c.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-background/60 p-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                  {c.student.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c.student}</p>
                  <p className="text-xs text-muted-foreground">{c.date} · {c.hours} val.</p>
                </div>
                <span className="flex shrink-0 items-center gap-0.5 text-warning">
                  {[...Array(c.rating)].map((_, i) => (
                    <Star key={i} className="h-3 w-3" fill="currentColor" />
                  ))}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background shadow-elegant animate-fade-up">
          {toast}
        </div>
      )}
    </PageShell>
  );
}
