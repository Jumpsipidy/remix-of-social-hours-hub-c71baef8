import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/analytics")({ component: Page });

type Data = Awaited<ReturnType<typeof adminAnalytics>>;

const COLORS = {
  res: "hsl(var(--primary))",
  msg: "#a855f7",
  users: "#22c55e",
  amber: "#f59e0b",
  rose: "#f43f5e",
  cyan: "#06b6d4",
  indigo: "#6366f1",
};

const PIE = [COLORS.res, COLORS.msg, COLORS.users, COLORS.amber, COLORS.rose, COLORS.cyan];

const dayKey = (iso: string) => iso.slice(0, 10);
const hourKey = (iso: string) => Number(iso.slice(11, 13));

function downloadCsv(filename: string, rows: Record<string, string | number>[]) {
  if (!rows.length) {
    toast.error("Nėra duomenų eksportui");
    return;
  }
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

function Page() {
  const fn = useServerFn(adminAnalytics);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = async () => {
    setLoading(true);
    try {
      setData(await fn());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Klaida");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    refresh();
  }, []);

  // 30-day activity trend: reservations, messages, users
  const days = useMemo(() => {
    if (!data) return [];
    const out: {
      label: string;
      Rezervacijos: number;
      Žinutės: number;
      Vartotojai: number;
    }[] = [];
    for (let i = 29; i >= 0; i--) {
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
  }, [data]);

  // Auth + traffic trend
  const traffic = useMemo(() => {
    if (!data) return [];
    const out: {
      label: string;
      Prisijungimai: number;
      Atsijungimai: number;
      Peržiūros: number;
      Unikalūs: number;
    }[] = [];
    for (let i = 29; i >= 0; i--) {
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
  }, [data]);

  // Hourly heatmap distribution (24h) — all events by hour of day, last 30 d
  const hours = useMemo(() => {
    if (!data) return [];
    const buckets = Array.from({ length: 24 }, (_, h) => ({
      hour: `${String(h).padStart(2, "0")}h`,
      Peržiūros: 0,
      Prisijungimai: 0,
    }));
    for (const a of data.activity) {
      const h = hourKey(a.created_at);
      if (h < 0 || h > 23) continue;
      if (a.action === "page.view") buckets[h].Peržiūros += 1;
      else if (a.action === "auth.signed_in") buckets[h].Prisijungimai += 1;
    }
    return buckets;
  }, [data]);

  const statusPie = useMemo(() => {
    if (!data) return [];
    const map: Record<string, number> = {};
    data.reservations.forEach((r) => {
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
  }, [data]);

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
    const views = data.activity.filter((a) => a.action === "page.view");
    return {
      signIns: data.activity.filter((a) => a.action === "auth.signed_in").length,
      signOuts: data.activity.filter((a) => a.action === "auth.signed_out").length,
      views: views.length,
      uniques: new Set(views.map((v) => v.user_id ?? `a-${v.id}`)).size,
      anon: views.filter((v) => !v.user_id).length,
    };
  }, [data]);

  const totalHours =
    data?.reservations.reduce(
      (s, r) => s + (r.status === "completed" ? r.hours_to_earn ?? 0 : 0),
      0,
    ) ?? 0;
  const completedRate = data?.reservations.length
    ? Math.round(
        (data.reservations.filter((r) => r.status === "completed").length /
          data.reservations.length) *
          100,
      )
    : 0;

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
        { rodiklis: "Rezervacijos (30d)", reikšmė: data?.reservations.length ?? 0 },
        { rodiklis: "Užbaigimo %", reikšmė: completedRate },
        { rodiklis: "Suteikta valandų", reikšmė: totalHours },
      ],
    );

  return (
    <div className="space-y-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            <BarChart3 className="h-6 w-6 shrink-0 text-primary" />
            <span className="truncate">Analitika · 30 dienų</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Prisijungimai, atsijungimai, srautas ir konversijos. CSV eksportas.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={exportSummary}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/70 px-3 py-2 text-xs font-semibold backdrop-blur hover:bg-accent"
            title="Eksportuoti suvestinę"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </button>
          <button
            onClick={refresh}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-2 text-xs font-semibold backdrop-blur hover:bg-accent"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      {/* Traffic KPI row */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Prisijungimai" value={totals.signIns} icon={LogIn} tone="ok" />
        <Stat label="Atsijungimai" value={totals.signOuts} icon={LogOut} tone="warn" />
        <Stat label="Peržiūros" value={totals.views} icon={Eye} tone="info" />
        <Stat label="Unikalūs" value={totals.uniques} icon={Users} tone="info" />
        <Stat label="Anonim." value={totals.anon} icon={Eye} tone="mute" />
      </div>

      {/* Website traffic chart */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card/70 p-4 shadow-md backdrop-blur"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Svetainės srautas · 30 d.</p>
          </div>
          <button
            onClick={exportTraffic}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/40 px-3 py-1.5 text-[11px] font-semibold hover:bg-accent"
          >
            <Download className="h-3 w-3" /> CSV
          </button>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer>
            <AreaChart data={traffic} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="g-views" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.cyan} stopOpacity={0.85} />
                  <stop offset="100%" stopColor={COLORS.cyan} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="g-in" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.users} stopOpacity={0.8} />
                  <stop offset="100%" stopColor={COLORS.users} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="g-out" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.rose} stopOpacity={0.7} />
                  <stop offset="100%" stopColor={COLORS.rose} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="label" fontSize={10} stroke="hsl(var(--muted-foreground))" />
              <YAxis fontSize={10} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area
                type="monotone"
                dataKey="Peržiūros"
                stroke={COLORS.cyan}
                strokeWidth={2}
                fill="url(#g-views)"
              />
              <Area
                type="monotone"
                dataKey="Prisijungimai"
                stroke={COLORS.users}
                strokeWidth={2}
                fill="url(#g-in)"
              />
              <Area
                type="monotone"
                dataKey="Atsijungimai"
                stroke={COLORS.rose}
                strokeWidth={2}
                fill="url(#g-out)"
              />
              <Line
                type="monotone"
                dataKey="Unikalūs"
                stroke={COLORS.amber}
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Hour-of-day distribution */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-2xl border border-border bg-card/70 p-4 shadow-md backdrop-blur"
      >
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">Aktyvumas per parą (val.)</p>
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer>
            <BarChart data={hours} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="hour" fontSize={9} stroke="hsl(var(--muted-foreground))" />
              <YAxis fontSize={10} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Peržiūros" radius={[6, 6, 0, 0]} fill={COLORS.cyan} />
              <Bar dataKey="Prisijungimai" radius={[6, 6, 0, 0]} fill={COLORS.users} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Product KPI row */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Naujos rezervacijos" value={data?.reservations.length ?? 0} icon={BarChart3} tone="info" />
        <Stat label="Įvykdyta" value={`${completedRate}%`} icon={TrendingUp} tone="ok" />
        <Stat label="Suteikta valandų" value={totalHours} icon={TrendingUp} tone="ok" />
      </div>

      {/* Product activity trend */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-border bg-card/70 p-4 shadow-md backdrop-blur"
      >
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">Veikla per 30 d.</p>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer>
            <AreaChart data={days} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="g-res" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.res} stopOpacity={0.8} />
                  <stop offset="100%" stopColor={COLORS.res} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="g-msg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.msg} stopOpacity={0.7} />
                  <stop offset="100%" stopColor={COLORS.msg} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="g-usr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.users} stopOpacity={0.7} />
                  <stop offset="100%" stopColor={COLORS.users} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="label" fontSize={10} stroke="hsl(var(--muted-foreground))" />
              <YAxis fontSize={10} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="Rezervacijos" stroke={COLORS.res} strokeWidth={2} fill="url(#g-res)" />
              <Area type="monotone" dataKey="Žinutės" stroke={COLORS.msg} strokeWidth={2} fill="url(#g-msg)" />
              <Area type="monotone" dataKey="Vartotojai" stroke={COLORS.users} strokeWidth={2} fill="url(#g-usr)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl border border-border bg-card/70 p-4 shadow-md backdrop-blur"
        >
          <p className="mb-3 text-sm font-semibold">Rezervacijų būsenos</p>
          <div className="h-56">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={statusPie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {statusPie.map((_, i) => (
                    <Cell key={i} fill={PIE[i % PIE.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-border bg-card/70 p-4 shadow-md backdrop-blur"
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">Vartotojai pagal rolę</p>
            <button
              onClick={exportActivity}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/40 px-3 py-1.5 text-[11px] font-semibold hover:bg-accent"
              title="Eksportuoti veiklos žurnalą (auth + peržiūros)"
            >
              <Download className="h-3 w-3" /> Veikla CSV
            </button>
          </div>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={rolePie} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="name" fontSize={10} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={10} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {rolePie.map((_, i) => (
                    <Cell key={i} fill={PIE[i % PIE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  tone = "info",
}: {
  label: string;
  value: string | number;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: "info" | "ok" | "warn" | "mute";
}) {
  const toneCls =
    tone === "ok"
      ? "text-emerald-400"
      : tone === "warn"
        ? "text-rose-400"
        : tone === "mute"
          ? "text-muted-foreground"
          : "text-primary";
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="rounded-2xl border border-border bg-card/70 p-4 shadow-sm backdrop-blur"
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {Icon ? <Icon className={`h-4 w-4 ${toneCls}`} /> : null}
      </div>
      <p className="mt-1 font-display text-3xl font-bold">{value}</p>
    </motion.div>
  );
}
