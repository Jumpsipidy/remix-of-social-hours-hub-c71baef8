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
} from "lucide-react";
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
  const rangeSince = useMemo(
    () => new Date(Date.now() - range * 24 * 3600 * 1000).toISOString().slice(0, 10),
    [range],
  );

  const refresh = async () => {
    setLoading(true);
    try {
      setData(await fn());
      setRefreshTick((t) => t + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Klaida");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    refresh();
  }, []);

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
            onClick={refresh}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-2 text-xs font-semibold backdrop-blur transition hover:bg-accent"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      {/* Hero KPI row */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <HeroStat
          label="Peržiūros"
          value={totals.views}
          delta={pct(totals.views, prevTotals.views)}
          icon={Eye}
          gradient="from-cyan-500/25 via-cyan-500/5 to-transparent"
          color={C.cyan}
          spark={traffic.map((t) => t.Peržiūros)}
        />
        <HeroStat
          label="Unikalūs"
          value={totals.uniques}
          delta={pct(totals.uniques, prevTotals.uniques)}
          icon={Users}
          gradient="from-violet-500/25 via-violet-500/5 to-transparent"
          color={C.violet}
          spark={traffic.map((t) => t.Unikalūs)}
        />
        <HeroStat
          label="Prisijungimai"
          value={totals.signIns}
          delta={pct(totals.signIns, prevTotals.signIns)}
          icon={LogIn}
          gradient="from-emerald-500/25 via-emerald-500/5 to-transparent"
          color={C.emerald}
          spark={traffic.map((t) => t.Prisijungimai)}
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
        />
      </div>

      {/* Main split: traffic chart + goal ring */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card delay={0} title="Svetainės srautas" icon={Globe} action={
          <button onClick={exportTraffic} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/40 px-3 py-1.5 text-[11px] font-semibold hover:bg-accent">
            <Download className="h-3 w-3" /> CSV
          </button>
        }>
          <div className="h-80 w-full">
            <ResponsiveContainer>
              <AreaChart data={traffic} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="g-views" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.cyan} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={C.cyan} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g-uni" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.violet} stopOpacity={0.7} />
                    <stop offset="100%" stopColor={C.violet} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g-in" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.emerald} stopOpacity={0.7} />
                    <stop offset="100%" stopColor={C.emerald} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.25} />
                <XAxis dataKey="label" fontSize={10} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                <YAxis fontSize={10} stroke="hsl(var(--muted-foreground))" allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip content={<GlassTooltip />} cursor={{ stroke: C.primary, strokeWidth: 1, strokeDasharray: "4 4" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                <Area type="monotone" dataKey="Peržiūros" stroke={C.cyan} strokeWidth={2.5} fill="url(#g-views)" animationDuration={900} />
                <Area type="monotone" dataKey="Unikalūs" stroke={C.violet} strokeWidth={2} fill="url(#g-uni)" animationDuration={1100} />
                <Area type="monotone" dataKey="Prisijungimai" stroke={C.emerald} strokeWidth={2} fill="url(#g-in)" animationDuration={1300} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
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
                <motion.div
                  key={p.path}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.02 * i }}
                  className="group relative overflow-hidden rounded-xl border border-border/60 bg-background/40 px-3 py-2"
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${w}%` }}
                    transition={{ duration: 0.9, delay: 0.05 * i, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary/30 to-cyan-500/20"
                  />
                  <div className="relative flex items-center justify-between gap-2 text-xs">
                    <span className="truncate font-mono text-foreground">{p.path}</span>
                    <span className="shrink-0 font-bold tabular-nums text-primary">
                      {p.count.toLocaleString("lt-LT")}
                    </span>
                  </div>
                </motion.div>
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
        <Card delay={0.3} title="Rezervacijų būsenos" icon={TrendingUp}>
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
                >
                  {statusPie.map((_, i) => (
                    <Cell key={i} fill={PIE[i % PIE.length]} stroke="hsl(var(--card))" strokeWidth={2} />
                  ))}
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
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2 }}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card/70 p-4 shadow-md backdrop-blur transition"
    >
      {/* subtle border glow on hover */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity group-hover:opacity-100"
           style={{ boxShadow: "inset 0 0 40px rgba(139,92,246,0.08)" }} />
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <p className="text-sm font-semibold">{title}</p>
        </div>
        {action}
      </div>
      {children}
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
}: {
  label: string;
  value: number;
  delta: number;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  color: string;
  spark: number[];
  hideDelta?: boolean;
}) {
  const up = delta >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card/70 p-4 shadow-md backdrop-blur"
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${gradient} opacity-70`} />
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl opacity-40 transition-opacity group-hover:opacity-70"
        style={{ background: color }}
      />
      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-white/5 backdrop-blur"
               style={{ color }}>
            <Icon className="h-3.5 w-3.5" />
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
    </motion.div>
  );
}
