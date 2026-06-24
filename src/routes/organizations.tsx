import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageShell } from "../components/layout";
import { organizations, towns, type Organization } from "../lib/mock-data";
import { Search, MapPin, Star, Users, Clock } from "lucide-react";
import { TiltCard } from "../components/tilt-card";
import { ReservationDialog } from "../components/reservation-dialog";

export const Route = createFileRoute("/organizations")({
  head: () => ({
    meta: [
      { title: "Organizacijos — Socialinės Valandos" },
      { name: "description", content: "Naršyk patikrintas organizacijas Lietuvoje ir rezervuok savanorystės valandas." },
    ],
  }),
  component: OrganizationsPage,
});

type Reservation = { date: string; time: string; spots: number };

function OrganizationsPage() {
  const [q, setQ] = useState("");
  const [town, setTown] = useState("Visi miestai");
  const [reservations, setReservations] = useState<Record<string, Reservation>>({});
  const [activeOrg, setActiveOrg] = useState<Organization | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return organizations.filter((o) => {
      const matchesQ = !q || o.name.toLowerCase().includes(q.toLowerCase()) || o.category.toLowerCase().includes(q.toLowerCase());
      const matchesTown = town === "Visi miestai" || o.town === town;
      return matchesQ && matchesTown;
    });
  }, [q, town]);

  const handleConfirm = (details: { date: string; time: string; spots: number; note: string }) => {
    if (!activeOrg) return;
    setReservations((p) => ({ ...p, [activeOrg.id]: details }));
    setToast(`Rezervacija patvirtinta: ${activeOrg.name}`);
    setActiveOrg(null);
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <PageShell>
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-mesh opacity-60" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">Katalogas</span>
            <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">Patikrintos organizacijos</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">{organizations.length} organizacijų laukia tavo pagalbos. Pasirink miestą, sritį ir rezervuok laiką.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-8 grid gap-3 rounded-2xl border border-border bg-card/80 p-3 backdrop-blur sm:grid-cols-[1fr_auto]"
          >
            <div className="flex items-center gap-3 rounded-xl bg-background px-4 transition focus-within:ring-2 focus-within:ring-primary/40">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Ieškoti pagal pavadinimą ar sritį..."
                className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-background px-4">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <select
                value={town}
                onChange={(e) => setTown(e.target.value)}
                className="h-12 bg-transparent pr-2 text-sm outline-none"
              >
                {towns.map((t) => (<option key={t} value={t}>{t}</option>))}
              </select>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <p className="mb-6 text-sm text-muted-foreground">
          Rodoma <span className="font-semibold text-foreground">{filtered.length}</span> organizacijų
        </p>
        <motion.div layout className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((o, i) => {
              const r = reservations[o.id];
              return (
                <motion.div
                  key={o.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.35, delay: i * 0.04 }}
                >
                  <TiltCard className="h-full">
                    <article className="flex h-full flex-col rounded-3xl border border-border bg-gradient-card p-6 shadow-md">
                      <div className="flex items-start justify-between gap-3">
                        <motion.div
                          whileHover={{ rotate: [0, -8, 8, 0] }}
                          transition={{ duration: 0.6 }}
                          className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-accent text-2xl"
                        >
                          {o.emoji}
                        </motion.div>
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

                      <AnimatePresence mode="wait">
                        {r ? (
                          <motion.div
                            key="reserved"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="mt-5 rounded-2xl border border-success/30 bg-success/10 p-3 text-xs"
                          >
                            <p className="font-semibold text-success">✓ Rezervuota</p>
                            <p className="mt-1 flex items-center gap-2 text-muted-foreground">
                              <Clock className="h-3 w-3" /> {r.date} · {r.time} · {r.spots} v.
                            </p>
                            <button
                              onClick={() => setActiveOrg(o)}
                              className="mt-2 text-xs font-semibold text-primary hover:underline"
                            >
                              Keisti detales
                            </button>
                          </motion.div>
                        ) : (
                          <motion.button
                            key="reserve"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => setActiveOrg(o)}
                            className="mt-5 w-full rounded-full bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
                          >
                            Rezervuoti
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </article>
                  </TiltCard>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>

        {filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-12 rounded-3xl border border-dashed border-border p-12 text-center"
          >
            <p className="text-lg font-semibold">Nieko nerasta</p>
            <p className="mt-2 text-sm text-muted-foreground">Pakeisk paieškos kriterijus ir bandyk dar kartą.</p>
          </motion.div>
        )}
      </section>

      <ReservationDialog org={activeOrg} onClose={() => setActiveOrg(null)} onConfirm={handleConfirm} />

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 20, x: "-50%" }}
            className="fixed bottom-6 left-1/2 z-50 rounded-full border border-border bg-card px-5 py-3 text-sm font-semibold shadow-elegant"
          >
            ✓ {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}
