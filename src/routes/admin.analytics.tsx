import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring, animate } from "framer-motion";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid, RadialBarChart, RadialBar, Brush,
} from "recharts";
import { adminAnalytics, type AdminAnalyticsV2, type FeedRow } from "@/lib/admin-super.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart3, RefreshCw, LogIn, LogOut, Eye, Users, Download, Zap, Clock,
  ArrowUp, ArrowDown, Activity as ActivityIcon, Globe, LineChart as LineIcon,
  AreaChart as AreaIcon, BarChart2, Smartphone, Tablet, Monitor, Wifi,
  Chrome, Languages, ExternalLink, ShieldCheck, Maximize2, Minimize2, MapPin, MonitorSmartphone,
} from "lucide-react";
import { toast } from "sonner";
import { KpiDetailModal, type KpiKind } from "@/components/analytics-kpi-detail";

export const Route = createFileRoute("/admin/analytics")({ component: Page });

// ============================================================================
// Design tokens
// ============================================================================
const C = {
  cyan: "#06b6d4", emerald: "#10b981", rose: "#f43f5e", amber: "#f59e0b",
  violet: "#a855f7", indigo: "#6366f1", primary: "#8b5cf6", pink: "#ec4899",
  sky: "#0ea5e9", teal: "#14b8a6",
};
const PIE = [C.violet, C.cyan, C.emerald, C.amber, C.rose, C.pink, C.sky, C.teal];
const WD_LT = ["Sk", "Pr", "An", "Tr", "Kt", "Pn", "Št"];
type Range = 7 | 14 | 30;

// ============================================================================
// Helpers
// ============================================================================
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

const pct = (now: number, prev: number) => {
  if (!prev && !now) return 0;
  if (!prev) return 100;
  return Math.round(((now - prev) / prev) * 100);
};

const fmt = (n: number) => n.toLocaleString("lt-LT");
const timeAgo = (iso: string) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${Math.round(s)}s`;
  if (s < 3600) return `${Math.round(s / 60)}min`;
  if (s < 86400) return `${Math.round(s / 3600)}val`;
  return `${Math.round(s / 86400)}d`;
};

// ============================================================================
// Reusable primitives
// ============================================================================
function AnimatedNumber({ value }: { value: number }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v).toLocaleString("lt-LT"));
  useEffect(() => {
    const c = animate(mv, value, { duration: 0.9, ease: [0.22, 1, 0.36, 1] });
    return c.stop;
  }, [value, mv]);
  return <motion.span>{rounded}</motion.span>;
}

/** 3D tilt wrapper — pointer-tracking, smooth spring, no jitter on touch. */
function Tilt3D({ children, className, intensity = 8 }: { children: React.ReactNode; className?: string; intensity?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [intensity, -intensity]), { stiffness: 220, damping: 22 });
  const ry = useSpring(useTransform(mx, [0, 1], [-intensity, intensity]), { stiffness: 220, damping: 22 });
  const gx = useTransform(mx, (v) => `${v * 100}%`);
  const gy = useTransform(my, (v) => `${v * 100}%`);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return;
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  };
  const onLeave = () => { mx.set(0.5); my.set(0.5); };

  return (
    <motion.div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 1000, transformStyle: "preserve-3d" }}
      className={`relative ${className ?? ""}`}
    >
      {children}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] mix-blend-overlay opacity-0 transition-opacity duration-200 hover:opacity-100"
        style={{ background: useTransform([gx, gy], ([x, y]) => `radial-gradient(300px circle at ${x} ${y}, rgba(255,255,255,0.16), transparent 55%)`) as never }}
      />
    </motion.div>
  );
}

function GlassTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/10 bg-black/85 px-3 py-2 text-xs shadow-2xl backdrop-blur-md"
    >
      {label != null && <p className="mb-1.5 font-semibold text-white/90">{label}</p>}
      <div className="space-y-1">
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color, boxShadow: `0 0 8px ${p.color}` }} />
            <span className="text-white/70">{p.name}</span>
            <span className="ml-auto font-bold text-white">{fmt(Number(p.value))}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ============================================================================
// Page
// ============================================================================
type Data = Awaited<ReturnType<typeof adminAnalytics>>;
type MetricKey = "Peržiūros" | "Unikalūs" | "Prisijungimai" | "Atsijungimai";
const ALL_METRICS: MetricKey[] = ["Peržiūros", "Unikalūs", "Prisijungimai", "Atsijungimai"];

function Page() {
  const fn = useServerFn(adminAnalytics);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>(30);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);
  const [activeMetrics, setActiveMetrics] = useState<Set<MetricKey>>(new Set(ALL_METRICS));
  const [chartKind, setChartKind] = useState<"area" | "line" | "bar">("area");
  const [liveEvents, setLiveEvents] = useState<FeedRow[]>([]);
  const [pulse, setPulse] = useState(0);

  const toggleMetric = useCallback((m: MetricKey) => {
    setActiveMetrics((prev) => {
      const next = new Set(prev);
      if (next.size === 1 && next.has(m)) return new Set(ALL_METRICS);
      if (next.size === ALL_METRICS.length) return new Set([m]);
      if (next.has(m)) next.delete(m); else next.add(m);
      if (next.size === 0) return new Set(ALL_METRICS);
      return next;
    });
  }, []);

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fn({ data: { days: range } });
      setData(res);
      setLiveEvents(res.feed ?? []);
      setLastRefreshAt(new Date());
    } catch (e) {
      if (!silent) toast.error(e instanceof Error ? e.message : "Klaida");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [fn, range]);

  useEffect(() => { refresh(); }, [refresh]);

  // Auto-refresh (silent) — analytics feel live
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => refresh(true), 15_000);
    return () => clearInterval(id);
  }, [autoRefresh, refresh]);

  // Realtime — subscribe to activity_log so the live feed updates instantly
  useEffect(() => {
    const ch = supabase.channel("analytics:activity_log")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_log" }, (payload) => {
        const row = payload.new as { id: string; created_at: string; action: string; user_id: string | null; meta: Record<string, unknown> | null };
        const meta = row.meta ?? {};
        const path = (meta.path as string) ?? "/";
        // Skip admin console traffic from the live feed
        if (path.startsWith("/admin")) return;
        const feedRow: FeedRow = {
          id: row.id, created_at: row.created_at, action: row.action, user_id: row.user_id,
          path,
          device: (meta.device as string) ?? "unknown",
          browser: (meta.browser as string) ?? "unknown",
          os: (meta.os as string) ?? "unknown",
          ref_host: (meta.ref_host as string) ?? "",
          lang: (meta.lang as string) ?? "",
          user_name: null, user_role: null,
        };
        setLiveEvents((prev) => [feedRow, ...prev].slice(0, 80));
        setPulse((p) => p + 1);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const analytics = data?.analytics;
  const totals = analytics?.totals ?? { views: 0, uniques: 0, signins: 0, signouts: 0, sessions: 0, signed_in_users: 0 };
  const prev = analytics?.prev_totals ?? { views: 0, uniques: 0, signins: 0, signouts: 0 };
  const adminHidden = analytics?.admin_hidden_events ?? 0;
  const activeNow = analytics?.active_now ?? 0;

  // Daily series shaped for recharts
  const traffic = useMemo(() => {
    if (!analytics) return [];
    return analytics.daily.map((d) => ({
      label: d.d.slice(5),
      Peržiūros: d.views,
      Unikalūs: d.uniques,
      Prisijungimai: d.signins,
      Atsijungimai: d.signouts,
    }));
  }, [analytics]);

  const hours = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, h) => ({
      hour: `${String(h).padStart(2, "0")}h`, Peržiūros: 0, Prisijungimai: 0, Unikalūs: 0,
    }));
    analytics?.hourly.forEach((r) => {
      buckets[r.h] = { hour: buckets[r.h].hour, Peržiūros: r.views, Prisijungimai: r.signins, Unikalūs: r.uniques };
    });
    return buckets;
  }, [analytics]);

  const weekdays = useMemo(() => {
    const base = WD_LT.map((w) => ({ diena: w, Peržiūros: 0 }));
    analytics?.weekday.forEach((r) => { base[r.w].Peržiūros = r.views; });
    return [1, 2, 3, 4, 5, 6, 0].map((i) => base[i]);
  }, [analytics]);

  const topPages = useMemo(() => (analytics?.top_pages ?? []).slice(0, 10), [analytics]);
  const devices = useMemo(() => analytics?.devices ?? [], [analytics]);
  const browsers = useMemo(() => analytics?.browsers ?? [], [analytics]);
  const oses = useMemo(() => analytics?.os ?? [], [analytics]);
  const referrers = useMemo(() => analytics?.referrers ?? [], [analytics]);
  const languages = useMemo(() => analytics?.languages ?? [], [analytics]);

  const rolePie = useMemo(() => {
    if (!data) return [];
    const map: Record<string, number> = {};
    data.profiles.forEach((p) => { map[p.role] = (map[p.role] ?? 0) + 1; });
    const labels: Record<string, string> = {
      student: "Mokiniai", organization: "Organizacijos", school_admin: "Mokyklos adm.", admin: "Super admin",
    };
    return Object.entries(map).map(([k, v]) => ({ name: labels[k] ?? k, value: v }));
  }, [data]);

  const statusPie = useMemo(() => {
    if (!data) return [];
    const map: Record<string, number> = {};
    data.reservations.forEach((r) => { map[r.status] = (map[r.status] ?? 0) + 1; });
    const labels: Record<string, string> = {
      pending: "Laukia", approved: "Vykdoma", completed: "Užbaigta", declined: "Atmesta", confirmed: "Patvirtinta",
    };
    return Object.entries(map).map(([k, v]) => ({ name: labels[k] ?? k, value: v }));
  }, [data]);

  const reservationsCount = data?.reservations.length ?? 0;
  const totalHours = (data?.reservations ?? [])
    .reduce((s, r) => s + (r.status === "completed" ? (r.hours_to_earn ?? 0) : 0), 0);
  const completedRate = reservationsCount
    ? Math.round((data!.reservations.filter((r) => r.status === "completed").length / reservationsCount) * 100)
    : 0;

  const exportSummary = () =>
    downloadCsv(`analitika-suvestine-${new Date().toISOString().slice(0, 10)}.csv`, [
      { rodiklis: "Peržiūros", reikšmė: totals.views },
      { rodiklis: "Unikalūs sesijos", reikšmė: totals.uniques },
      { rodiklis: "Prisijungimai (auth)", reikšmė: totals.signins },
      { rodiklis: "Atsijungimai (auth)", reikšmė: totals.signouts },
      { rodiklis: "Prisijunge dabar (5 min)", reikšmė: activeNow },
      { rodiklis: "Iš viso sesijų", reikšmė: totals.sessions },
      { rodiklis: "Iš viso naudotojų (prisijungusių)", reikšmė: totals.signed_in_users },
      { rodiklis: "Super admin peržiūros (paslėptos)", reikšmė: adminHidden },
      { rodiklis: "Rezervacijos", reikšmė: reservationsCount },
      { rodiklis: "Užbaigimo %", reikšmė: completedRate },
      { rodiklis: "Suteikta valandų", reikšmė: totalHours },
    ]);

  const exportFeed = () =>
    downloadCsv(`analitika-feed-${new Date().toISOString().slice(0, 10)}.csv`,
      liveEvents.map((e) => ({
        laikas: e.created_at, veiksmas: e.action, naudotojas: e.user_name ?? "(anon)", vaidmuo: e.user_role ?? "",
        kelias: e.path, irenginys: e.device, narsykle: e.browser, os: e.os, kalba: e.lang, salt: e.ref_host,
      })));

  return (
    <div className="relative space-y-5 pb-8">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute top-40 right-0 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      {/* Header */}
      <header className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <motion.span
              key={pulse}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.7] }}
              transition={{ duration: 1 }}
              className="grid h-2 w-2 place-items-center rounded-full bg-emerald-400 shadow-[0_0_10px_rgb(52,211,153)]"
            />
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-400">
              Live · {activeNow} dabar
            </span>
            {adminHidden > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-300">
                <ShieldCheck className="h-3 w-3" />
                Super admin ({fmt(adminHidden)}) – paslėpta
              </span>
            )}
          </div>
          <h1 className="mt-1 flex items-center gap-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            <BarChart3 className="h-6 w-6 shrink-0 text-primary" />
            <span className="truncate">Analitika</span>
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {range} d.
            </span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Realūs duomenys iš serverio · realaus laiko srautas · įrenginiai · konversijos.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full border border-border bg-card/70 p-1 backdrop-blur">
            {([7, 14, 30] as Range[]).map((r) => (
              <button key={r} onClick={() => setRange(r)}
                className={`relative rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  range === r ? "text-white" : "text-muted-foreground hover:text-foreground"
                }`}>
                {range === r && (
                  <motion.span layoutId="range-pill"
                    className="absolute inset-0 rounded-full bg-gradient-primary shadow-glow"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }} />
                )}
                <span className="relative">{r} d.</span>
              </button>
            ))}
          </div>
          <button onClick={exportSummary}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/70 px-3 py-2 text-xs font-semibold backdrop-blur transition hover:bg-accent">
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
          <button onClick={() => setAutoRefresh((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold backdrop-blur transition ${
              autoRefresh ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-300" : "border-border bg-card/70 hover:bg-accent"
            }`} title="Automatiškai atnaujinti kas 15 s">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${autoRefresh ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground"}`} />
            {autoRefresh ? "Live" : "Auto"}
          </button>
          <button onClick={() => refresh()}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-2 text-xs font-semibold backdrop-blur transition hover:bg-accent"
            title={lastRefreshAt ? `Atnaujinta ${lastRefreshAt.toLocaleTimeString("lt-LT")}` : "Atnaujinti"}>
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      {/* KPI row */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <HeroStat label="Peržiūros" value={totals.views} delta={pct(totals.views, prev.views)}
          icon={Eye} color={C.cyan} spark={traffic.map((t) => t.Peržiūros)}
          active={activeMetrics.has("Peržiūros")} onClick={() => toggleMetric("Peržiūros")} />
        <HeroStat label="Unikalūs" value={totals.uniques} delta={pct(totals.uniques, prev.uniques)}
          icon={Users} color={C.violet} spark={traffic.map((t) => t.Unikalūs)}
          active={activeMetrics.has("Unikalūs")} onClick={() => toggleMetric("Unikalūs")} />
        <HeroStat label="Prisijungimai" value={totals.signins} delta={pct(totals.signins, prev.signins)}
          icon={LogIn} color={C.emerald} spark={traffic.map((t) => t.Prisijungimai)} sub="tikri auth įvykiai"
          active={activeMetrics.has("Prisijungimai")} onClick={() => toggleMetric("Prisijungimai")} />
        <HeroStat label="Atsijungimai" value={totals.signouts} delta={0} hideDelta
          icon={LogOut} color={C.rose} spark={traffic.map((t) => t.Atsijungimai)}
          active={activeMetrics.has("Atsijungimai")} onClick={() => toggleMetric("Atsijungimai")} />
      </div>

      {/* Secondary stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <MiniStat icon={Wifi} label="Aktyvūs dabar" value={activeNow} color={C.emerald} hint="paskutinės 5 min" />
        <MiniStat icon={Zap} label="Sesijos" value={totals.sessions} color={C.cyan} hint="unikalūs session ID" />
        <MiniStat icon={Users} label="Prisijungę naudotojai" value={totals.signed_in_users} color={C.violet} hint="unikalūs auth user_id" />
        <MiniStat icon={ShieldCheck} label="Paslėpta (super admin)" value={adminHidden} color={C.amber} hint="/admin peržiūros" />
      </div>

      {/* Traffic chart */}
      <Card title="Srautas laike" icon={ActivityIcon} tools={
        <div className="inline-flex rounded-full border border-border bg-card/60 p-0.5 text-[10px]">
          {(["area", "line", "bar"] as const).map((k) => {
            const Icon = k === "area" ? AreaIcon : k === "line" ? LineIcon : BarChart2;
            return (
              <button key={k} onClick={() => setChartKind(k)}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold transition ${
                  chartKind === k ? "bg-white/10 text-white" : "text-muted-foreground hover:text-foreground"
                }`}>
                <Icon className="h-3 w-3" />
              </button>
            );
          })}
        </div>
      }>
        <div className="h-72">
          <ResponsiveContainer>
            {chartKind === "area" ? (
              <AreaChart data={traffic}>
                <defs>
                  {ALL_METRICS.map((m, i) => (
                    <linearGradient key={m} id={`g-${m}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={PIE[i]} stopOpacity={0.55} />
                      <stop offset="100%" stopColor={PIE[i]} stopOpacity={0.02} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke="rgba(255,255,255,0.5)" fontSize={11} />
                <YAxis stroke="rgba(255,255,255,0.5)" fontSize={11} allowDecimals={false} />
                <Tooltip content={<GlassTooltip />} />
                {ALL_METRICS.map((m, i) => activeMetrics.has(m) && (
                  <Area key={m} type="monotone" dataKey={m} stroke={PIE[i]} strokeWidth={2}
                    fill={`url(#g-${m})`} isAnimationActive activeDot={{ r: 5, strokeWidth: 0 }} />
                ))}
                <Brush dataKey="label" height={22} stroke={C.primary} fill="rgba(139,92,246,0.06)" travellerWidth={8} />
              </AreaChart>
            ) : chartKind === "line" ? (
              <LineChart data={traffic}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke="rgba(255,255,255,0.5)" fontSize={11} />
                <YAxis stroke="rgba(255,255,255,0.5)" fontSize={11} allowDecimals={false} />
                <Tooltip content={<GlassTooltip />} />
                {ALL_METRICS.map((m, i) => activeMetrics.has(m) && (
                  <Line key={m} type="monotone" dataKey={m} stroke={PIE[i]} strokeWidth={2} dot={false}
                    activeDot={{ r: 5, strokeWidth: 0 }} />
                ))}
              </LineChart>
            ) : (
              <BarChart data={traffic}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke="rgba(255,255,255,0.5)" fontSize={11} />
                <YAxis stroke="rgba(255,255,255,0.5)" fontSize={11} allowDecimals={false} />
                <Tooltip content={<GlassTooltip />} />
                {ALL_METRICS.map((m, i) => activeMetrics.has(m) && (
                  <Bar key={m} dataKey={m} fill={PIE[i]} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {ALL_METRICS.map((m, i) => (
            <button key={m} onClick={() => toggleMetric(m)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition ${
                activeMetrics.has(m)
                  ? "border-white/20 bg-white/10 text-white"
                  : "border-border bg-transparent text-muted-foreground hover:text-foreground"
              }`}>
              <span className="h-2 w-2 rounded-full" style={{ background: PIE[i] }} />
              {m}
            </button>
          ))}
        </div>
      </Card>

      {/* Device / Browser / OS row */}
      <div className="grid gap-3 lg:grid-cols-3">
        <DeviceCard devices={devices} />
        <BreakdownCard title="Naršyklės" icon={Chrome} items={browsers.map((b) => ({ label: b.browser, n: b.n }))} color={C.cyan} />
        <BreakdownCard title="Operacinės sistemos" icon={Monitor} items={oses.map((o) => ({ label: o.os, n: o.n }))} color={C.emerald} />
      </div>

      {/* Referrers + Languages + Hourly */}
      <div className="grid gap-3 lg:grid-cols-3">
        <BreakdownCard title="Šaltiniai (referrer)" icon={ExternalLink} items={referrers.map((r) => ({ label: r.host, n: r.n }))} color={C.amber} />
        <BreakdownCard title="Kalbos" icon={Languages} items={languages.map((l) => ({ label: l.lang, n: l.n }))} color={C.pink} />
        <Card title="Aktyvumas per parą" icon={Clock}>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={hours}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                <XAxis dataKey="hour" stroke="rgba(255,255,255,0.5)" fontSize={10} interval={2} />
                <YAxis stroke="rgba(255,255,255,0.5)" fontSize={11} allowDecimals={false} />
                <Tooltip content={<GlassTooltip />} />
                <Bar dataKey="Peržiūros" fill={C.cyan} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Prisijungimai" fill={C.emerald} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Weekday + Top pages */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Card title="Savaitės dienos" icon={BarChart3}>
          <div className="h-56">
            <ResponsiveContainer>
              <RadialBarChart innerRadius="30%" outerRadius="90%" data={weekdays} startAngle={90} endAngle={-270}>
                <RadialBar dataKey="Peržiūros" background cornerRadius={8}>
                  {weekdays.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
                </RadialBar>
                <Tooltip content={<GlassTooltip />} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
            {weekdays.map((w, i) => (
              <span key={w.diena} className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ background: PIE[i % PIE.length] }} />
                {w.diena} · {fmt(w.Peržiūros)}
              </span>
            ))}
          </div>
        </Card>
        <Card title="Populiariausi puslapiai" icon={Globe}>
          <div className="space-y-1.5">
            {topPages.length === 0 && <p className="text-xs text-muted-foreground">Kol kas nėra duomenų.</p>}
            {topPages.map((p, i) => {
              const max = topPages[0]?.n ?? 1;
              const w = Math.round((p.n / max) * 100);
              return (
                <motion.div key={p.path} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="group relative overflow-hidden rounded-lg border border-white/5 bg-white/[0.02] p-2 transition hover:bg-white/[0.05]">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate font-mono text-white/90">{p.path}</span>
                    <span className="shrink-0 font-bold tabular-nums text-white">{fmt(p.n)}</span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/5">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${w}%` }}
                      transition={{ duration: 0.7, ease: "easeOut", delay: i * 0.04 }}
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, ${PIE[i % PIE.length]}, ${PIE[(i + 1) % PIE.length]})` }} />
                  </div>
                  <div className="mt-0.5 text-[9px] text-muted-foreground">
                    {fmt(p.u)} unikalių sesijų
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Roles + Reservation status */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Card title="Naudotojų vaidmenys" icon={Users}>
          <div className="h-56">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={rolePie} innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value" nameKey="name" stroke="none">
                  {rolePie.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
                </Pie>
                <Tooltip content={<GlassTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 flex flex-wrap justify-center gap-2 text-[10px] text-muted-foreground">
            {rolePie.map((r, i) => (
              <span key={r.name} className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ background: PIE[i % PIE.length] }} />
                {r.name} · {fmt(r.value)}
              </span>
            ))}
          </div>
        </Card>
        <Card title="Rezervacijų būsenos" icon={BarChart3}>
          <div className="h-56">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={statusPie} innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value" nameKey="name" stroke="none">
                  {statusPie.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
                </Pie>
                <Tooltip content={<GlassTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 flex flex-wrap justify-center gap-2 text-[10px] text-muted-foreground">
            {statusPie.map((r, i) => (
              <span key={r.name} className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ background: PIE[i % PIE.length] }} />
                {r.name} · {fmt(r.value)}
              </span>
            ))}
          </div>
        </Card>
      </div>

      {/* Live feed */}
      <Card title="Live veiklos srautas" icon={ActivityIcon} tools={
        <button onClick={exportFeed}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/70 px-2.5 py-1 text-[10px] font-semibold backdrop-blur transition hover:bg-accent">
          <Download className="h-3 w-3" /> CSV
        </button>
      }>
        <div className="max-h-[380px] overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {liveEvents.length === 0 && (
              <p className="text-xs text-muted-foreground">Laukiama pirmų įvykių…</p>
            )}
            {liveEvents.map((e) => (
              <motion.div key={e.id}
                layout
                initial={{ opacity: 0, x: -16, backgroundColor: "rgba(16,185,129,0.15)" }}
                animate={{ opacity: 1, x: 0, backgroundColor: "rgba(255,255,255,0.02)" }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="mb-1.5 flex flex-wrap items-center gap-2 rounded-lg border border-white/5 px-2.5 py-1.5 text-[11px]">
                <ActionBadge action={e.action} />
                <span className="truncate font-mono text-white/80">{e.path}</span>
                <span className="ml-auto flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                  <DeviceIcon d={e.device} />
                  <span className="hidden sm:inline">{e.browser}</span>
                  <span className="hidden md:inline">· {e.os}</span>
                  {e.lang && <span className="hidden md:inline">· {e.lang}</span>}
                  {e.user_role && (
                    <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold text-white/80">
                      {e.user_role}
                    </span>
                  )}
                  {e.user_name && <span className="hidden lg:inline">· {e.user_name}</span>}
                  <span>· {timeAgo(e.created_at)}</span>
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </Card>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================
function Card({ title, icon: Icon, tools, children }: {
  title: string; icon: React.ComponentType<{ className?: string }>;
  tools?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-card/60 p-4 backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="h-4 w-4 text-primary" />
          <span>{title}</span>
        </div>
        {tools}
      </div>
      {children}
    </div>
  );
}

function HeroStat({
  label, value, delta, icon: Icon, color, spark, active = true, onClick, hideDelta, sub,
}: {
  label: string; value: number; delta: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string; spark: number[]; active?: boolean; onClick?: () => void;
  hideDelta?: boolean; sub?: string;
}) {
  const isUp = delta >= 0;
  return (
    <Tilt3D intensity={7} className="rounded-2xl">
      <motion.button
        type="button"
        onClick={onClick}
        whileTap={{ scale: 0.98 }}
        className={`group relative w-full overflow-hidden rounded-2xl border p-3 text-left backdrop-blur-xl transition-all sm:p-4 ${
          active ? "border-white/15 bg-card/70" : "border-white/5 bg-card/30 opacity-60"
        }`}
        style={{ boxShadow: active ? `0 20px 60px -30px ${color}` : "none" }}
      >
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-40 blur-2xl transition-opacity group-hover:opacity-70"
          style={{ background: color }}
        />
        <div className="relative flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground sm:text-[10px]">
              {label}
            </p>
            <p className="mt-0.5 font-display text-xl font-bold sm:text-2xl" style={{ color }}>
              <AnimatedNumber value={value} />
            </p>
            {sub && <p className="mt-0.5 text-[9px] text-muted-foreground">{sub}</p>}
          </div>
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/5" style={{ color }}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        {!hideDelta && (
          <div className="mt-1.5 flex items-center gap-1 text-[10px]">
            <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold ${
              isUp ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"
            }`}>
              {isUp ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
              {Math.abs(delta)}%
            </span>
            <span className="text-muted-foreground">vs. pra. periodas</span>
          </div>
        )}
        {/* mini spark */}
        <div className="mt-2 h-8">
          <ResponsiveContainer>
            <AreaChart data={spark.map((v, i) => ({ i, v }))}>
              <defs>
                <linearGradient id={`sp-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.7} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#sp-${label})`} isAnimationActive />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.button>
    </Tilt3D>
  );
}

function MiniStat({ icon: Icon, label, value, color, hint }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: number; color: string; hint?: string;
}) {
  return (
    <Tilt3D intensity={5} className="rounded-xl">
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-card/60 p-3 backdrop-blur">
        <div className="pointer-events-none absolute -right-4 -top-4 h-14 w-14 rounded-full opacity-40 blur-2xl" style={{ background: color }} />
        <div className="relative flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/5" style={{ color }}>
            <Icon className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="font-display text-lg font-bold" style={{ color }}><AnimatedNumber value={value} /></p>
            {hint && <p className="text-[9px] text-muted-foreground">{hint}</p>}
          </div>
        </div>
      </div>
    </Tilt3D>
  );
}

function DeviceCard({ devices }: { devices: { device: string; n: number }[] }) {
  const total = devices.reduce((s, d) => s + d.n, 0) || 1;
  const iconFor = (d: string) =>
    d === "mobile" ? Smartphone : d === "tablet" ? Tablet : Monitor;
  const colorFor = (d: string) =>
    d === "mobile" ? C.cyan : d === "tablet" ? C.amber : C.violet;
  const labelFor = (d: string) =>
    d === "mobile" ? "Telefonas" : d === "tablet" ? "Planšetė" : d === "desktop" ? "Kompiuteris" : "Kita";
  return (
    <Card title="Įrenginiai" icon={Smartphone}>
      <div className="space-y-2">
        {devices.length === 0 && <p className="text-xs text-muted-foreground">Nėra duomenų.</p>}
        {devices.map((d, i) => {
          const p = Math.round((d.n / total) * 100);
          const Icon = iconFor(d.device);
          const color = colorFor(d.device);
          return (
            <motion.div key={d.device} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="relative overflow-hidden rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/5" style={{ color }}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">{labelFor(d.device)}</span>
                    <span className="tabular-nums text-muted-foreground">{fmt(d.n)} · {p}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${p}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="h-full rounded-full" style={{ background: color, boxShadow: `0 0 12px ${color}` }} />
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}

function BreakdownCard({ title, icon, items, color }: {
  title: string; icon: React.ComponentType<{ className?: string }>;
  items: { label: string; n: number }[]; color: string;
}) {
  const total = items.reduce((s, d) => s + d.n, 0) || 1;
  return (
    <Card title={title} icon={icon}>
      <div className="space-y-1.5">
        {items.length === 0 && <p className="text-xs text-muted-foreground">Nėra duomenų.</p>}
        {items.slice(0, 8).map((d, i) => {
          const p = Math.round((d.n / total) * 100);
          return (
            <motion.div key={d.label + i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="group relative overflow-hidden rounded-md border border-white/5 bg-white/[0.02] p-2">
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="truncate font-semibold text-white/90">{d.label}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{fmt(d.n)} · {p}%</span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/5">
                <motion.div initial={{ width: 0 }} animate={{ width: `${p}%` }}
                  transition={{ duration: 0.7, ease: "easeOut", delay: i * 0.04 }}
                  className="h-full rounded-full" style={{ background: color }} />
              </div>
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}

function DeviceIcon({ d }: { d: string }) {
  const Icon = d === "mobile" ? Smartphone : d === "tablet" ? Tablet : Monitor;
  return <Icon className="h-3 w-3" />;
}

function ActionBadge({ action }: { action: string }) {
  const map: Record<string, { label: string; color: string; Icon: React.ComponentType<{ className?: string }> }> = {
    "page.view": { label: "Peržiūra", color: C.cyan, Icon: Eye },
    "auth.signed_in": { label: "Prisijungimas", color: C.emerald, Icon: LogIn },
    "auth.signed_out": { label: "Atsijungimas", color: C.rose, Icon: LogOut },
  };
  const entry = map[action] ?? { label: action, color: C.violet, Icon: ActivityIcon };
  return (
    <span className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold"
      style={{ color: entry.color, borderColor: `${entry.color}55`, background: `${entry.color}15` }}>
      <entry.Icon className="h-2.5 w-2.5" />
      {entry.label}
    </span>
  );
}
