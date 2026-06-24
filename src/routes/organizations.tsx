import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageShell } from "../components/layout";
import { organizations, towns } from "../lib/mock-data";
import { Search, MapPin, Star, Users } from "lucide-react";

export const Route = createFileRoute("/organizations")({
  head: () => ({
    meta: [
      { title: "Organizacijos — Socialinės Valandos" },
      { name: "description", content: "Naršyk patikrintas organizacijas Lietuvoje ir rezervuok savanorystės valandas." },
    ],
  }),
  component: OrganizationsPage,
});

function OrganizationsPage() {
  const [q, setQ] = useState("");
  const [town, setTown] = useState("Visi miestai");
  const [reserved, setReserved] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    return organizations.filter((o) => {
      const matchesQ = !q || o.name.toLowerCase().includes(q.toLowerCase()) || o.category.toLowerCase().includes(q.toLowerCase());
      const matchesTown = town === "Visi miestai" || o.town === town;
      return matchesQ && matchesTown;
    });
  }, [q, town]);

  return (
    <PageShell>
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-mesh opacity-60" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">Katalogas</span>
          <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">Patikrintos organizacijos</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">{organizations.length} organizacijų laukia tavo pagalbos. Pasirink miestą, sritį ir rezervuok laiką.</p>

          <div className="mt-8 grid gap-3 rounded-2xl border border-border bg-card/80 p-3 backdrop-blur sm:grid-cols-[1fr_auto]">
            <div className="flex items-center gap-3 rounded-xl bg-background px-4">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e)=>setQ(e.target.value)}
                placeholder="Ieškoti pagal pavadinimą ar sritį..."
                className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-background px-4">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <select
                value={town}
                onChange={(e)=>setTown(e.target.value)}
                className="h-12 bg-transparent pr-2 text-sm outline-none"
              >
                {towns.map((t)=>(<option key={t} value={t}>{t}</option>))}
              </select>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <p className="mb-6 text-sm text-muted-foreground">Rodoma <span className="font-semibold text-foreground">{filtered.length}</span> organizacijų</p>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((o)=>(
            <article key={o.id} className="group flex flex-col rounded-3xl border border-border bg-gradient-card p-6 shadow-md transition hover:-translate-y-1 hover:shadow-elegant">
              <div className="flex items-start justify-between gap-3">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-accent text-2xl">{o.emoji}</div>
                <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-medium text-success">{o.spotsLeft} vietos</span>
              </div>
              <h3 className="mt-5 text-lg font-bold leading-tight">{o.name}</h3>
              <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {o.town}</span>
                <span>·</span>
                <span>{o.category}</span>
              </div>
              <p className="mt-3 flex-1 text-sm text-muted-foreground">{o.description}</p>
              <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-warning" fill="currentColor" /> {o.rating}</span>
                <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {o.totalVolunteers}</span>
                <span className="font-semibold text-foreground">{o.hoursOffered} val./viz.</span>
              </div>
              <button
                onClick={()=>setReserved((p)=>({...p,[o.id]:!p[o.id]}))}
                disabled={reserved[o.id]}
                className={`mt-5 w-full rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                  reserved[o.id]
                    ? "bg-success/20 text-success"
                    : "bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
                }`}
              >
                {reserved[o.id] ? "✓ Rezervuota" : "Rezervuoti"}
              </button>
            </article>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="mt-12 rounded-3xl border border-dashed border-border p-12 text-center">
            <p className="text-lg font-semibold">Nieko nerasta</p>
            <p className="mt-2 text-sm text-muted-foreground">Pakeisk paieškos kriterijus ir bandyk dar kartą.</p>
          </div>
        )}
      </section>
    </PageShell>
  );
}
