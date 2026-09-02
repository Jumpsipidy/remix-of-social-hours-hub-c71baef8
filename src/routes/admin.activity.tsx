import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AdminProfile, AdminReservation } from "@/lib/admin-shared";
import { STATUS_LT } from "@/lib/admin-shared";
import { AlarmClock, PlayCircle, CheckCircle2, XCircle, Activity as Pulse } from "lucide-react";
import { motion } from "framer-motion";
import { ListSkeleton } from "@/components/skeleton-loader";

export const Route = createFileRoute("/admin/activity")({ component: ActivityPage });

const ICON: Record<string, typeof AlarmClock> = {
  pending: AlarmClock, approved: PlayCircle, completed: CheckCircle2, confirmed: CheckCircle2, declined: XCircle,
};
const STATUS_META: Record<string, { color: string; ring: string; glow: string }> = {
  pending: { color: "text-amber-300", ring: "border-amber-500/50 bg-amber-500/10", glow: "shadow-[0_0_20px_-2px_theme(colors.amber.400)]" },
  approved: { color: "text-cyan-300", ring: "border-cyan-500/50 bg-cyan-500/10", glow: "shadow-[0_0_20px_-2px_theme(colors.cyan.400)]" },
  completed: { color: "text-emerald-300", ring: "border-emerald-500/50 bg-emerald-500/10", glow: "shadow-[0_0_20px_-2px_theme(colors.emerald.400)]" },
  confirmed: { color: "text-emerald-300", ring: "border-emerald-500/50 bg-emerald-500/10", glow: "shadow-[0_0_20px_-2px_theme(colors.emerald.400)]" },
  declined: { color: "text-rose-300", ring: "border-rose-500/50 bg-rose-500/10", glow: "shadow-[0_0_20px_-2px_theme(colors.rose.400)]" },
};

// Timeline / stream aesthetic. Vertical spine, connected nodes, day dividers.
function ActivityPage() {
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "completed" | "declined">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [p, r] = await Promise.all([
        supabase.from("profiles").select("id, role, full_name, organization_name, email, hours_earned, hours_needed"),
        supabase.from("reservations").select("id, status, hours_to_earn, reservation_date, organization_id, student_id, created_at").order("created_at", { ascending: false }).limit(200),
      ]);
      setProfiles((p.data as AdminProfile[]) ?? []);
      setReservations((r.data as AdminReservation[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const map = useMemo(() => { const m: Record<string, AdminProfile> = {}; profiles.forEach((p) => (m[p.id] = p)); return m; }, [profiles]);

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, completed: 0, declined: 0 };
    reservations.forEach((r) => {
      if (r.status === "pending") c.pending++;
      else if (r.status === "approved") c.approved++;
      else if (r.status === "completed" || r.status === "confirmed") c.completed++;
      else if (r.status === "declined") c.declined++;
    });
    return c;
  }, [reservations]);

  const shown = reservations.filter((r) => {
    if (filter === "all") return true;
    if (filter === "completed") return r.status === "completed" || r.status === "confirmed";
    return r.status === filter;
  });

  // Group by date bucket for the day dividers
  const buckets = useMemo(() => {
    const g = new Map<string, AdminReservation[]>();
    shown.forEach((r) => {
      const d = new Date(r.created_at);
      const key = d.toLocaleDateString("lt-LT", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      const arr = g.get(key) ?? [];
      arr.push(r); g.set(key, arr);
    });
    return Array.from(g.entries());
  }, [shown]);

  const total = counts.pending + counts.approved + counts.completed + counts.declined || 1;
  const pct = {
    pending: (counts.pending / total) * 100,
    approved: (counts.approved / total) * 100,
    completed: (counts.completed / total) * 100,
    declined: (counts.declined / total) * 100,
  };

  return (
    <div className="space-y-6">
      {/* Cover header with stacked bar */}
      <div className="relative overflow-hidden rounded-3xl border border-cyan-500/25 bg-gradient-to-br from-indigo-500/10 via-cyan-500/5 to-teal-500/10 p-5 backdrop-blur-xl">
        <div className="absolute -left-24 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-cyan-300">Realaus laiko srautas</p>
            <h1 className="mt-1 flex items-center gap-2 font-display text-2xl font-bold sm:text-3xl">
              <Pulse className="h-6 w-6 text-cyan-300" /> Aktyvumo linija
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Chronologinė kiekvienos rezervacijos kelionė nuo užklausos iki uždarymo.</p>
          </div>
          <div className="min-w-[240px] flex-1 sm:max-w-md">
            <div className="mb-1 flex justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Būsenų proporcijos</span><span>{reservations.length} įrašai</span>
            </div>
            <div className="flex h-3 overflow-hidden rounded-full bg-background/40 ring-1 ring-inset ring-border/60">
              <div className="h-full bg-amber-500" style={{ width: `${pct.pending}%` }} title={`Laukia: ${counts.pending}`} />
              <div className="h-full bg-cyan-500" style={{ width: `${pct.approved}%` }} title={`Vykdoma: ${counts.approved}`} />
              <div className="h-full bg-emerald-500" style={{ width: `${pct.completed}%` }} title={`Baigta: ${counts.completed}`} />
              <div className="h-full bg-rose-500" style={{ width: `${pct.declined}%` }} title={`Atmesta: ${counts.declined}`} />
            </div>
            <div className="mt-2 grid grid-cols-4 gap-2 text-center text-[10px]">
              {[
                { l: "Laukia", v: counts.pending, c: "text-amber-300" },
                { l: "Vykdoma", v: counts.approved, c: "text-cyan-300" },
                { l: "Baigta", v: counts.completed, c: "text-emerald-300" },
                { l: "Atmesta", v: counts.declined, c: "text-rose-300" },
              ].map((s) => (
                <div key={s.l}>
                  <p className={`font-display text-lg font-bold tabular-nums ${s.c}`}>{s.v}</p>
                  <p className="uppercase tracking-widest text-muted-foreground">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Filter chips */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {(["all", "pending", "approved", "completed", "declined"] as const).map((k) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              filter === k ? "bg-gradient-primary text-primary-foreground shadow-glow" : "border border-border bg-card/60 text-muted-foreground hover:text-foreground"
            }`}>
            {k === "all" ? "Visos" : STATUS_LT[k]}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="relative">
        {loading && <ListSkeleton rows={6} className="py-4" />}
        {!loading && shown.length === 0 && (
          <p className="rounded-3xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">Nėra rezervacijų.</p>
        )}
        <div className="relative pl-8 sm:pl-12">
          {/* Spine */}
          <div className="pointer-events-none absolute left-3 top-4 bottom-4 w-px bg-gradient-to-b from-cyan-500/60 via-cyan-500/30 to-transparent sm:left-5" />

          {buckets.map(([day, items], di) => (
            <section key={day} className="relative mb-8">
              <div className="sticky top-32 z-10 -ml-8 mb-3 flex items-center gap-2 sm:-ml-12">
                <div className="grid h-6 w-6 place-items-center rounded-full border border-cyan-500/40 bg-background text-[10px] font-bold text-cyan-300 sm:h-10 sm:w-10 sm:text-xs">
                  {items.length}
                </div>
                <p className="rounded-full border border-border/70 bg-card/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground backdrop-blur">
                  {day}
                </p>
              </div>

              <div className="space-y-3">
                {items.map((r, i) => {
                  const Icon = ICON[r.status] ?? AlarmClock;
                  const meta = STATUS_META[r.status] ?? STATUS_META.pending;
                  const orgN = map[r.organization_id]?.organization_name ?? map[r.organization_id]?.full_name ?? "—";
                  const stN = map[r.student_id]?.full_name ?? "Mokinys";
                  return (
                    <motion.article
                      key={r.id}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min((di * items.length + i) * 0.01, 0.4), type: "spring", stiffness: 260, damping: 26 }}
                      className="group relative"
                    >
                      {/* node on spine */}
                      <div className={`absolute -left-[26px] top-4 grid h-6 w-6 place-items-center rounded-full border-2 bg-background ${meta.ring} ${meta.glow} sm:-left-[34px]`}>
                        <Icon className={`h-3 w-3 ${meta.color}`} />
                      </div>
                      {/* connector line */}
                      <div className={`absolute -left-5 top-7 hidden h-px w-5 bg-cyan-500/30 sm:block`} />

                      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-3.5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.5)] backdrop-blur-xl transition hover:border-cyan-500/40 sm:p-4">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${meta.ring} ${meta.color}`}>
                            {STATUS_LT[r.status] ?? r.status}
                          </span>
                          <span className="rounded-md bg-background/50 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-muted-foreground">
                            {Number(r.hours_to_earn)}h
                          </span>
                          <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
                            {new Date(r.created_at).toLocaleTimeString("lt-LT", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="mt-1.5 truncate text-sm">
                          <span className="font-semibold">{stN}</span>
                          <span className="mx-2 text-cyan-400/70">→</span>
                          <span className="font-semibold">{orgN}</span>
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">Data: {r.reservation_date}</p>
                      </div>
                    </motion.article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
