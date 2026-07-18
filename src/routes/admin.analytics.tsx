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
import { BarChart3, RefreshCw, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/analytics")({ component: Page });

type Data = Awaited<ReturnType<typeof adminAnalytics>>;

const COLORS = {
  res: "hsl(var(--primary))",
  msg: "#a855f7",
  users: "#22c55e",
  amber: "#f59e0b",
  rose: "#f43f5e",
};

function Page() {
  const fn = useServerFn(adminAnalytics);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = async () => {
    setLoading(true);
    try { setData(await fn()); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Klaida"); }
    finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, []);

  const days = useMemo(() => {
    if (!data) return [];
    const out: { label: string; Rezervacijos: number; Žinutės: number; Vartotojai: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 3600 * 1000);
      const key = d.toISOString().slice(0, 10);
      out.push({
        label: key.slice(5),
        Rezervacijos: data.reservations.filter((r) => r.created_at.slice(0, 10) === key).length,
        Žinutės: data.messages.filter((m) => m.created_at.slice(0, 10) === key).length,
        Vartotojai: data.profiles.filter((p) => p.created_at.slice(0, 10) === key).length,
      });
    }
    return out;
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

  const rolePie = useMemo(() => {
    if (!data) return [];
    const map: Record<string, number> = {};
    data.profiles.forEach((p: any) => { map[p.role] = (map[p.role] ?? 0) + 1; });
    const labels: Record<string, string> = {
      student: "Mokiniai", organization: "Organizacijos", school_admin: "Mokyklos adm.", admin: "Admin",
    };
    return Object.entries(map).map(([k, v]) => ({ name: labels[k] ?? k, value: v }));
  }, [data]);

  const totalHours = data?.reservations.reduce((s, r) => s + (r.status === "completed" ? r.hours_to_earn ?? 0 : 0), 0) ?? 0;
  const completedRate = data?.reservations.length
    ? Math.round((data.reservations.filter((r) => r.status === "completed").length / data.reservations.length) * 100)
    : 0;

  const pieColors = [COLORS.res, COLORS.msg, COLORS.users, COLORS.amber, COLORS.rose];

  return (
    <div className="space-y-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            <BarChart3 className="h-6 w-6 shrink-0 text-primary" />
            <span className="truncate">Analitika · 30 dienų</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Interaktyvūs grafikai su tooltip'ais.</p>
        </div>
        <button onClick={refresh} className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-2 text-xs font-semibold backdrop-blur hover:bg-accent">
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
        </button>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Naujos rezervacijos" value={data?.reservations.length ?? 0} />
        <Stat label="Įvykdyta" value={`${completedRate}%`} />
        <Stat label="Suteikta valandų" value={totalHours} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
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
                  <stop offset="0%" stopColor={COLORS.res} stopOpacity={0.8}/>
                  <stop offset="100%" stopColor={COLORS.res} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="g-msg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.msg} stopOpacity={0.7}/>
                  <stop offset="100%" stopColor={COLORS.msg} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="g-usr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.users} stopOpacity={0.7}/>
                  <stop offset="100%" stopColor={COLORS.users} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="label" fontSize={10} stroke="hsl(var(--muted-foreground))" />
              <YAxis fontSize={10} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="Rezervacijos" stroke={COLORS.res} strokeWidth={2} fill="url(#g-res)" />
              <Area type="monotone" dataKey="Žinutės" stroke={COLORS.msg} strokeWidth={2} fill="url(#g-msg)" />
              <Area type="monotone" dataKey="Vartotojai" stroke={COLORS.users} strokeWidth={2} fill="url(#g-usr)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border bg-card/70 p-4 shadow-md backdrop-blur">
          <p className="mb-3 text-sm font-semibold">Rezervacijų būsenos</p>
          <div className="h-56">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={statusPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2}>
                  {statusPie.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="rounded-2xl border border-border bg-card/70 p-4 shadow-md backdrop-blur">
          <p className="mb-3 text-sm font-semibold">Vartotojai pagal rolę</p>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={rolePie} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="name" fontSize={10} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={10} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {rolePie.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <motion.div whileHover={{ y: -2 }} className="rounded-2xl border border-border bg-card/70 p-4 shadow-sm backdrop-blur">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold">{value}</p>
    </motion.div>
  );
}
