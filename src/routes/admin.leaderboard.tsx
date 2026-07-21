import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminLeaderboard } from "@/lib/admin-super.functions";
import { Trophy, RefreshCw, Medal, Flame, Users2, Target } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { AdminAurora, SectionHeader, SaaSKpi, SaaSPanel, LivePill } from "@/components/admin/admin-ui";

export const Route = createFileRoute("/admin/leaderboard")({ component: Page });

type Row = Awaited<ReturnType<typeof adminLeaderboard>>["students"][number];

function Page() {
  const fn = useServerFn(adminLeaderboard);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const refresh = async () => {
    setLoading(true);
    try { const r = await fn(); setRows(r.students); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Klaida"); }
    finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, []);

  const stats = useMemo(() => {
    const totalHours = rows.reduce((a, r) => a + (r.hours_earned ?? 0), 0);
    const completed = rows.filter((r) => (r.hours_earned ?? 0) >= (r.hours_needed ?? Infinity) && (r.hours_needed ?? 0) > 0).length;
    const avg = rows.length ? Math.round(totalHours / rows.length) : 0;
    const top = rows[0]?.hours_earned ?? 0;
    return { totalHours, completed, avg, top };
  }, [rows]);

  const filtered = rows.filter((r) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (r.full_name ?? "").toLowerCase().includes(s) || (r.email ?? "").toLowerCase().includes(s) || (r.school_name ?? "").toLowerCase().includes(s);
  });

  const podium = filtered.slice(0, 3);
  const rest = filtered.slice(3);

  return (
    <div className="space-y-6">
      <AdminAurora />
      <SectionHeader
        eyebrow="Mokinių reitingas"
        title="Top mokiniai pagal valandas"
        description="Realaus laiko rikiuotė. Filtruokite pagal mokinį ar mokyklą."
        icon={Trophy}
        action={
          <div className="flex items-center gap-2">
            <LivePill />
            <button onClick={refresh} className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-2 text-xs font-semibold backdrop-blur hover:bg-accent">
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Atnaujinti
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <SaaSKpi icon={Users2} label="Mokinių" value={rows.length} accent="primary" />
        <SaaSKpi icon={Flame} label="Iš viso valandų" value={stats.totalHours} accent="warn" />
        <SaaSKpi icon={Target} label="Pasiekė tikslą" value={stats.completed} accent="success" />
        <SaaSKpi icon={Medal} label="Vidurkis (val.)" value={stats.avg} accent="info" />
      </div>

      {podium.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {podium.map((r, i) => {
            const earned = r.hours_earned ?? 0;
            const needed = r.hours_needed ?? 0;
            const pct = needed > 0 ? Math.min(100, Math.round((earned / needed) * 100)) : 0;
            const rank = ["🥇", "🥈", "🥉"][i];
            const accent = i === 0 ? "warn" : i === 1 ? "info" : "primary";
            return (
              <motion.div key={r.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <SaaSPanel>
                  <div className="flex items-start justify-between">
                    <span className="text-3xl">{rank}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${accent === "warn" ? "bg-amber-500/15 text-amber-400" : accent === "info" ? "bg-cyan-500/15 text-cyan-400" : "bg-primary/15 text-primary"}`}>#{i + 1}</span>
                  </div>
                  <p className="mt-3 truncate font-display text-lg font-bold">{r.full_name ?? "—"}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.school_name ?? r.email ?? "—"}</p>
                  <div className="mt-4 flex items-baseline gap-1.5">
                    <span className="font-display text-3xl font-bold tabular-nums">{earned}</span>
                    <span className="text-xs text-muted-foreground">/ {needed || "?"} val.</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: 0.1 + i * 0.06, ease: "easeOut" }} className="h-full bg-gradient-primary" />
                  </div>
                </SaaSPanel>
              </motion.div>
            );
          })}
        </div>
      )}

      <SaaSPanel padded={false}>
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 p-3">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ieškoti mokinio, mokyklos…" className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-background/60 px-3 text-sm outline-none focus:border-primary/50" />
          <span className="text-[11px] text-muted-foreground">{filtered.length} rezultatai</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="border-b border-border/60 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Mokinys</th>
                <th className="hidden px-4 py-3 sm:table-cell">Mokykla</th>
                <th className="px-4 py-3 text-right">Valandos</th>
                <th className="px-4 py-3 text-right">Progresas</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="py-10 text-center text-muted-foreground">Kraunama…</td></tr>}
              {!loading && rest.length === 0 && podium.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-muted-foreground">Tuščia.</td></tr>}
              {rest.map((r, i) => {
                const earned = r.hours_earned ?? 0;
                const needed = r.hours_needed ?? 0;
                const pct = needed > 0 ? Math.min(100, Math.round((earned / needed) * 100)) : 0;
                return (
                  <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 20) * 0.015 }} className="border-b border-border/40 last:border-0 hover:bg-accent/20">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{i + 4}</td>
                    <td className="px-4 py-3">
                      <p className="truncate font-semibold">{r.full_name ?? "—"}</p>
                      <p className="truncate text-xs text-muted-foreground">{r.email}</p>
                    </td>
                    <td className="hidden px-4 py-3 text-xs text-muted-foreground sm:table-cell">{r.school_name ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{earned}<span className="text-muted-foreground">/{needed}</span></td>
                    <td className="px-4 py-3 text-right">
                      <div className="ml-auto flex w-24 items-center gap-2 sm:w-32">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div className="h-full bg-gradient-primary" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-8 text-right text-[11px] font-semibold tabular-nums">{pct}%</span>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SaaSPanel>
    </div>
  );
}
