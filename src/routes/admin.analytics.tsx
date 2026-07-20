import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence, useMotionValue, useTransform, animate, useSpring } from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  RadialBarChart,
  RadialBar,
  Brush,
} from "recharts";
import { adminAnalytics } from "@/lib/admin-super.functions";
import {
  BarChart3,
  RefreshCw,
  TrendingUp,
  LogIn,
  LogOut,
  Eye,
  Users,
  Download,
  Sparkles,
  Zap,
  Clock,
  ArrowUp,
  ArrowDown,
  Activity as ActivityIcon,
  Globe,
  Target,
  X,
  LineChart as LineIcon,
  AreaChart as AreaIcon,
  BarChart2,
  MousePointerClick,
  Maximize2,
} from "lucide-react";
import { KpiDetailModal, type KpiKind } from "@/components/analytics-kpi-detail";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/analytics")({ component: Page });

type Data = Awaited<ReturnType<typeof adminAnalytics>>;
type Range = 7 | 14 | 30;

const C = {
  cyan: "#06b6d4",
  emerald: "#10b981",
  rose: "#f43f5e",
  amber: "#f59e0b",
  violet: "#a855f7",
  indigo: "#6366f1",
  primary: "#8b5cf6",
  pink: "#ec4899",
};
const PIE = [C.violet, C.cyan, C.emerald, C.amber, C.rose, C.pink];

const dayKey = (iso: string) => iso.slice(0, 10);
const hourKey = (iso: string) => Number(iso.slice(11, 13));
const weekdayKey = (iso: string) => new Date(iso).getDay(); // 0 Sun … 6 Sat
const WD = ["Sk", "Pr", "An", "Tr", "Kt", "Pn", "Št"];

function downloadCsv(filename: string, rows: Record<string, string | number>[]) {
  if (!rows.length) return toast.error("Nėra duomenų eksportui");
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(",")]
    .concat(rows.map((r) => headers.map((h) => esc(r[h])).join(",")))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("CSV atsisiųsta");
}

// -------- Animated number ---------------------------------------------------
function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) =>
    decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString("lt-LT"),
  );
  useEffect(() => {
    const controls = animate(mv, value, { duration: 1.1, ease: [0.22, 1, 0.36, 1] });
    return controls.stop;
  }, [value, mv]);
  return <motion.span>{rounded}</motion.span>;
}

// -------- Custom recharts tooltip ------------------------------------------
function GlassTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/10 bg-black/80 px-3 py-2 text-xs shadow-2xl backdrop-blur-md"
    >
      {label != null && <p className="mb-1.5 font-semibold text-white/90">{label}</p>}
      <div className="space-y-1">
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: p.color, boxShadow: `0 0 8px ${p.color}` }}
            />
            <span className="text-white/70">{p.name}</span>
            <span className="ml-auto font-bold text-white">{Number(p.value).toLocaleString("lt-LT")}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function Page() {
  const fn = useServerFn(adminAnalytics);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>(30);
  const [refreshTick, setRefreshTick] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);

  // ---- Interactive state -------------------------------------------------
  type MetricKey = "Peržiūros" | "Unikalūs" | "Prisijungimai" | "Atsijungimai";
  const ALL_METRICS: MetricKey[] = ["Peržiūros", "Unikalūs", "Prisijungimai", "Atsijungimai"];
  const [activeMetrics, setActiveMetrics] = useState<Set<MetricKey>>(new Set(ALL_METRICS));
  const [chartKind, setChartKind] = useState<"area" | "line" | "bar">("area");
  const [brushRange, setBrushRange] = useState<{ start: number; end: number } | null>(null);
  const [drilldownPath, setDrilldownPath] = useState<string | null>(null);
  const [drilldownStatus, setDrilldownStatus] = useState<string | null>(null);
  const [kpiDetail, setKpiDetail] = useState<KpiKind | null>(null);

  const toggleMetric = useCallback((m: MetricKey) => {
    setActiveMetrics((prev) => {
      const next = new Set(prev);
      // If the user clicks the only-active metric, treat it as "reset all" (nicer UX)
      if (next.size === 1 && next.has(m)) return new Set(ALL_METRICS);
      // If everything is on, isolate the clicked metric
      if (next.size === ALL_METRICS.length) return new Set([m]);
      if (next.has(m)) next.delete(m); else next.add(m);
      if (next.size === 0) return new Set(ALL_METRICS);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rangeSince = useMemo(
    () => new Date(Date.now() - range * 24 * 3600 * 1000).toISOString().slice(0, 10),
    [range],
  );

  const refresh = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      setData(await fn());
      setRefreshTick((t) => t + 1);
      setLastRefreshAt(new Date());
    } catch (e) {
      if (!silent) toast.error(e instanceof Error ? e.message : "Klaida");
    } finally {
      if (!silent) setLoading(false);
    }
  };
  useEffect(() => {
    refresh();
  }, []);

  // Auto-refresh polling (15 s) — lets analytics update in real time as users
  // browse the site. Silent refresh so we don't blast toasts.
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => refresh(true), 15000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh]);

  // Filter to selected range
  const inRange = <T extends { created_at: string }>(arr: T[] | undefined) =>
    (arr ?? []).filter((r) => r.created_at.slice(0, 10) >= rangeSince);

  // 30-day activity trend: reservations, messages, users
  const days = useMemo(() => {
    if (!data) return [];
    const out: any[] = [];
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 3600 * 1000);
      const key = d.toISOString().slice(0, 10);
      out.push({
        label: key.slice(5),
        Rezervacijos: data.reservations.filter((r) => dayKey(r.created_at) === key).length,
        Žinutės: data.messages.filter((m) => dayKey(m.created_at) === key).length,
        Vartotojai: data.profiles.filter((p) => dayKey(p.created_at) === key).length,
      });
    }
    return out;
  }, [data, range]);

  // Auth + traffic trend
  const traffic = useMemo(() => {
    if (!data) return [];
    const out: any[] = [];
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 3600 * 1000);
      const key = d.toISOString().slice(0, 10);
      const dayEvents = data.activity.filter((a) => dayKey(a.created_at) === key);
      const views = dayEvents.filter((a) => a.action === "page.view");
      const uniques = new Set(views.map((v) => v.user_id ?? `anon-${v.id}`)).size;
      out.push({
        label: key.slice(5),
        Prisijungimai: dayEvents.filter((a) => a.action === "auth.signed_in").length,
        Atsijungimai: dayEvents.filter((a) => a.action === "auth.signed_out").length,
        Peržiūros: views.length,
        Unikalūs: uniques,
      });
    }
    return out;
  }, [data, range]);

  // Hourly heatmap distribution (24h)
  const hours = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, h) => ({
      hour: `${String(h).padStart(2, "0")}h`,
      Peržiūros: 0,
      Prisijungimai: 0,
    }));
    if (!data) return buckets;
    for (const a of inRange(data.activity)) {
      const h = hourKey(a.created_at);
      if (h < 0 || h > 23) continue;
      if (a.action === "page.view") buckets[h].Peržiūros += 1;
      else if (a.action === "auth.signed_in") buckets[h].Prisijungimai += 1;
    }
    return buckets;
  }, [data, range]);

  // Weekday distribution
  const weekdays = useMemo(() => {
    const b = WD.map((w) => ({ diena: w, Peržiūros: 0 }));
    if (!data) return b;
    for (const a of inRange(data.activity)) {
      if (a.action !== "page.view") continue;
      b[weekdayKey(a.created_at)].Peržiūros += 1;
    }
    // reorder to Mon–Sun (LT week)
    return [1, 2, 3, 4, 5, 6, 0].map((i) => b[i]);
  }, [data, range]);

  // Top pages
  const topPages = useMemo(() => {
    if (!data) return [];
    const map: Record<string, number> = {};
    for (const a of inRange(data.activity)) {
      if (a.action !== "page.view") continue;
      const p = (a.meta?.path as string | undefined) ?? "/";
      map[p] = (map[p] ?? 0) + 1;
    }
    return Object.entries(map)
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [data, range]);

  const statusPie = useMemo(() => {
    if (!data) return [];
    const map: Record<string, number> = {};
    inRange(data.reservations).forEach((r: any) => {
      map[r.status] = (map[r.status] ?? 0) + 1;
    });
    const labels: Record<string, string> = {
      pending: "Laukia",
      approved: "Vykdoma",
      completed: "Užbaigta",
      declined: "Atmesta",
      confirmed: "Patvirtinta",
    };
    return Object.entries(map).map(([k, v]) => ({ name: labels[k] ?? k, value: v }));
  }, [data, range]);

  const rolePie = useMemo(() => {
    if (!data) return [];
    const map: Record<string, number> = {};
    data.profiles.forEach((p: { role: string }) => {
      map[p.role] = (map[p.role] ?? 0) + 1;
    });
    const labels: Record<string, string> = {
      student: "Mokiniai",
      organization: "Organizacijos",
      school_admin: "Mokyklos adm.",
      admin: "Admin",
    };
    return Object.entries(map).map(([k, v]) => ({ name: labels[k] ?? k, value: v }));
  }, [data]);

  const totals = useMemo(() => {
    if (!data) return { signIns: 0, signOuts: 0, views: 0, uniques: 0, anon: 0 };
    const act = inRange(data.activity);
    const views = act.filter((a) => a.action === "page.view");
    return {
      signIns: act.filter((a) => a.action === "auth.signed_in").length,
      signOuts: act.filter((a) => a.action === "auth.signed_out").length,
      views: views.length,
      uniques: new Set(views.map((v) => v.user_id ?? `a-${v.id}`)).size,
      anon: views.filter((v) => !v.user_id).length,
    };
  }, [data, range]);

  // Trend vs previous period
  const prevTotals = useMemo(() => {
    if (!data) return { signIns: 0, views: 0, uniques: 0 };
    const from = new Date(Date.now() - range * 2 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const to = rangeSince;
    const act = data.activity.filter((a) => {
      const d = a.created_at.slice(0, 10);
      return d >= from && d < to;
    });
    const views = act.filter((a) => a.action === "page.view");
    return {
      signIns: act.filter((a) => a.action === "auth.signed_in").length,
      views: views.length,
      uniques: new Set(views.map((v) => v.user_id ?? `a-${v.id}`)).size,
    };
  }, [data, range, rangeSince]);

  const pct = (now: number, prev: number) => {
    if (!prev && !now) return 0;
    if (!prev) return 100;
    return Math.round(((now - prev) / prev) * 100);
  };

  const reservationsInRange = inRange(data?.reservations ?? []);
  const totalHours = reservationsInRange.reduce(
    (s, r: any) => s + (r.status === "completed" ? r.hours_to_earn ?? 0 : 0),
    0,
  );
  const completedRate = reservationsInRange.length
    ? Math.round(
        (reservationsInRange.filter((r: any) => r.status === "completed").length /
          reservationsInRange.length) *
          100,
      )
    : 0;

  const goalPct = Math.min(100, Math.round((totals.uniques / Math.max(1, range * 5)) * 100));

  const exportTraffic = () =>
    downloadCsv(
      `analitika-srautas-${new Date().toISOString().slice(0, 10)}.csv`,
      traffic.map((t) => ({ diena: t.label, ...t })),
    );
  const exportActivity = () =>
    downloadCsv(
      `analitika-veikla-${new Date().toISOString().slice(0, 10)}.csv`,
      (data?.activity ?? []).map((a) => ({
        laikas: a.created_at,
        veiksmas: a.action,
        naudotojas: a.user_id ?? "(anon)",
        kelias: (a.meta?.path as string) ?? "",
      })),
    );
  const exportSummary = () =>
    downloadCsv(
      `analitika-suvestine-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        { rodiklis: "Prisijungimai", reikšmė: totals.signIns },
        { rodiklis: "Atsijungimai", reikšmė: totals.signOuts },
        { rodiklis: "Peržiūros", reikšmė: totals.views },
        { rodiklis: "Unikalūs lankytojai", reikšmė: totals.uniques },
        { rodiklis: "Anoniminės peržiūros", reikšmė: totals.anon },
        { rodiklis: "Rezervacijos", reikšmė: reservationsInRange.length },
        { rodiklis: "Užbaigimo %", reikšmė: completedRate },
        { rodiklis: "Suteikta valandų", reikšmė: totalHours },
      ],
    );

  return (
    <div className="relative space-y-6">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-20 -left-16 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute top-40 right-0 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      {/* Header */}
      <header className="grid grid-cols-1 items-center gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <motion.span
              animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="grid h-2 w-2 place-items-center rounded-full bg-emerald-400 shadow-[0_0_10px_rgb(52,211,153)]"
            />
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-400">
              Live · atnaujinta {refreshTick > 0 ? "ką tik" : "…"}
            </span>
          </div>
          <h1 className="mt-1 flex items-center gap-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            <BarChart3 className="h-6 w-6 shrink-0 text-primary" />
            <span className="truncate">Analitika</span>
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {range} d.
            </span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Interaktyvūs grafikai · srautas · konversijos · CSV eksportas.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full border border-border bg-card/70 p-1 backdrop-blur">
            {([7, 14, 30] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`relative rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  range === r ? "text-white" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {range === r && (
                  <motion.span
                    layoutId="range-pill"
                    className="absolute inset-0 rounded-full bg-gradient-primary shadow-glow"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <span className="relative">{r} d.</span>
              </button>
            ))}
          </div>
          <button
            onClick={exportSummary}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/70 px-3 py-2 text-xs font-semibold backdrop-blur transition hover:bg-accent"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </button>
          <button
            onClick={() => setAutoRefresh((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold backdrop-blur transition ${
              autoRefresh
                ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-300"
                : "border-border bg-card/70 hover:bg-accent"
            }`}
            title="Automatiškai atnaujinti kas 15 s"
          >
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${autoRefresh ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground"}`} />
            {autoRefresh ? "Live" : "Auto"}
          </button>
          <button
            onClick={() => refresh()}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-2 text-xs font-semibold backdrop-blur transition hover:bg-accent"
            title={lastRefreshAt ? `Atnaujinta ${lastRefreshAt.toLocaleTimeString("lt-LT")}` : "Atnaujinti"}
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      {/* Hero KPI row — CLICK to isolate/toggle a metric on the traffic chart */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <HeroStat
          label="Peržiūros"
          value={totals.views}
          delta={pct(totals.views, prevTotals.views)}
          icon={Eye}
          gradient="from-cyan-500/25 via-cyan-500/5 to-transparent"
          color={C.cyan}
          spark={traffic.map((t) => t.Peržiūros)}
          active={activeMetrics.has("Peržiūros")}
          onClick={() => toggleMetric("Peržiūros")}
          onExpand={() => setKpiDetail("views")}
        />
        <HeroStat
          label="Unikalūs"
          value={totals.uniques}
          delta={pct(totals.uniques, prevTotals.uniques)}
          icon={Users}
          gradient="from-violet-500/25 via-violet-500/5 to-transparent"
          color={C.violet}
          spark={traffic.map((t) => t.Unikalūs)}
          active={activeMetrics.has("Unikalūs")}
          onClick={() => toggleMetric("Unikalūs")}
          onExpand={() => setKpiDetail("uniques")}
        />
        <HeroStat
          label="Prisijungimai"
          value={totals.signIns}
          delta={pct(totals.signIns, prevTotals.signIns)}
          icon={LogIn}
          gradient="from-emerald-500/25 via-emerald-500/5 to-transparent"
          color={C.emerald}
          spark={traffic.map((t) => t.Prisijungimai)}
          active={activeMetrics.has("Prisijungimai")}
          onClick={() => toggleMetric("Prisijungimai")}
          onExpand={() => setKpiDetail("signIns")}
        />
        <HeroStat
          label="Atsijungimai"
          value={totals.signOuts}
          delta={0}
          icon={LogOut}
          gradient="from-rose-500/25 via-rose-500/5 to-transparent"
          color={C.rose}
          spark={traffic.map((t) => t.Atsijungimai)}
          hideDelta
          active={activeMetrics.has("Atsijungimai")}
          onClick={() => toggleMetric("Atsijungimai")}
          onExpand={() => setKpiDetail("signOuts")}
        />
      </div>


      {/* Hint bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-border/60 bg-card/40 px-3 py-2 text-[11px] text-muted-foreground">
        <MousePointerClick className="h-3.5 w-3.5 text-primary" />
        <span>Spausk kortelę virš — izoliuoji rodiklį. Grafike tempk apatinę juostelę — priartini laiką. Spausk stulpelį / puslapį — atsidaro detalus vaizdas.</span>
        {activeMetrics.size !== ALL_METRICS.length && (
          <button
            onClick={() => setActiveMetrics(new Set(ALL_METRICS))}
            className="ml-auto rounded-full border border-border bg-background/40 px-2 py-0.5 font-semibold text-foreground hover:bg-accent"
          >
            Rodyti visus
          </button>
        )}
      </div>

      {/* Main split: traffic chart + goal ring */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card delay={0} title="Svetainės srautas" icon={Globe} action={
          <div className="flex items-center gap-1.5">
            <div className="inline-flex rounded-full border border-border/60 bg-background/40 p-0.5">
              {([
                ["area", AreaIcon, "Sritis"],
                ["line", LineIcon, "Linija"],
                ["bar", BarChart2, "Stulpeliai"],
              ] as const).map(([k, Ico, lbl]) => (
                <button
                  key={k}
                  onClick={() => setChartKind(k)}
                  title={lbl}
                  className={`relative grid h-6 w-7 place-items-center rounded-full text-[11px] transition ${
                    chartKind === k ? "text-white" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {chartKind === k && (
                    <motion.span
                      layoutId="chart-kind-pill"
                      className="absolute inset-0 rounded-full bg-gradient-primary"
                      transition={{ type: "spring", stiffness: 500, damping: 32 }}
                    />
                  )}
                  <Ico className="relative h-3 w-3" />
                </button>
              ))}
            </div>
            <button onClick={exportTraffic} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/40 px-3 py-1.5 text-[11px] font-semibold hover:bg-accent">
              <Download className="h-3 w-3" /> CSV
            </button>
          </div>
        }>
          <div className="h-80 w-full">
            <ResponsiveContainer>
              <TrafficChart
                kind={chartKind}
                data={traffic}
                active={activeMetrics}
                onBrushChange={(r) => setBrushRange(r)}
              />
            </ResponsiveContainer>
          </div>
          {brushRange && traffic[brushRange.start] && traffic[brushRange.end] && (
            <p className="mt-2 text-[10px] text-muted-foreground">
              Priartinta: <span className="font-semibold text-foreground">{traffic[brushRange.start].label}</span> → <span className="font-semibold text-foreground">{traffic[brushRange.end].label}</span>
            </p>
          )}
        </Card>



        <Card delay={0.05} title="Auditorija" icon={Target}>
          <div className="relative h-56">
            <ResponsiveContainer>
              <RadialBarChart
                innerRadius="55%"
                outerRadius="100%"
                data={[{ name: "goal", value: goalPct, fill: "url(#goal-grad)" }]}
                startAngle={90}
                endAngle={90 - (goalPct / 100) * 360}
              >
                <defs>
                  <linearGradient id="goal-grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={C.violet} />
                    <stop offset="100%" stopColor={C.cyan} />
                  </linearGradient>
                </defs>
                <RadialBar dataKey="value" cornerRadius={20} background={{ fill: "hsl(var(--border) / 0.3)" }} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="text-center">
                <p className="font-display text-4xl font-bold">
                  <AnimatedNumber value={goalPct} />%
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Tikslo pasiekimas
                </p>
              </div>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[11px]">
            <MiniStat label="Anonim." value={totals.anon} />
            <MiniStat label="Registruoti" value={Math.max(0, totals.uniques - totals.anon)} />
            <MiniStat label="Konversija" value={`${totals.uniques ? Math.round((totals.signIns / totals.uniques) * 100) : 0}%`} />
          </div>
        </Card>
      </div>

      {/* Hour-of-day + Weekday */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card delay={0.1} title="Aktyvumas per parą (val.)" icon={Clock}>
          <div className="h-56 w-full">
            <ResponsiveContainer>
              <BarChart data={hours} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="b-hour" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.cyan} stopOpacity={1} />
                    <stop offset="100%" stopColor={C.violet} stopOpacity={0.6} />
                  </linearGradient>
                  <linearGradient id="b-in" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.emerald} stopOpacity={1} />
                    <stop offset="100%" stopColor={C.emerald} stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                <XAxis dataKey="hour" fontSize={9} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                <YAxis fontSize={10} stroke="hsl(var(--muted-foreground))" allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip content={<GlassTooltip />} cursor={{ fill: "hsl(var(--accent) / 0.3)" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                <Bar dataKey="Peržiūros" radius={[8, 8, 0, 0]} fill="url(#b-hour)" animationDuration={900} />
                <Bar dataKey="Prisijungimai" radius={[8, 8, 0, 0]} fill="url(#b-in)" animationDuration={1100} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card delay={0.15} title="Savaitės dienos" icon={ActivityIcon}>
          <div className="h-56 w-full">
            <ResponsiveContainer>
              <BarChart data={weekdays} layout="vertical" margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="b-wd" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={C.violet} />
                    <stop offset="100%" stopColor={C.pink} />
                  </linearGradient>
                </defs>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="diena" fontSize={11} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} width={26} />
                <Tooltip content={<GlassTooltip />} cursor={{ fill: "hsl(var(--accent) / 0.3)" }} />
                <Bar dataKey="Peržiūros" fill="url(#b-wd)" radius={[0, 8, 8, 0]} animationDuration={900} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Top pages + Product KPIs */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card delay={0.2} title="Populiariausi puslapiai" icon={Sparkles}>
          <div className="space-y-2">
            {topPages.length === 0 && (
              <p className="text-xs text-muted-foreground">Kol kas duomenų nėra.</p>
            )}
            {topPages.map((p, i) => {
              const max = topPages[0]?.count ?? 1;
              const w = Math.max(6, (p.count / max) * 100);
              return (
                <motion.button
                  key={p.path}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.02 * i }}
                  whileHover={{ x: 2, scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setDrilldownPath(p.path)}
                  className="group relative block w-full overflow-hidden rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-left transition hover:border-primary/40"
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${w}%` }}
                    transition={{ duration: 0.9, delay: 0.05 * i, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary/30 to-cyan-500/20 group-hover:from-primary/50 group-hover:to-cyan-500/30"
                  />
                  <div className="relative flex items-center justify-between gap-2 text-xs">
                    <span className="truncate font-mono text-foreground">{p.path}</span>
                    <span className="shrink-0 font-bold tabular-nums text-primary">
                      {p.count.toLocaleString("lt-LT")}
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </Card>

        <Card delay={0.25} title="Produkto veikla" icon={Zap} action={
          <div className="flex gap-1.5">
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              {completedRate}% įvykdyta
            </span>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
              {totalHours} val.
            </span>
          </div>
        }>
          <div className="h-56 w-full">
            <ResponsiveContainer>
              <AreaChart data={days} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="g-res" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.primary} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={C.primary} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g-msg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.pink} stopOpacity={0.7} />
                    <stop offset="100%" stopColor={C.pink} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g-usr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.emerald} stopOpacity={0.7} />
                    <stop offset="100%" stopColor={C.emerald} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.25} />
                <XAxis dataKey="label" fontSize={10} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                <YAxis fontSize={10} stroke="hsl(var(--muted-foreground))" allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip content={<GlassTooltip />} cursor={{ stroke: C.primary, strokeWidth: 1, strokeDasharray: "4 4" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                <Area type="monotone" dataKey="Rezervacijos" stroke={C.primary} strokeWidth={2.5} fill="url(#g-res)" animationDuration={900} />
                <Area type="monotone" dataKey="Žinutės" stroke={C.pink} strokeWidth={2} fill="url(#g-msg)" animationDuration={1100} />
                <Area type="monotone" dataKey="Vartotojai" stroke={C.emerald} strokeWidth={2} fill="url(#g-usr)" animationDuration={1300} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Pies */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          delay={0.3}
          title="Rezervacijų būsenos"
          icon={TrendingUp}
          action={
            drilldownStatus ? (
              <button
                onClick={() => setDrilldownStatus(null)}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-background/40 px-2 py-0.5 text-[10px] font-semibold hover:bg-accent"
              >
                <X className="h-3 w-3" /> {drilldownStatus}
              </button>
            ) : (
              <span className="text-[10px] text-muted-foreground">Spausk skiltį</span>
            )
          }
        >
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={statusPie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={3}
                  animationDuration={1000}
                  onClick={(e: any) =>
                    setDrilldownStatus((cur) => (cur === e?.name ? null : (e?.name ?? null)))
                  }
                >
                  {statusPie.map((s, i) => {
                    const dim = drilldownStatus && drilldownStatus !== s.name;
                    return (
                      <Cell
                        key={i}
                        fill={PIE[i % PIE.length]}
                        stroke="hsl(var(--card))"
                        strokeWidth={2}
                        style={{
                          cursor: "pointer",
                          opacity: dim ? 0.25 : 1,
                          filter: drilldownStatus === s.name ? `drop-shadow(0 0 10px ${PIE[i % PIE.length]})` : undefined,
                          transition: "opacity 200ms, filter 200ms",
                        }}
                      />
                    );
                  })}
                </Pie>
                <Tooltip content={<GlassTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>


        <Card delay={0.35} title="Vartotojai pagal rolę" icon={Users} action={
          <button
            onClick={exportActivity}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/40 px-3 py-1.5 text-[11px] font-semibold hover:bg-accent"
            title="Eksportuoti veiklos žurnalą"
          >
            <Download className="h-3 w-3" /> Veikla CSV
          </button>
        }>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={rolePie} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="b-role" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.violet} />
                    <stop offset="100%" stopColor={C.cyan} stopOpacity={0.5} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.25} />
                <XAxis dataKey="name" fontSize={10} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                <YAxis fontSize={10} stroke="hsl(var(--muted-foreground))" allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip content={<GlassTooltip />} cursor={{ fill: "hsl(var(--accent) / 0.3)" }} />
                <Bar dataKey="value" radius={[10, 10, 0, 0]} fill="url(#b-role)" animationDuration={900}>
                  {rolePie.map((_, i) => (
                    <Cell key={i} fill={PIE[i % PIE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Live activity feed — newest events, updates with auto-refresh */}
      <Card
        delay={0.4}
        title="Gyvas veiklos srautas"
        icon={ActivityIcon}
        action={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/40 px-2 py-0.5 text-[10px] font-semibold">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${autoRefresh ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground"}`} />
            {autoRefresh ? "Live 15s" : "Sustabdytas"}
          </span>
        }
      >
        <div className="max-h-80 overflow-y-auto pr-1">
          <div className="space-y-1.5">
            {(data?.activity ?? []).slice(0, 40).map((e, i) => {
              const isView = e.action === "page.view";
              const isIn = e.action === "auth.signed_in";
              const isOut = e.action === "auth.signed_out";
              const color = isIn ? C.emerald : isOut ? C.rose : C.cyan;
              const label = isIn ? "Prisijungimas" : isOut ? "Atsijungimas" : "Peržiūra";
              return (
                <motion.div
                  key={e.id}
                  layout
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.01, 0.3) }}
                  className="group flex items-center gap-2 rounded-lg border border-border/50 bg-card/40 px-2.5 py-1.5 text-[11px] hover:border-primary/40"
                >
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-full"
                    style={{ background: color, boxShadow: `0 0 8px ${color}` }}
                  />
                  <span className="w-24 shrink-0 font-semibold" style={{ color }}>{label}</span>
                  <span className="truncate font-mono text-muted-foreground">
                    {(e.meta?.path as string | undefined) ?? (isView ? "/" : "—")}
                  </span>
                  <span className={`ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                    e.user_id ? "bg-emerald-500/15 text-emerald-400" : "bg-muted text-muted-foreground"
                  }`}>
                    {e.user_id ? "reg" : "anon"}
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {new Date(e.created_at).toLocaleTimeString("lt-LT")}
                  </span>
                </motion.div>
              );
            })}
            {!(data?.activity ?? []).length && (
              <p className="rounded-lg border border-dashed border-border/60 bg-card/40 p-4 text-center text-xs text-muted-foreground">
                Kol kas įvykių nėra. Kai lankytojai naršys svetainę, čia atsiras srautas realiu laiku.
              </p>
            )}
          </div>
        </div>
      </Card>


      {/* Drill-down drawer: opens when a top-page row is clicked */}
      <DrilldownDrawer
        path={drilldownPath}
        onClose={() => setDrilldownPath(null)}
        activity={data?.activity ?? []}
        rangeSince={rangeSince}
      />

      {/* KPI detail modal — rich motion drill-down opened from any KPI card */}
      <KpiDetailModal
        kind={kpiDetail}
        onClose={() => setKpiDetail(null)}
        activity={data?.activity ?? []}
        rangeSince={rangeSince}
        rangeDays={range}
      />
    </div>
  );
}

// ============ Sub-components ==============================================

function Card({
  title,
  icon: Icon,
  children,
  delay = 0,
  action,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  delay?: number;
  action?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mx = useMotionValue(-200);
  const my = useMotionValue(-200);
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set(e.clientX - r.left);
    my.set(e.clientY - r.top);
  };
  const onLeave = () => {
    mx.set(-200);
    my.set(-200);
  };
  const spotlight = useTransform([mx, my] as any, ([x, y]: any) =>
    `radial-gradient(240px circle at ${x}px ${y}px, rgba(139,92,246,0.18), transparent 60%)`,
  );
  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2 }}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card/70 p-4 shadow-md backdrop-blur transition hover:border-primary/40"
    >
      {/* cursor-following spotlight */}
      <motion.div className="pointer-events-none absolute inset-0 rounded-2xl" style={{ background: spotlight as any }} />
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <p className="text-sm font-semibold">{title}</p>
        </div>
        {action}
      </div>
      <div className="relative">{children}</div>
    </motion.div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border/50 bg-background/40 px-2 py-1.5">
      <p className="font-display text-base font-bold">{value}</p>
      <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const w = 100;
  const h = 28;
  const step = w / Math.max(1, data.length - 1);
  const pts = data.map((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / (max - min || 1)) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const d = `M${pts.join(" L")}`;
  const area = `M0,${h} L${pts.join(" L")} L${w},${h} Z`;
  const id = `sp-${color.replace("#", "")}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-8 w-full">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.5} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <motion.path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  );
}

function HeroStat({
  label,
  value,
  delta,
  icon: Icon,
  gradient,
  color,
  spark,
  hideDelta,
  active = true,
  onClick,
  onExpand,
}: {
  label: string;
  value: number;
  delta: number;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  color: string;
  spark: number[];
  hideDelta?: boolean;
  active?: boolean;
  onClick?: () => void;
  onExpand?: () => void;
}) {
  const up = delta >= 0;
  // Magnetic tilt on mouse move
  const ref = useRef<HTMLButtonElement | null>(null);
  const rx = useSpring(0, { stiffness: 300, damping: 20 });
  const ry = useSpring(0, { stiffness: 300, damping: 20 });
  const onMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ry.set(px * 8);
    rx.set(-py * 8);
  };
  const onLeave = () => { rx.set(0); ry.set(0); };
  return (
    <motion.button
      ref={ref}
      type="button"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={onClick}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: active ? 1 : 0.55, y: 0, scale: active ? 1 : 0.98 }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      style={{ rotateX: rx as any, rotateY: ry as any, transformPerspective: 800 }}
      className={`group relative block w-full overflow-hidden rounded-2xl border p-4 text-left shadow-md backdrop-blur transition ${
        active
          ? "border-primary/50 bg-card/80 shadow-[0_0_0_1px_rgba(139,92,246,0.15),0_10px_40px_-12px_rgba(139,92,246,0.35)]"
          : "border-border bg-card/50"
      }`}
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${gradient} opacity-70`} />
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl opacity-40 transition-opacity group-hover:opacity-80"
        style={{ background: color }}
      />
      {active && (
        <motion.span
          layoutId={`kpi-ring-${label}`}
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{ boxShadow: `inset 0 0 0 1.5px ${color}55` }}
        />
      )}
      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <div className="flex items-center gap-1.5">
            {onExpand && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); onExpand(); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onExpand(); } }}
                title="Detalus vaizdas"
                className="grid h-6 w-6 cursor-pointer place-items-center rounded-md border border-white/10 bg-white/5 text-muted-foreground opacity-0 backdrop-blur transition group-hover:opacity-100 hover:bg-white/10 hover:text-foreground"
              >
                <Maximize2 className="h-3 w-3" />
              </span>
            )}
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-white/5 backdrop-blur" style={{ color }}>
              <Icon className="h-3.5 w-3.5" />
            </div>
          </div>
        </div>
        <p className="mt-2 font-display text-3xl font-bold tracking-tight">
          <AnimatedNumber value={value} />
        </p>
        <div className="mt-1 flex items-center justify-between gap-2">
          {!hideDelta ? (
            <span
              className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                up ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"
              }`}
            >
              {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              {Math.abs(delta)}%
            </span>
          ) : (
            <span />
          )}
          <div className="w-24 shrink-0">
            <Sparkline data={spark} color={color} />
          </div>
        </div>
      </div>
    </motion.button>
  );
}

// ---- Interactive traffic chart (area / line / bar + brush) ----------------
type TrafficRow = {
  label: string;
  Peržiūros: number;
  Unikalūs: number;
  Prisijungimai: number;
  Atsijungimai: number;
};
type MetricKey = "Peržiūros" | "Unikalūs" | "Prisijungimai" | "Atsijungimai";
const METRIC_COLOR: Record<MetricKey, string> = {
  "Peržiūros": C.cyan,
  "Unikalūs": C.violet,
  "Prisijungimai": C.emerald,
  "Atsijungimai": C.rose,
};

function TrafficChart({
  kind,
  data,
  active,
  onBrushChange,
}: {
  kind: "area" | "line" | "bar";
  data: TrafficRow[];
  active: Set<MetricKey>;
  onBrushChange: (r: { start: number; end: number } | null) => void;
}) {
  const keys: MetricKey[] = ["Peržiūros", "Unikalūs", "Prisijungimai", "Atsijungimai"];
  const shared = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.25} />
      <XAxis dataKey="label" fontSize={10} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
      <YAxis fontSize={10} stroke="hsl(var(--muted-foreground))" allowDecimals={false} tickLine={false} axisLine={false} />
      <Tooltip content={<GlassTooltip />} cursor={{ stroke: C.primary, strokeWidth: 1, strokeDasharray: "4 4" }} />
      <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
      <Brush
        dataKey="label"
        height={22}
        stroke={C.primary}
        fill="hsl(var(--card))"
        travellerWidth={10}
        onChange={(e: any) => {
          if (e && typeof e.startIndex === "number" && typeof e.endIndex === "number") {
            onBrushChange({ start: e.startIndex, end: e.endIndex });
          }
        }}
      />
    </>
  );

  if (kind === "bar") {
    return (
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        {shared}
        {keys.map((k) => (
          <Bar
            key={k}
            dataKey={k}
            fill={METRIC_COLOR[k]}
            radius={[6, 6, 0, 0]}
            hide={!active.has(k)}
            fillOpacity={active.has(k) ? 0.9 : 0.15}
            animationDuration={800}
          />
        ))}
      </BarChart>
    );
  }
  if (kind === "line") {
    return (
      <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        {shared}
        {keys.map((k) => (
          <Line
            key={k}
            type="monotone"
            dataKey={k}
            stroke={METRIC_COLOR[k]}
            strokeWidth={active.has(k) ? 2.6 : 1}
            strokeOpacity={active.has(k) ? 1 : 0.2}
            dot={false}
            activeDot={{ r: 5 }}
            hide={!active.has(k)}
            animationDuration={800}
          />
        ))}
      </LineChart>
    );
  }
  // area (default)
  return (
    <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
      <defs>
        {keys.map((k) => (
          <linearGradient key={k} id={`ga-${k}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={METRIC_COLOR[k]} stopOpacity={0.85} />
            <stop offset="100%" stopColor={METRIC_COLOR[k]} stopOpacity={0} />
          </linearGradient>
        ))}
      </defs>
      {shared}
      {keys.map((k) => (
        <Area
          key={k}
          type="monotone"
          dataKey={k}
          stroke={METRIC_COLOR[k]}
          strokeWidth={active.has(k) ? 2.5 : 1}
          fill={`url(#ga-${k})`}
          fillOpacity={active.has(k) ? 1 : 0.15}
          strokeOpacity={active.has(k) ? 1 : 0.25}
          hide={!active.has(k)}
          animationDuration={900}
        />
      ))}
    </AreaChart>
  );
}

// ---- Drill-down drawer for top-page clicks --------------------------------
function DrilldownDrawer({
  path,
  onClose,
  activity,
  rangeSince,
}: {
  path: string | null;
  onClose: () => void;
  activity: Array<{ id: string; created_at: string; action: string; user_id: string | null; meta?: any }>;
  rangeSince: string;
}) {
  const events = useMemo(() => {
    if (!path) return [];
    return activity
      .filter(
        (a) =>
          a.action === "page.view" &&
          a.created_at.slice(0, 10) >= rangeSince &&
          ((a.meta?.path as string | undefined) ?? "/") === path,
      )
      .slice(0, 200);
  }, [path, activity, rangeSince]);

  const byDay = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of events) {
      const d = e.created_at.slice(0, 10);
      map[d] = (map[d] ?? 0) + 1;
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, count]) => ({ label: day.slice(5), count }));
  }, [events]);

  return (
    <AnimatePresence>
      {path && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 32 }}
            className="fixed right-0 top-0 z-[81] flex h-full w-full max-w-md flex-col border-l border-border bg-background/95 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Puslapio detalės</p>
                <p className="mt-0.5 truncate font-mono text-sm font-semibold text-primary">{path}</p>
              </div>
              <button
                onClick={onClose}
                className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 px-4 py-3">
              <MiniStat label="Peržiūros" value={events.length} />
              <MiniStat label="Unikalūs" value={new Set(events.map((e) => e.user_id ?? `a-${e.id}`)).size} />
              <MiniStat label="Anonim." value={events.filter((e) => !e.user_id).length} />
            </div>

            <div className="h-40 px-3">
              <ResponsiveContainer>
                <AreaChart data={byDay} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dd-area" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.primary} stopOpacity={0.8} />
                      <stop offset="100%" stopColor={C.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" fontSize={9} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                  <YAxis fontSize={9} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<GlassTooltip />} />
                  <Area type="monotone" dataKey="count" stroke={C.primary} fill="url(#dd-area)" strokeWidth={2} animationDuration={700} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="flex-1 overflow-y-auto border-t border-border/60 px-3 py-2">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Paskutinės peržiūros ({events.length})
              </p>
              <div className="space-y-1">
                {events.length === 0 && (
                  <p className="rounded-lg border border-border/60 bg-card/40 p-3 text-xs text-muted-foreground">
                    Nėra duomenų šiam laikotarpiui.
                  </p>
                )}
                {events.slice(0, 60).map((e, i) => (
                  <motion.div
                    key={e.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.01 }}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-card/40 px-2.5 py-1.5 text-[11px]"
                  >
                    <span className="truncate font-mono text-muted-foreground">
                      {new Date(e.created_at).toLocaleString("lt-LT")}
                    </span>
                    <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                      e.user_id ? "bg-emerald-500/15 text-emerald-400" : "bg-muted text-muted-foreground"
                    }`}>
                      {e.user_id ? "reg" : "anon"}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
