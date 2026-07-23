import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Activity, Gauge, TrendingUp, Wifi, WifiOff, Clock } from "lucide-react";
import { getPerformanceStats } from "@/lib/monitoring.functions";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from "recharts";

export const Route = createFileRoute("/admin/performance")({
  head: () => ({ meta: [{ title: "Performance & Uptime — Admin" }] }),
  component: PerformancePage,
});

type Stats = Awaited<ReturnType<typeof getPerformanceStats>>;

function ratingColor(metric: string, p75: number) {
  const t: Record<string, [number, number]> = {
    LCP: [2500, 4000],
    INP: [200, 500],
    CLS: [0.1, 0.25],
    FCP: [1800, 3000],
    TTFB: [800, 1800],
  };
  const [good, poor] = t[metric] ?? [Infinity, Infinity];
  if (p75 <= good) return { color: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/40", label: "Geras" };
  if (p75 <= poor) return { color: "text-amber-300", bg: "bg-amber-500/10", border: "border-amber-500/40", label: "Vidutinis" };
  return { color: "text-rose-300", bg: "bg-rose-500/10", border: "border-rose-500/40", label: "Blogas" };
}

function PerformancePage() {
  const fetchStats = useServerFn(getPerformanceStats);
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["perf-stats", 24],
    queryFn: () => fetchStats({ data: { hours: 24 } }),
    refetchInterval: 30_000,
  });

  const s = data as Stats | undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">📊 Performance & Uptime</h1>
          <p className="text-sm text-muted-foreground">Realaus laiko Web Vitals + svetainės pasiekiamumas (paskutinės 24h)</p>
        </div>
        <button
          onClick={() => refetch()}
          className="rounded-lg border border-border bg-card/60 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-primary/10"
        >
          {isFetching ? "Atnaujinama…" : "Atnaujinti"}
        </button>
      </div>

      {isLoading && <div className="rounded-2xl border border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">Kraunama…</div>}

      {s && (
        <>
          {/* Uptime hero */}
          <UptimeHero s={s} />

          {/* Web Vitals summary */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {s.vitals.summary.map((m) => {
              const r = ratingColor(m.metric, m.p75);
              return (
                <motion.div
                  key={m.metric}
                  whileHover={{ y: -2 }}
                  className={`rounded-2xl border ${r.border} ${r.bg} p-4`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{m.metric}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${r.border} ${r.color}`}>{r.label}</span>
                  </div>
                  <div className={`mt-2 text-3xl font-bold ${r.color}`}>
                    {m.metric === "CLS" ? (m.p75 / 1000).toFixed(3) : `${m.p75}${m.metric === "CLS" ? "" : "ms"}`}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">P75 · {m.count} matavimų</div>
                  <div className="mt-2 flex gap-3 text-[10px] text-muted-foreground">
                    <span>P50: {m.metric === "CLS" ? (m.p50 / 1000).toFixed(3) : m.p50}</span>
                    <span>P95: {m.metric === "CLS" ? (m.p95 / 1000).toFixed(3) : m.p95}</span>
                  </div>
                </motion.div>
              );
            })}
            {s.vitals.summary.length === 0 && (
              <div className="col-span-full rounded-2xl border border-border bg-card/40 p-6 text-center text-sm text-muted-foreground">
                Kol kas nėra Web Vitals duomenų. Vartotojams naršant, čia atsiras metrikos.
              </div>
            )}
          </div>

          {/* Slowest routes */}
          <div className="rounded-2xl border border-border bg-card/60 p-4">
            <h2 className="mb-3 text-sm font-bold text-foreground flex items-center gap-2">
              <Gauge className="h-4 w-4 text-primary" /> Lėčiausi puslapiai (LCP P75)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-[10px] uppercase text-muted-foreground">
                    <th className="py-2 text-left">Route</th>
                    <th className="py-2 text-right">LCP P75</th>
                    <th className="py-2 text-right">INP P75</th>
                    <th className="py-2 text-right">CLS P75</th>
                    <th className="py-2 text-right">Matavimai</th>
                  </tr>
                </thead>
                <tbody>
                  {s.vitals.routes.map((r) => {
                    const lcpR = ratingColor("LCP", r.lcp_p75);
                    return (
                      <tr key={r.route} className="border-b border-border/30 hover:bg-primary/5">
                        <td className="py-2 font-mono text-[12px]">{r.route}</td>
                        <td className={`py-2 text-right font-bold ${lcpR.color}`}>{r.lcp_p75}ms</td>
                        <td className="py-2 text-right">{r.inp_p75}ms</td>
                        <td className="py-2 text-right">{r.cls_p75}</td>
                        <td className="py-2 text-right text-muted-foreground">{r.samples}</td>
                      </tr>
                    );
                  })}
                  {s.vitals.routes.length === 0 && (
                    <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">Nėra duomenų</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function UptimeHero({ s }: { s: Stats }) {
  const up = s.uptime;
  const ok = up.percentage >= 99.5;
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <motion.div
        whileHover={{ scale: 1.01 }}
        className={`rounded-2xl border p-5 lg:col-span-1 ${ok ? "border-emerald-500/40 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent" : "border-rose-500/40 bg-gradient-to-br from-rose-500/15 via-rose-500/5 to-transparent"}`}
      >
        <div className="flex items-center gap-2">
          {ok ? <Wifi className="h-5 w-5 text-emerald-300" /> : <WifiOff className="h-5 w-5 text-rose-300" />}
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Uptime (24h)</span>
        </div>
        <div className={`mt-3 text-5xl font-bold ${ok ? "text-emerald-300" : "text-rose-300"}`}>
          {up.percentage.toFixed(2)}%
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border border-border/40 bg-background/40 p-2">
            <div className="text-[10px] uppercase text-muted-foreground">Ping</div>
            <div className="font-bold text-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {up.avg_latency}ms</div>
          </div>
          <div className="rounded-lg border border-border/40 bg-background/40 p-2">
            <div className="text-[10px] uppercase text-muted-foreground">Patikros</div>
            <div className="font-bold text-foreground">{up.total}</div>
          </div>
        </div>
        {up.last_check && (
          <div className="mt-3 text-[11px] text-muted-foreground">
            Paskutinė: {new Date(up.last_check.checked_at).toLocaleString("lt-LT")} · {up.last_check.status_code ?? "?"}
          </div>
        )}
      </motion.div>

      <div className="rounded-2xl border border-border bg-card/60 p-4 lg:col-span-2">
        <h2 className="mb-2 text-sm font-bold text-foreground flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" /> Ping istorija & latencija
        </h2>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={up.chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="hour" tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(h: string) => h.slice(11, 16)} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 8, fontSize: 12 }}
                labelFormatter={(h: string) => new Date(h).toLocaleString("lt-LT")}
              />
              <Line type="monotone" dataKey="avg_latency" stroke="#6366f1" strokeWidth={2} dot={false} name="Latency (ms)" />
              <Line type="monotone" dataKey="fail" stroke="#f43f5e" strokeWidth={2} dot={false} name="Fails" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
