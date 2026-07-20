import { useMemo, useEffect, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  RadialBarChart,
  RadialBar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { X, ArrowUp, ArrowDown, Sparkles, Clock, Globe, Users, Eye } from "lucide-react";

type ActivityRow = {
  id: string;
  created_at: string;
  action: string;
  user_id: string | null;
  meta?: any;
};

export type KpiKind = "views" | "uniques" | "signIns" | "signOuts";

const KIND_META: Record<
  KpiKind,
  { label: string; color: string; grad: [string, string]; action: string | null }
> = {
  views: { label: "Peržiūros", color: "#06b6d4", grad: ["#06b6d4", "#8b5cf6"], action: "page.view" },
  uniques: { label: "Unikalūs lankytojai", color: "#a855f7", grad: ["#a855f7", "#ec4899"], action: "page.view" },
  signIns: { label: "Prisijungimai", color: "#10b981", grad: ["#10b981", "#06b6d4"], action: "auth.signed_in" },
  signOuts: { label: "Atsijungimai", color: "#f43f5e", grad: ["#f43f5e", "#f59e0b"], action: "auth.signed_out" },
};

function CountUp({ value }: { value: number }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v).toLocaleString("lt-LT"));
  useEffect(() => {
    const c = animate(mv, value, { duration: 1.4, ease: [0.22, 1, 0.36, 1] });
    return c.stop;
  }, [value, mv]);
  return <motion.span>{rounded}</motion.span>;
}

function GlassTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-black/85 px-2.5 py-1.5 text-[11px] shadow-xl backdrop-blur">
      {label != null && <p className="mb-0.5 font-semibold text-white/90">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color, boxShadow: `0 0 8px ${p.color}` }} />
          <span className="text-white/70">{p.name}</span>
          <span className="ml-2 font-bold text-white">{Number(p.value).toLocaleString("lt-LT")}</span>
        </div>
      ))}
    </div>
  );
}

/** Rich, animated drill-down for a KPI. */
export function KpiDetailModal({
  kind,
  onClose,
  activity,
  rangeSince,
  rangeDays,
}: {
  kind: KpiKind | null;
  onClose: () => void;
  activity: ActivityRow[];
  rangeSince: string;
  rangeDays: number;
}) {
  const [hoverDay, setHoverDay] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!kind) return [];
    const meta = KIND_META[kind];
    return activity.filter((a) => {
      if (a.created_at.slice(0, 10) < rangeSince) return false;
      if (meta.action && a.action !== meta.action) return false;
      return true;
    });
  }, [kind, activity, rangeSince]);

  const events = useMemo(() => {
    if (kind !== "uniques") return filtered;
    const seen = new Set<string>();
    const out: ActivityRow[] = [];
    for (const e of filtered) {
      const k = e.user_id ?? `a-${e.id}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(e);
    }
    return out;
  }, [kind, filtered]);

  const total = events.length;
  const anonCount = events.filter((e) => !e.user_id).length;
  const regCount = total - anonCount;

  // Daily breakdown
  const byDay = useMemo(() => {
    const out: { key: string; label: string; count: number }[] = [];
    for (let i = rangeDays - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      out.push({ key, label: key.slice(5), count: 0 });
    }
    const idx: Record<string, number> = {};
    out.forEach((r, i) => (idx[r.key] = i));
    for (const e of events) {
      const k = e.created_at.slice(0, 10);
      if (idx[k] !== undefined) out[idx[k]].count += 1;
    }
    return out;
  }, [events, rangeDays]);

  // Hourly (radial 24h)
  const byHour = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, h) => ({
      hour: `${String(h).padStart(2, "0")}h`,
      value: 0,
      fill: `hsl(${(h / 24) * 260 + 200}, 80%, 55%)`,
    }));
    for (const e of events) {
      const h = Number(e.created_at.slice(11, 13));
      if (h >= 0 && h < 24) buckets[h].value += 1;
    }
    return buckets;
  }, [events]);

  const peakDay = useMemo(
    () => byDay.slice().sort((a, b) => b.count - a.count)[0],
    [byDay],
  );
  const peakHour = useMemo(
    () => byHour.slice().sort((a, b) => b.value - a.value)[0],
    [byHour],
  );

  // Top paths (only meaningful for view-based KPIs)
  const topPaths = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of events) {
      const p = (e.meta?.path as string | undefined) ?? "/";
      map[p] = (map[p] ?? 0) + 1;
    }
    return Object.entries(map)
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [events]);

  const previousTotal = useMemo(() => {
    if (!kind) return 0;
    const meta = KIND_META[kind];
    const from = new Date(Date.now() - rangeDays * 2 * 86400000).toISOString().slice(0, 10);
    const to = rangeSince;
    const prev = activity.filter((a) => {
      const d = a.created_at.slice(0, 10);
      if (d < from || d >= to) return false;
      if (meta.action && a.action !== meta.action) return false;
      return true;
    });
    if (kind !== "uniques") return prev.length;
    return new Set(prev.map((e) => e.user_id ?? `a-${e.id}`)).size;
  }, [kind, activity, rangeSince, rangeDays]);

  const delta =
    !previousTotal && !total
      ? 0
      : !previousTotal
      ? 100
      : Math.round(((total - previousTotal) / previousTotal) * 100);
  const up = delta >= 0;

  const meta = kind ? KIND_META[kind] : null;
  const maxDay = Math.max(1, ...byDay.map((d) => d.count));

  return (
    <AnimatePresence>
      {kind && meta && (
        <>
          <motion.div
            key="bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-md"
          />
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="fixed left-1/2 top-1/2 z-[91] w-[min(1100px,95vw)] max-h-[92vh] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border border-white/10 bg-background/95 shadow-2xl backdrop-blur-2xl"
          >
            {/* Orbiting ambient blobs */}
            <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 30, ease: "linear" }}
                className="absolute -left-24 -top-24 h-[420px] w-[420px] rounded-full opacity-40 blur-3xl"
                style={{ background: `radial-gradient(circle, ${meta.grad[0]}55, transparent 60%)` }}
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ repeat: Infinity, duration: 40, ease: "linear" }}
                className="absolute -right-32 top-40 h-[520px] w-[520px] rounded-full opacity-40 blur-3xl"
                style={{ background: `radial-gradient(circle, ${meta.grad[1]}55, transparent 60%)` }}
              />
              <div
                className="absolute inset-0 opacity-[0.07]"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
                  backgroundSize: "48px 48px",
                }}
              />
            </div>

            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 pt-5 pb-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <motion.span
                    animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="h-2 w-2 rounded-full"
                    style={{ background: meta.color, boxShadow: `0 0 10px ${meta.color}` }}
                  />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    Rodiklio detalės · {rangeDays} d.
                  </span>
                </div>
                <h2
                  className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl"
                  style={{
                    backgroundImage: `linear-gradient(120deg, ${meta.grad[0]}, ${meta.grad[1]})`,
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  {meta.label}
                </h2>
                <div className="mt-2 flex items-baseline gap-3">
                  <p className="font-display text-5xl font-bold tabular-nums">
                    <CountUp value={total} />
                  </p>
                  <span
                    className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold ${
                      up ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"
                    }`}
                  >
                    {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                    {Math.abs(delta)}%
                    <span className="ml-1 opacity-70">vs pr.</span>
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="grid max-h-[calc(92vh-160px)] gap-4 overflow-y-auto p-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              {/* Left: daily bars */}
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-card/60 p-4 backdrop-blur">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" style={{ color: meta.color }} />
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Pasiskirstymas per dienas
                      </p>
                    </div>
                    {hoverDay && (
                      <motion.span
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-mono text-foreground"
                      >
                        {hoverDay}
                      </motion.span>
                    )}
                  </div>
                  <div className="flex h-40 items-end gap-1">
                    {byDay.map((d, i) => {
                      const h = Math.max(2, (d.count / maxDay) * 100);
                      return (
                        <motion.div
                          key={d.key}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: `${h}%`, opacity: 1 }}
                          transition={{
                            delay: i * 0.015,
                            duration: 0.7,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                          onMouseEnter={() => setHoverDay(`${d.label} · ${d.count}`)}
                          onMouseLeave={() => setHoverDay(null)}
                          whileHover={{ scale: 1.06, filter: "brightness(1.3)" }}
                          className="group relative flex-1 cursor-pointer rounded-t-md"
                          style={{
                            background: `linear-gradient(to top, ${meta.grad[0]}, ${meta.grad[1]})`,
                            boxShadow: `0 -4px 20px -6px ${meta.color}88`,
                          }}
                        >
                          <motion.div
                            className="pointer-events-none absolute inset-0 rounded-t-md opacity-0 group-hover:opacity-100"
                            style={{ boxShadow: `inset 0 0 0 1px #ffffff40` }}
                          />
                        </motion.div>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex justify-between text-[9px] text-muted-foreground">
                    <span>{byDay[0]?.label}</span>
                    <span>Piko diena: <span className="font-semibold text-foreground">{peakDay?.label} ({peakDay?.count})</span></span>
                    <span>{byDay[byDay.length - 1]?.label}</span>
                  </div>
                </div>

                {/* Top paths */}
                {topPaths.length > 0 && (
                  <div className="rounded-2xl border border-white/10 bg-card/60 p-4 backdrop-blur">
                    <div className="mb-2 flex items-center gap-2">
                      <Globe className="h-4 w-4" style={{ color: meta.color }} />
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Populiariausi puslapiai
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      {topPaths.map((p, i) => {
                        const max = topPaths[0].count;
                        const w = Math.max(6, (p.count / max) * 100);
                        return (
                          <motion.div
                            key={p.path}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.04 * i }}
                            className="relative overflow-hidden rounded-lg border border-white/5 bg-background/40 px-2.5 py-1.5"
                          >
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${w}%` }}
                              transition={{ delay: 0.05 * i, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                              className="absolute inset-y-0 left-0"
                              style={{
                                background: `linear-gradient(to right, ${meta.grad[0]}33, ${meta.grad[1]}22)`,
                              }}
                            />
                            <div className="relative flex items-center justify-between gap-2 text-[11px]">
                              <span className="truncate font-mono">{p.path}</span>
                              <span className="shrink-0 font-bold tabular-nums" style={{ color: meta.color }}>
                                {p.count}
                              </span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: hour radial + KPIs + latest */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <StatChip label="Registruoti" value={regCount} icon={Users} color="#10b981" />
                  <StatChip label="Anoniminiai" value={anonCount} icon={Eye} color="#f59e0b" />
                </div>

                <div className="rounded-2xl border border-white/10 bg-card/60 p-4 backdrop-blur">
                  <div className="mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4" style={{ color: meta.color }} />
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Aktyvumas per parą
                    </p>
                  </div>
                  <div className="relative h-52">
                    <ResponsiveContainer>
                      <RadialBarChart
                        innerRadius="30%"
                        outerRadius="100%"
                        data={byHour}
                        startAngle={90}
                        endAngle={-270}
                      >
                        <RadialBar
                          dataKey="value"
                          cornerRadius={4}
                          background={{ fill: "hsl(var(--border) / 0.2)" }}
                        />
                        <Tooltip content={<GlassTip />} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 grid place-items-center">
                      <div className="text-center">
                        <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
                          Piko val.
                        </p>
                        <p className="font-display text-2xl font-bold" style={{ color: meta.color }}>
                          {peakHour?.hour}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{peakHour?.value} įv.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-card/60 p-4 backdrop-blur">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Paskutiniai įvykiai
                  </p>
                  <div className="max-h-52 space-y-1 overflow-y-auto pr-1">
                    {events.slice(0, 25).map((e, i) => (
                      <motion.div
                        key={e.id}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-background/40 px-2 py-1 text-[10px]"
                      >
                        <span className="truncate font-mono text-muted-foreground">
                          {new Date(e.created_at).toLocaleString("lt-LT")}
                        </span>
                        <span
                          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                            e.user_id
                              ? "bg-emerald-500/15 text-emerald-400"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {e.user_id ? "reg" : "anon"}
                        </span>
                      </motion.div>
                    ))}
                    {events.length === 0 && (
                      <p className="rounded-lg border border-white/5 bg-background/40 p-3 text-center text-[11px] text-muted-foreground">
                        Nėra įrašų šiam laikotarpiui.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function StatChip({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.02 }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-card/60 p-3 backdrop-blur"
    >
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full opacity-40 blur-2xl"
        style={{ background: color }}
      />
      <div className="relative">
        <div className="flex items-center gap-1.5">
          <span style={{ color }} className="inline-flex"><Icon className="h-3 w-3" /></span>
          <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
            {label}
          </p>
        </div>
        <p className="mt-1 font-display text-2xl font-bold" style={{ color }}>
          <CountUp value={value} />
        </p>
      </div>
    </motion.div>
  );
}
