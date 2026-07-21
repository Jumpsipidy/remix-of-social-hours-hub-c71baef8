import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, animate } from "framer-motion";
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Brush, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { adminAnalytics, type AdminAnalyticsV2, type FeedRow } from "@/lib/admin-super.functions";
import { supabase } from "@/integrations/supabase/client";
import { KpiDetailModal, type KpiKind } from "@/components/analytics-kpi-detail";
import { toast } from "sonner";
import {
  Activity, Eye, Users, LogIn, LogOut, RefreshCw, Download, Maximize2, Minimize2,
  Zap, Clock, Globe2, MonitorSmartphone, Chrome, Languages, MapPin, ArrowUp, ArrowDown,
  Sparkles, Radio, Search, Filter, ChevronRight, Layers, Fingerprint, Timer, Trash2,
} from "lucide-react";

export const Route = createFileRoute("/admin/analytics")({ component: Page });

// ─────────────────────────────────────────────────────────────────────────────
// TOKENS
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  cyan: "#06b6d4", violet: "#a855f7", emerald: "#10b981", rose: "#f43f5e",
  amber: "#f59e0b", pink: "#ec4899", sky: "#0ea5e9", indigo: "#6366f1",
};
const PIE = [C.violet, C.cyan, C.emerald, C.amber, C.rose, C.pink, C.sky, C.indigo];
const WD = ["Sk", "Pr", "An", "Tr", "Kt", "Pn", "Št"];
type Range = 7 | 14 | 30 | 60;
type Data = Awaited<ReturnType<typeof adminAnalytics>>;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const fmt = (n: number) => (n ?? 0).toLocaleString("lt-LT");
const pct = (a: number, b: number) => (!b && !a ? 0 : !b ? 100 : Math.round(((a - b) / b) * 100));
const timeAgo = (iso: string) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${Math.round(s)}s`;
  if (s < 3600) return `${Math.round(s / 60)}min`;
  if (s < 86400) return `${Math.round(s / 3600)}val`;
  return `${Math.round(s / 86400)}d`;
};
function bucketVp(vp: string) {
  const w = Number((vp || "").split("x")[0]);
  if (!w) return "unknown";
  if (w < 480) return "XS <480";
  if (w < 768) return "SM <768";
  if (w < 1024) return "MD <1024";
  if (w < 1440) return "LG <1440";
  if (w < 1920) return "XL <1920";
  return "2XL 1920+";
}
function toCsv(name: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return toast.error("Nėra duomenų");
  const heads = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [heads.join(",")].concat(rows.map((r) => heads.map((h) => esc(r[h])).join(","))).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
  toast.success("Eksportuota");
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────
function CountUp({ value }: { value: number }) {
  const mv = useMotionValue(0);
  const t = useTransform(mv, (v) => Math.round(v).toLocaleString("lt-LT"));
  useEffect(() => { const c = animate(mv, value, { duration: 0.8, ease: [0.22, 1, 0.36, 1] }); return c.stop; }, [value, mv]);
  return <motion.span>{t}</motion.span>;
}

function Tilt({ children, className, intensity = 6 }: { children: React.ReactNode; className?: string; intensity?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0.5), my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [intensity, -intensity]), { stiffness: 200, damping: 20 });
  const ry = useSpring(useTransform(mx, [0, 1], [-intensity, intensity]), { stiffness: 200, damping: 20 });
  const gx = useTransform(mx, (v) => `${v * 100}%`);
  const gy = useTransform(my, (v) => `${v * 100}%`);
  const bg = useTransform([gx, gy], ([x, y]) => `radial-gradient(400px circle at ${x} ${y}, rgba(255,255,255,0.10), transparent 55%)`);
  return (
    <motion.div
      ref={ref}
      onPointerMove={(e) => {
        if (e.pointerType === "touch") return;
        const r = ref.current?.getBoundingClientRect(); if (!r) return;
        mx.set((e.clientX - r.left) / r.width); my.set((e.clientY - r.top) / r.height);
      }}
      onPointerLeave={() => { mx.set(0.5); my.set(0.5); }}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 1200 }}
      className={`relative ${className ?? ""}`}
    >
      {children}
      <motion.div aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit]" style={{ background: bg as never }} />
    </motion.div>
  );
}

function Sparkline({ data, color, height = 40 }: { data: number[]; color: string; height?: number }) {
  const max = Math.max(1, ...data);
  const pts = data.map((v, i) => `${(i / Math.max(1, data.length - 1)) * 100},${100 - (v / max) * 100}`).join(" ");
  const area = `0,100 ${pts} 100,100`;
  const id = useRef(`sp-${Math.random().toString(36).slice(2)}`).current;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.5" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${id})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RICH FLOATING TOOLTIP (cursor-follow) — the "SaaS" hover experience
// ─────────────────────────────────────────────────────────────────────────────
type HoverPayload = {
  x: number; y: number;
  title: string;
  primary: { label: string; value: number; color: string }[];
  breakdown?: { label: string; value: number }[];
  spark?: number[];
  sparkColor?: string;
  meta?: { label: string; value: string }[];
};
function FloatingTooltip({ p }: { p: HoverPayload | null }) {
  const x = useSpring(0, { stiffness: 500, damping: 40 });
  const y = useSpring(0, { stiffness: 500, damping: 40 });
  useEffect(() => { if (p) { x.set(p.x + 16); y.set(p.y + 16); } }, [p, x, y]);
  if (!p) return null;
  const total = p.primary.reduce((a, b) => a + b.value, 0);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      style={{ x, y }}
      className="pointer-events-none fixed left-0 top-0 z-[100] w-[300px] overflow-hidden rounded-2xl border border-white/15 bg-slate-950/95 shadow-[0_20px_60px_-15px_rgba(139,92,246,0.4)] backdrop-blur-xl"
    >
      <div className="relative border-b border-white/10 px-4 py-2.5">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 via-cyan-500/10 to-transparent" />
        <div className="relative flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-violet-300" />
          <span className="text-xs font-bold uppercase tracking-widest text-white">{p.title}</span>
        </div>
      </div>
      <div className="space-y-2.5 p-3">
        {p.primary.map((it, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: it.color, boxShadow: `0 0 10px ${it.color}` }} />
                <span className="text-white/70">{it.label}</span>
              </div>
              <span className="font-bold tabular-nums text-white">{fmt(it.value)}</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-white/5">
              <motion.div
                initial={{ width: 0 }} animate={{ width: `${total ? (it.value / Math.max(...p.primary.map((x) => x.value), 1)) * 100 : 0}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="h-full rounded-full" style={{ background: it.color, boxShadow: `0 0 12px ${it.color}` }}
              />
            </div>
          </div>
        ))}
        {p.spark && p.spark.length > 1 && (
          <div className="mt-2 rounded-lg bg-white/[0.03] p-2">
            <div className="mb-1 text-[10px] uppercase tracking-widest text-white/40">Tendencija</div>
            <Sparkline data={p.spark} color={p.sparkColor ?? C.cyan} height={30} />
          </div>
        )}
        {p.breakdown && p.breakdown.length > 0 && (
          <div className="border-t border-white/10 pt-2">
            <div className="mb-1 text-[10px] uppercase tracking-widest text-white/40">Top pasiskirstymas</div>
            {p.breakdown.slice(0, 4).map((b, i) => (
              <div key={i} className="flex items-center justify-between py-0.5 text-[11px]">
                <span className="truncate text-white/60">{b.label}</span>
                <span className="ml-2 font-semibold tabular-nums text-white/90">{fmt(b.value)}</span>
              </div>
            ))}
          </div>
        )}
        {p.meta && p.meta.length > 0 && (
          <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-2">
            {p.meta.map((m, i) => (
              <div key={i} className="rounded-md bg-white/[0.03] px-2 py-1">
                <div className="text-[9px] uppercase tracking-widest text-white/40">{m.label}</div>
                <div className="text-[11px] font-semibold text-white/90">{m.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────
function Page() {
  const fn = useServerFn(adminAnalytics);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [range, setRange] = useState<Range>(30);
  const [live, setLive] = useState(true);
  const [pulseTick, setPulseTick] = useState(0);
  const [lastAt, setLastAt] = useState<Date | null>(null);
  const [detail, setDetail] = useState<KpiKind | null>(null);
  const [full, setFull] = useState<string | null>(null);
  const [tip, setTip] = useState<HoverPayload | null>(null);
  const [sessionFilter, setSessionFilter] = useState<string | null>(null);
  const [pageFilter, setPageFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await fn({ data: { days: range } });
      setData(d); setErr(null); setLastAt(new Date());
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg);
    } finally { setLoading(false); }
  }, [fn, range]);

  useEffect(() => { setLoading(true); load(); }, [load]);
  useEffect(() => {
    if (!live) return;
    const iv = setInterval(load, 15000);
    return () => clearInterval(iv);
  }, [live, load]);

  // Realtime pulse on new activity_log row
  useEffect(() => {
    const ch = supabase
      .channel("analytics-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_log" }, () => {
        setPulseTick((p) => p + 1);
        if (live) load();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [live, load]);

  const a: AdminAnalyticsV2 | null = data?.analytics ?? null;

  const filteredActivity = useMemo(() => {
    if (!data) return [];
    return data.rawActivity.filter((r) => {
      if (sessionFilter && r.session_id !== sessionFilter) return false;
      if (pageFilter && r.path !== pageFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!(r.path.toLowerCase().includes(s) || r.device.toLowerCase().includes(s) || r.browser.toLowerCase().includes(s) || (r.session_id ?? "").toLowerCase().includes(s))) return false;
      }
      return true;
    });
  }, [data, sessionFilter, pageFilter, search]);

  const dailySeries = a?.daily ?? [];
  const dailyViews = dailySeries.map((d) => d.views);

  // Session index: sessionId -> full journey
  const sessionMap = useMemo(() => {
    type RawRow = NonNullable<Data>["rawActivity"][number];
    const m = new Map<string, RawRow[]>();
    if (!data) return m;
    for (const r of data.rawActivity) {
      if (!r.session_id) continue;
      const arr = m.get(r.session_id) ?? [];
      arr.push(r); m.set(r.session_id, arr);
    }
    for (const [, arr] of m) arr.sort((x, y) => x.created_at.localeCompare(y.created_at));
    return m;
  }, [data]);

  const sessions = useMemo(() => {
    const rows: { id: string; start: string; end: string; pages: number; device: string; browser: string; os: string; tz: string; user_id: string | null; duration: number }[] = [];
    for (const [id, arr] of sessionMap) {
      if (!arr.length) continue;
      const start = arr[0].created_at;
      const end = arr[arr.length - 1].created_at;
      rows.push({
        id, start, end,
        pages: arr.filter((r) => r.action === "page.view").length,
        device: arr[0].device, browser: arr[0].browser, os: arr[0].os, tz: arr[0].tz,
        user_id: arr[0].user_id,
        duration: Math.max(0, (new Date(end).getTime() - new Date(start).getTime()) / 1000),
      });
    }
    return rows.sort((a, b) => b.end.localeCompare(a.end));
  }, [sessionMap]);

  // Unique visitors — deduped by persistent visitor_id (localStorage), with
  // a device-fingerprint fallback for legacy rows that predate visitor_id.
  // Same person on same browser is ONE visitor no matter how many tabs/sessions.
  const visitors = useMemo(() => {
    if (!data) return [] as {
      key: string; first: string; last: string; hits: number; pages: number;
      device: string; browser: string; os: string; tz: string; lang: string;
      last_path: string; ref_host: string; user_id: string | null;
      paths: Set<string>;
    }[];
    type RawRow = NonNullable<Data>["rawActivity"][number];
    const fp = (r: RawRow) =>
      (r.visitor_id && r.visitor_id.length > 3)
        ? `v:${r.visitor_id}`
        : `fp:${r.device}|${r.browser}|${r.os}|${(r as unknown as { screen?: string }).screen ?? ""}|${r.tz}|${r.lang}`;
    const m = new Map<string, RawRow[]>();
    for (const r of data.rawActivity) {
      if (r.action !== "page.view") continue;
      const k = fp(r);
      const arr = m.get(k) ?? [];
      arr.push(r);
      m.set(k, arr);
    }
    const out: {
      key: string; first: string; last: string; hits: number; pages: number;
      device: string; browser: string; os: string; tz: string; lang: string;
      last_path: string; ref_host: string; user_id: string | null;
      paths: Set<string>;
    }[] = [];
    for (const [key, arr] of m) {
      arr.sort((x, y) => x.created_at.localeCompare(y.created_at));
      const last = arr[arr.length - 1];
      const paths = new Set(arr.map((r) => r.path));
      const uid = arr.map((r) => r.user_id).find(Boolean) ?? null;
      out.push({
        key, first: arr[0].created_at, last: last.created_at,
        hits: arr.length, pages: paths.size,
        device: last.device, browser: last.browser, os: last.os,
        tz: last.tz, lang: last.lang, last_path: last.path,
        ref_host: last.ref_host, user_id: uid, paths,
      });
    }
    return out.sort((a, b) => b.last.localeCompare(a.last));
  }, [data]);



  // Heatmap (day-of-week × hour) from rawActivity
  const heat = useMemo(() => {
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    if (!data) return grid;
    for (const r of data.rawActivity) {
      if (r.action !== "page.view") continue;
      const d = new Date(r.created_at);
      grid[d.getDay()][d.getHours()] += 1;
    }
    return grid;
  }, [data]);
  const heatMax = Math.max(1, ...heat.flat());

  // Timezones
  const timezones = useMemo(() => {
    const map = new Map<string, number>();
    if (!data) return [];
    for (const r of data.rawActivity) if (r.action === "page.view") map.set(r.tz || "unknown", (map.get(r.tz || "unknown") ?? 0) + 1);
    return [...map.entries()].map(([tz, n]) => ({ tz, n })).sort((a, b) => b.n - a.n).slice(0, 10);
  }, [data]);

  // Viewport buckets
  const viewports = useMemo(() => {
    const map = new Map<string, number>();
    if (!data) return [];
    for (const r of data.rawActivity) if (r.action === "page.view") map.set(bucketVp(r.vp), (map.get(bucketVp(r.vp)) ?? 0) + 1);
    return [...map.entries()].map(([b, n]) => ({ b, n })).sort((a, b) => b.n - a.n);
  }, [data]);

  // New vs returning (sessions with >1 page = returning-intent proxy)
  const engagement = useMemo(() => {
    let bounce = 0, deep = 0, returning = 0;
    for (const s of sessions) {
      if (s.pages <= 1) bounce++; else deep++;
      if (s.pages >= 3) returning++;
    }
    return { bounce, deep, returning, total: sessions.length };
  }, [sessions]);

  // Top pages
  const topPages = a?.top_pages ?? [];

  // Path transitions (from → to)
  const flows = useMemo(() => {
    const map = new Map<string, number>();
    for (const arr of sessionMap.values()) {
      const pages = arr.filter((r) => r.action === "page.view");
      for (let i = 1; i < pages.length; i++) {
        const key = `${pages[i - 1].path} → ${pages[i].path}`;
        map.set(key, (map.get(key) ?? 0) + 1);
      }
    }
    return [...map.entries()].map(([k, n]) => ({ k, n })).sort((a, b) => b.n - a.n).slice(0, 12);
  }, [sessionMap]);

  // Per-day breakdown cache for chart hover
  const dayBreakdown = useMemo(() => {
    const map = new Map<string, { pages: { label: string; value: number }[]; devices: { label: string; value: number }[] }>();
    if (!data) return map;
    const byDay = new Map<string, typeof data.rawActivity>();
    for (const r of data.rawActivity) {
      const d = r.created_at.slice(0, 10);
      const arr = byDay.get(d) ?? []; arr.push(r); byDay.set(d, arr);
    }
    for (const [d, rows] of byDay) {
      const pm = new Map<string, number>(), dm = new Map<string, number>();
      for (const r of rows) if (r.action === "page.view") {
        pm.set(r.path, (pm.get(r.path) ?? 0) + 1);
        dm.set(r.device, (dm.get(r.device) ?? 0) + 1);
      }
      map.set(d, {
        pages: [...pm.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
        devices: [...dm.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
      });
    }
    return map;
  }, [data]);

  const exportAll = () => {
    if (!data) return;
    toCsv(`analytics_${range}d_${new Date().toISOString().slice(0,10)}.csv`,
      data.rawActivity.map((r) => ({
        laikas: r.created_at, veiksmas: r.action, kelias: r.path, irenginys: r.device,
        narsykle: r.browser, os: r.os, kalba: r.lang, laiko_juosta: r.tz, sesija: r.session_id, vartotojas: r.user_id ?? "",
      })));
  };

  const resetAnalytics = async () => {
    const ok = window.confirm(
      "Ar tikrai nori IŠTRINTI VISUS analitikos duomenis (activity_log)?\n\n" +
      "Šis veiksmas negrįžtamas. Visos peržiūros, prisijungimai ir sesijų istorija bus panaikinti."
    );
    if (!ok) return;
    const confirmTxt = window.prompt('Įrašyk "RESET" kad patvirtintum:');
    if (confirmTxt !== "RESET") return;
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: n, error } = await supabase.rpc("analytics_reset");
      if (error) throw error;
      alert(`Ištrinta ${n ?? 0} įrašų. Analitika iš naujo.`);
      load();
    } catch (e: any) {
      alert("Nepavyko: " + (e?.message ?? String(e)));
    }
  };

  return (
    <div className="relative min-h-screen">
      <FloatingTooltip p={tip} />

      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-violet-500/10 blur-[120px]" />
        <div className="absolute right-0 top-1/3 h-[400px] w-[400px] rounded-full bg-cyan-500/10 blur-[120px]" />
      </div>

      {/* HEADER */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <motion.h1 initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 text-3xl font-black tracking-tight text-white">
              <span className="relative">
                <span className="absolute inset-0 -z-10 bg-gradient-to-r from-violet-500 via-cyan-500 to-emerald-500 opacity-30 blur-2xl" />
                Analytics
              </span>
              <span className="rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">v3</span>
            </motion.h1>
            <p className="mt-1 text-sm text-white/50">Realaus laiko, 100% iš jūsų Supabase — jokių išgalvotų duomenų.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Live pulse */}
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5">
              <motion.span key={pulseTick} initial={{ scale: 0.5 }} animate={{ scale: [0.6, 1.3, 1] }} className="relative flex h-2 w-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/60" />
                <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
              </motion.span>
              <span className="text-xs font-semibold text-white/70">
                {a?.active_now ?? 0} aktyvūs • {lastAt ? timeAgo(lastAt.toISOString()) + " atgal" : "…"}
              </span>
            </div>

            {/* Range */}
            <div className="flex overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
              {[7, 14, 30, 60].map((r) => (
                <button key={r} onClick={() => setRange(r as Range)}
                  className={`px-3 py-1.5 text-xs font-semibold transition ${range === r ? "bg-gradient-to-r from-violet-500 to-cyan-500 text-white" : "text-white/60 hover:text-white"}`}>
                  {r}d
                </button>
              ))}
            </div>

            <button onClick={() => setLive((v) => !v)}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${live ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" : "border-white/10 bg-white/[0.03] text-white/60"}`}>
              <Radio className={`h-3.5 w-3.5 ${live ? "animate-pulse" : ""}`} /> {live ? "Live" : "Pauzė"}
            </button>
            <button onClick={load} className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-white/70 hover:text-white">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Atnaujinti
            </button>
            <button onClick={exportAll} className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-gradient-to-r from-violet-500/20 to-cyan-500/20 px-3 py-1.5 text-xs font-semibold text-white hover:from-violet-500/30 hover:to-cyan-500/30">
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
            <button onClick={resetAnalytics} title="Ištrinti visą activity_log istoriją" className="flex items-center gap-1.5 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/20">
              <Trash2 className="h-3.5 w-3.5" /> Reset
            </button>
          </div>
        </div>
      </div>

      {err && (
        <div className="mb-6 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
          Klaida kraunant analitiką: {err}
        </div>
      )}

      {loading && !a ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl border border-white/10 bg-white/[0.02]" />)}
        </div>
      ) : a ? (
        <div className="space-y-6">
          {/* KPI GRID */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard kind="views" icon={<Eye className="h-4 w-4" />} label="Peržiūros" value={a.totals.views} prev={a.prev_totals.views} spark={dailyViews} color={C.cyan} onOpen={() => setDetail("views")} />
            <KpiCard kind="uniques" icon={<Fingerprint className="h-4 w-4" />} label="Unikalūs įrenginiai" value={a.totals.uniques} prev={a.prev_totals.uniques} spark={a.daily.map((d) => d.uniques)} color={C.violet} onOpen={() => setDetail("uniques")} />
            <KpiCard kind="signIns" icon={<LogIn className="h-4 w-4" />} label="Prisijungimai" value={a.totals.signins} prev={a.prev_totals.signins} spark={a.daily.map((d) => d.signins)} color={C.emerald} onOpen={() => setDetail("signIns")} />
            <KpiCard kind="signOuts" icon={<LogOut className="h-4 w-4" />} label="Atsijungimai" value={a.totals.signouts} prev={a.prev_totals.signouts} spark={a.daily.map((d) => d.signouts)} color={C.rose} onOpen={() => setDetail("signOuts")} />
          </div>

          {/* SECONDARY STATS */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
            <StatChip icon={<Fingerprint className="h-3.5 w-3.5" />} label="Sesijos" value={sessions.length} />
            <StatChip icon={<Users className="h-3.5 w-3.5" />} label="Prisijungę" value={a.totals.signed_in_users} />
            <StatChip icon={<Zap className="h-3.5 w-3.5" />} label="Gilios sesijos" value={engagement.deep} tint="cyan" />
            <StatChip icon={<Timer className="h-3.5 w-3.5" />} label="Atmetimo" value={engagement.total ? Math.round((engagement.bounce / engagement.total) * 100) : 0} suffix="%" tint="rose" />
            <StatChip icon={<Layers className="h-3.5 w-3.5" />} label="Grįžę (3+ psl.)" value={engagement.returning} tint="violet" />
            <StatChip icon={<Sparkles className="h-3.5 w-3.5" />} label="Admin (paslėpta)" value={a.admin_hidden_events} tint="amber" />
          </div>

          {/* UNIQUE VISITORS — "kas paspaudė ant svetainės", dedup by device */}
          <ChartCard
            id="visitors"
            title={`Lankytojai (${visitors.length} unikalūs)`}
            subtitle="Kas paspaudė ant svetainės — kiekvienas įrenginys / naršyklė skaičiuojamas vieną kartą"
            full={full}
            setFull={setFull}
          >
            <div className="flex items-center gap-2 pb-3 text-[11px] text-white/50">
              <Fingerprint className="h-3.5 w-3.5 text-violet-300" />
              Dedublikuota pagal <code className="rounded bg-white/10 px-1 py-0.5 text-white/70">visitor_id</code> (localStorage) + įrenginio pirštų atspaudą senesniems įrašams.
            </div>
            {visitors.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center text-sm text-white/50">
                Kol kas dar niekas neaplankė svetainės šiame lange.
              </div>
            ) : (
              <div className="max-h-[520px] overflow-auto rounded-xl border border-white/10">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-950/95 text-[10px] uppercase tracking-wide text-white/40 backdrop-blur">
                    <tr>
                      <th className="px-3 py-2 font-semibold">#</th>
                      <th className="px-3 py-2 font-semibold">Paskutinis vizitas</th>
                      <th className="px-3 py-2 font-semibold">Pirmas kartas</th>
                      <th className="px-3 py-2 font-semibold">Paspaudimai</th>
                      <th className="px-3 py-2 font-semibold">Puslapiai</th>
                      <th className="px-3 py-2 font-semibold">Įrenginys</th>
                      <th className="px-3 py-2 font-semibold">Naršyklė</th>
                      <th className="px-3 py-2 font-semibold">OS</th>
                      <th className="px-3 py-2 font-semibold">Laiko juosta</th>
                      <th className="px-3 py-2 font-semibold">Kalba</th>
                      <th className="px-3 py-2 font-semibold">Paskutinis puslapis</th>
                      <th className="px-3 py-2 font-semibold">Iš kur</th>
                      <th className="px-3 py-2 font-semibold">Vartotojas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visitors.slice(0, 200).map((v, i) => (
                      <tr key={v.key} className="border-t border-white/5 transition hover:bg-white/[0.03]">
                        <td className="px-3 py-2 text-white/40">{i + 1}</td>
                        <td className="px-3 py-2 text-white/80">{timeAgo(v.last)} atgal</td>
                        <td className="px-3 py-2 text-white/50">{new Date(v.first).toLocaleString("lt-LT")}</td>
                        <td className="px-3 py-2 font-semibold text-cyan-300">{fmt(v.hits)}</td>
                        <td className="px-3 py-2 text-violet-300">{fmt(v.pages)}</td>
                        <td className="px-3 py-2 text-white/70">{v.device}</td>
                        <td className="px-3 py-2 text-white/70">{v.browser}</td>
                        <td className="px-3 py-2 text-white/70">{v.os}</td>
                        <td className="px-3 py-2 text-white/50">{v.tz || "—"}</td>
                        <td className="px-3 py-2 text-white/50">{v.lang || "—"}</td>
                        <td className="px-3 py-2">
                          <code className="rounded bg-white/5 px-1.5 py-0.5 text-white/70">{v.last_path}</code>
                        </td>
                        <td className="px-3 py-2 text-white/50">{v.ref_host || "(tiesiogiai)"}</td>
                        <td className="px-3 py-2 text-white/60">{v.user_id ? <span className="text-emerald-300">prisijungęs</span> : <span className="text-white/30">svečias</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {visitors.length > 200 && (
                  <div className="border-t border-white/5 bg-white/[0.02] px-3 py-2 text-center text-[11px] text-white/40">
                    Rodoma 200 iš {visitors.length}. Eksportuok CSV pilnam sąrašui.
                  </div>
                )}
              </div>
            )}
          </ChartCard>

          {/* TRAFFIC — with rich cursor-follow tooltip */}

          <ChartCard id="traffic" title="Srautas laike" subtitle={`${range} dienų • paspausk stulpelį fokusuoti`} full={full} setFull={setFull}>
            <div
              onPointerMove={(e) => {
                const el = e.currentTarget as HTMLElement;
                const r = el.getBoundingClientRect();
                const relX = (e.clientX - r.left) / r.width;
                const idx = Math.max(0, Math.min(a.daily.length - 1, Math.round(relX * (a.daily.length - 1))));
                const d = a.daily[idx]; if (!d) return;
                const bd = dayBreakdown.get(d.d);
                setTip({
                  x: e.clientX, y: e.clientY,
                  title: new Date(d.d).toLocaleDateString("lt-LT", { weekday: "long", day: "numeric", month: "long" }),
                  primary: [
                    { label: "Peržiūros", value: d.views, color: C.cyan },
                    { label: "Unikalūs", value: d.uniques, color: C.violet },
                    { label: "Prisijungimai", value: d.signins, color: C.emerald },
                  ],
                  spark: dailyViews,
                  sparkColor: C.cyan,
                  breakdown: bd?.pages,
                  meta: [
                    { label: "Įrenginiai", value: (bd?.devices ?? []).slice(0, 2).map((x) => x.label).join(", ") || "—" },
                    { label: "Sesijos", value: fmt(d.uniques) },
                  ],
                });
              }}
              onPointerLeave={() => setTip(null)}
              className="h-[340px] w-full"
            >
              <ResponsiveContainer>
                <AreaChart data={a.daily}>
                  <defs>
                    <linearGradient id="g-views" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.cyan} stopOpacity={0.5} />
                      <stop offset="100%" stopColor={C.cyan} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="g-uniques" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.violet} stopOpacity={0.5} />
                      <stop offset="100%" stopColor={C.violet} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="d" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} tickFormatter={(v) => v.slice(5)} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={() => null} cursor={{ stroke: "rgba(139,92,246,0.5)", strokeWidth: 2, strokeDasharray: "4 4" }} />
                  <Area type="monotone" dataKey="views" stroke={C.cyan} strokeWidth={2.5} fill="url(#g-views)" name="Peržiūros" />
                  <Area type="monotone" dataKey="uniques" stroke={C.violet} strokeWidth={2.5} fill="url(#g-uniques)" name="Unikalūs" />
                  <Line type="monotone" dataKey="signins" stroke={C.emerald} strokeWidth={2} dot={{ r: 3, fill: C.emerald }} name="Prisijungimai" />
                  <Brush dataKey="d" height={22} stroke="rgba(139,92,246,0.5)" fill="rgba(139,92,246,0.05)" travellerWidth={8} tickFormatter={(v) => String(v).slice(5)} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* HEATMAP + HOURLY */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ChartCard id="heat" title="Aktyvumo šilumos žemėlapis" subtitle="Savaitės diena × valanda • užvesk pele" full={full} setFull={setFull}>
              <div className="overflow-x-auto pb-2">
                <div className="flex gap-1 text-[10px] text-white/40">
                  <div className="w-8" />
                  {Array.from({ length: 24 }, (_, h) => (
                    <div key={h} className="w-6 text-center">{h}</div>
                  ))}
                </div>
                {heat.map((row, d) => (
                  <div key={d} className="mt-1 flex items-center gap-1">
                    <div className="w-8 text-[10px] font-semibold text-white/50">{WD[d]}</div>
                    {row.map((v, h) => {
                      const intensity = v / heatMax;
                      return (
                        <motion.div
                          key={h}
                          whileHover={{ scale: 1.4, zIndex: 10 }}
                          onPointerMove={(e) => setTip({
                            x: e.clientX, y: e.clientY,
                            title: `${WD[d]} • ${String(h).padStart(2, "0")}:00`,
                            primary: [{ label: "Peržiūros", value: v, color: C.cyan }],
                            meta: [
                              { label: "% max", value: `${Math.round(intensity * 100)}%` },
                              { label: "Vidurkis/val.", value: fmt(Math.round(row.reduce((a, b) => a + b, 0) / 24)) },
                            ],
                          })}
                          onPointerLeave={() => setTip(null)}
                          className="h-6 w-6 rounded-md transition"
                          style={{
                            background: v === 0 ? "rgba(255,255,255,0.03)" : `rgba(139,92,246,${0.15 + intensity * 0.85})`,
                            boxShadow: intensity > 0.6 ? `0 0 12px rgba(139,92,246,${intensity})` : "none",
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </ChartCard>

            <ChartCard id="hourly" title="Valandinis pulsas" subtitle="Kada vartotojai aktyviausi" full={full} setFull={setFull}>
              <div className="h-[280px]">
                <ResponsiveContainer>
                  <BarChart data={a.hourly}>
                    <defs>
                      <linearGradient id="g-hour" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={C.cyan} />
                        <stop offset="100%" stopColor={C.violet} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="h" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={({ active, payload, label }: any) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="rounded-xl border border-white/15 bg-slate-950/95 p-3 shadow-2xl backdrop-blur">
                          <div className="text-xs font-bold text-white">{String(label).padStart(2, "0")}:00 – {String(label).padStart(2, "0")}:59</div>
                          {payload.map((p: any, i: number) => (
                            <div key={i} className="mt-1 flex items-center gap-2 text-xs">
                              <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                              <span className="text-white/60">{p.name}</span>
                              <span className="ml-auto font-bold text-white">{fmt(Number(p.value))}</span>
                            </div>
                          ))}
                        </div>
                      );
                    }} cursor={{ fill: "rgba(139,92,246,0.08)" }} />
                    <Bar dataKey="views" fill="url(#g-hour)" name="Peržiūros" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="signins" fill={C.emerald} name="Prisijungimai" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* DEVICES + BROWSERS + OS */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <BreakdownCard title="Įrenginiai" icon={<MonitorSmartphone className="h-4 w-4" />} rows={a.devices.map((d) => ({ label: d.device, n: d.n }))} onHover={(row, e) => setTip({
              x: e.clientX, y: e.clientY, title: `Įrenginys • ${row.label}`,
              primary: [{ label: "Sesijos", value: row.n, color: C.cyan }],
              meta: [{ label: "Dalis", value: `${Math.round((row.n / Math.max(1, a.totals.views)) * 100)}%` }],
            })} onLeave={() => setTip(null)} />
            <BreakdownCard title="Naršyklės" icon={<Chrome className="h-4 w-4" />} rows={a.browsers.map((d) => ({ label: d.browser, n: d.n }))} onHover={(row, e) => setTip({
              x: e.clientX, y: e.clientY, title: `Naršyklė • ${row.label}`,
              primary: [{ label: "Peržiūros", value: row.n, color: C.violet }],
            })} onLeave={() => setTip(null)} color={C.violet} />
            <BreakdownCard title="Operacinės sistemos" icon={<Layers className="h-4 w-4" />} rows={a.os.map((d) => ({ label: d.os, n: d.n }))} onHover={(row, e) => setTip({
              x: e.clientX, y: e.clientY, title: `OS • ${row.label}`,
              primary: [{ label: "Peržiūros", value: row.n, color: C.emerald }],
            })} onLeave={() => setTip(null)} color={C.emerald} />
          </div>

          {/* GEO + VIEWPORTS + LANG */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <ChartCard id="tz" title="Laiko juostos" subtitle="Iš kur lankomasi (geo proxy)" full={full} setFull={setFull} icon={<Globe2 className="h-4 w-4" />}>
              <div className="space-y-2">
                {timezones.length === 0 && <div className="py-8 text-center text-xs text-white/40">Duomenų dar nėra</div>}
                {timezones.map((t) => {
                  const pctv = Math.round((t.n / Math.max(1, timezones[0].n)) * 100);
                  return (
                    <motion.div key={t.tz}
                      onPointerMove={(e) => setTip({ x: e.clientX, y: e.clientY, title: t.tz, primary: [{ label: "Peržiūros", value: t.n, color: C.cyan }] })}
                      onPointerLeave={() => setTip(null)}
                      whileHover={{ x: 4 }} className="group">
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 font-medium text-white/70"><MapPin className="h-3 w-3" />{t.tz}</span>
                        <span className="font-bold text-white">{fmt(t.n)}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pctv}%` }} className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${C.cyan}, ${C.violet})`, boxShadow: `0 0 10px ${C.cyan}` }} />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </ChartCard>

            <ChartCard id="vp" title="Ekrano dydžiai" subtitle="Viewport pasiskirstymas" full={full} setFull={setFull}>
              <div className="h-[240px]">
                <ResponsiveContainer>
                  <RadarChart data={viewports}>
                    <PolarGrid stroke="rgba(255,255,255,0.1)" />
                    <PolarAngleAxis dataKey="b" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }} />
                    <PolarRadiusAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }} />
                    <Radar dataKey="n" stroke={C.pink} fill={C.pink} fillOpacity={0.35} />
                    <Tooltip content={({ active, payload }: any) => active && payload?.length ? (
                      <div className="rounded-lg border border-white/15 bg-slate-950/95 px-3 py-2 text-xs shadow-2xl">
                        <div className="font-bold text-white">{payload[0].payload.b}</div>
                        <div className="text-white/60">Sesijų: <b className="text-white">{fmt(payload[0].value)}</b></div>
                      </div>
                    ) : null} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard id="lang" title="Kalbos" subtitle="Browser locale" full={full} setFull={setFull} icon={<Languages className="h-4 w-4" />}>
              <div className="h-[240px]">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={a.languages} dataKey="n" nameKey="lang" innerRadius={45} outerRadius={90} paddingAngle={4}>
                      {a.languages.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
                    </Pie>
                    <Tooltip content={({ active, payload }: any) => active && payload?.length ? (
                      <div className="rounded-lg border border-white/15 bg-slate-950/95 px-3 py-2 text-xs shadow-2xl">
                        <div className="font-bold text-white">{payload[0].payload.lang}</div>
                        <div className="text-white/60">n: <b className="text-white">{fmt(payload[0].value)}</b></div>
                      </div>
                    ) : null} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* TOP PAGES + PATH FLOWS */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ChartCard id="pages" title="Populiariausi puslapiai" subtitle="Su unikaliais lankytojais" full={full} setFull={setFull}>
              <div className="space-y-1.5">
                {topPages.length === 0 && <div className="py-8 text-center text-xs text-white/40">Dar nėra duomenų</div>}
                {topPages.map((p, i) => (
                  <motion.button
                    key={p.path}
                    onClick={() => setPageFilter(pageFilter === p.path ? null : p.path)}
                    onPointerMove={(e) => setTip({ x: e.clientX, y: e.clientY, title: p.path, primary: [{ label: "Peržiūros", value: p.n, color: C.cyan }, { label: "Unikalūs", value: p.u, color: C.violet }] })}
                    onPointerLeave={() => setTip(null)}
                    whileHover={{ x: 6 }}
                    className={`group flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition ${pageFilter === p.path ? "border-cyan-400/40 bg-cyan-400/5" : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04]"}`}
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-[10px] font-bold text-white">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate font-mono text-xs text-white/80">{p.path}</span>
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/5">
                      <div className="h-full rounded-full" style={{ width: `${(p.n / topPages[0].n) * 100}%`, background: `linear-gradient(90deg, ${C.cyan}, ${C.violet})` }} />
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-white">{fmt(p.n)}</div>
                      <div className="text-[10px] text-white/40">{fmt(p.u)} u</div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </ChartCard>

            <ChartCard id="flows" title="Vartotojų kelias" subtitle="Iš kur → kur (sesijų navigacija)" full={full} setFull={setFull}>
              <div className="space-y-1.5">
                {flows.length === 0 && <div className="py-8 text-center text-xs text-white/40">Reikia bent 2-jų peržiūrų vienoje sesijoje</div>}
                {flows.map((f, i) => {
                  const [from, to] = f.k.split(" → ");
                  return (
                    <motion.div key={f.k} whileHover={{ x: 4 }}
                      onPointerMove={(e) => setTip({ x: e.clientX, y: e.clientY, title: "Perėjimas", primary: [{ label: "Perėjimų", value: f.n, color: C.emerald }], meta: [{ label: "Iš", value: from }, { label: "Į", value: to }] })}
                      onPointerLeave={() => setTip(null)}
                      className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] p-2 text-xs">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-300">{i + 1}</span>
                      <span className="max-w-[35%] truncate font-mono text-white/70">{from}</span>
                      <ChevronRight className="h-3 w-3 shrink-0 text-white/30" />
                      <span className="max-w-[35%] truncate font-mono text-white/90">{to}</span>
                      <span className="ml-auto rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">{f.n}×</span>
                    </motion.div>
                  );
                })}
              </div>
            </ChartCard>
          </div>

          {/* SESSION EXPLORER */}
          <ChartCard id="sessions" title="Sesijų naršyklė" subtitle="Paspausk sesiją — pamatyk pilną kelionę" full={full} setFull={setFull} icon={<Fingerprint className="h-4 w-4" />}>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filtruoti pagal kelią, įrenginį, sesiją…"
                  className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-2 pl-9 pr-3 text-xs text-white outline-none placeholder:text-white/30 focus:border-violet-400/40" />
              </div>
              {sessionFilter && (
                <button onClick={() => setSessionFilter(null)} className="rounded-lg border border-violet-400/40 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-200">
                  Sesija: {sessionFilter.slice(0, 12)}… ✕
                </button>
              )}
              {pageFilter && (
                <button onClick={() => setPageFilter(null)} className="rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-200">
                  Puslapis: {pageFilter} ✕
                </button>
              )}
            </div>

            {sessionFilter ? (
              <div className="max-h-[360px] overflow-y-auto rounded-lg border border-white/5">
                {(sessionMap.get(sessionFilter) ?? []).map((r, i) => (
                  <motion.div key={r.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                    className="flex items-center gap-3 border-b border-white/5 px-3 py-2 text-xs last:border-0">
                    <span className="text-white/40">{new Date(r.created_at).toLocaleTimeString("lt-LT")}</span>
                    <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] uppercase text-white/60">{r.action.replace("page.view", "peržiūra").replace("auth.signed_in", "prisijungimas").replace("auth.signed_out", "atsijungimas")}</span>
                    <span className="min-w-0 flex-1 truncate font-mono text-white/80">{r.path}</span>
                    <span className="text-[10px] text-white/40">{r.browser} • {r.os}</span>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="max-h-[360px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-950/80 backdrop-blur">
                    <tr className="text-left text-white/40">
                      <th className="px-2 py-2 font-medium">Sesija</th>
                      <th className="px-2 py-2 font-medium">Pradžia</th>
                      <th className="px-2 py-2 font-medium">Trukmė</th>
                      <th className="px-2 py-2 font-medium">Puslapiai</th>
                      <th className="px-2 py-2 font-medium">Įrenginys</th>
                      <th className="px-2 py-2 font-medium">TZ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.slice(0, 60).map((s) => (
                      <motion.tr key={s.id} onClick={() => setSessionFilter(s.id)}
                        whileHover={{ backgroundColor: "rgba(139,92,246,0.06)" }}
                        onPointerMove={(e) => setTip({ x: e.clientX, y: e.clientY, title: `Sesija ${s.id.slice(0, 10)}…`, primary: [{ label: "Puslapiai", value: s.pages, color: C.cyan }, { label: "Trukmė (s)", value: Math.round(s.duration), color: C.violet }], meta: [{ label: "OS", value: s.os }, { label: "Naršyklė", value: s.browser }] })}
                        onPointerLeave={() => setTip(null)}
                        className="cursor-pointer border-t border-white/5">
                        <td className="px-2 py-2 font-mono text-white/70">{s.id.slice(-10)}</td>
                        <td className="px-2 py-2 text-white/60">{timeAgo(s.start)}</td>
                        <td className="px-2 py-2 text-white/60">{s.duration < 60 ? `${Math.round(s.duration)}s` : `${Math.round(s.duration / 60)}min`}</td>
                        <td className="px-2 py-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${s.pages >= 3 ? "bg-emerald-500/20 text-emerald-300" : s.pages > 1 ? "bg-cyan-500/20 text-cyan-300" : "bg-white/5 text-white/50"}`}>{s.pages}</span></td>
                        <td className="px-2 py-2 text-white/60">{s.device} / {s.browser}</td>
                        <td className="px-2 py-2 text-white/40">{s.tz}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ChartCard>

          {/* LIVE FEED */}
          <ChartCard id="feed" title="Realaus laiko srautas" subtitle={`${filteredActivity.length} įvykiai${sessionFilter || pageFilter || search ? " (filtruojama)" : ""}`} full={full} setFull={setFull} icon={<Activity className="h-4 w-4" />}>
            <div className="max-h-[400px] space-y-1 overflow-y-auto pr-1">
              <AnimatePresence initial={false}>
                {filteredActivity.slice(0, 100).map((r) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-xs hover:bg-white/[0.05]"
                  >
                    <span className="w-14 text-white/40">{timeAgo(r.created_at)}</span>
                    <span className={`h-1.5 w-1.5 rounded-full ${r.action === "auth.signed_in" ? "bg-emerald-400" : r.action === "auth.signed_out" ? "bg-rose-400" : "bg-cyan-400"}`} style={{ boxShadow: `0 0 8px currentColor` }} />
                    <span className="min-w-0 flex-1 truncate font-mono text-white/80">{r.path}</span>
                    <button onClick={() => setSessionFilter(r.session_id || null)} className="hidden text-[10px] text-white/40 hover:text-white sm:inline">{(r.session_id || "").slice(-6)}</button>
                    <span className="hidden text-[10px] text-white/40 md:inline">{r.browser} · {r.os}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
              {filteredActivity.length === 0 && <div className="py-10 text-center text-xs text-white/40">Nėra atitikimų</div>}
            </div>
          </ChartCard>
        </div>
      ) : null}

      <KpiDetailModal
        kind={detail}
        onClose={() => setDetail(null)}
        activity={(data?.rawActivity ?? []).map((r) => ({ id: r.id, created_at: r.created_at, action: r.action, user_id: r.user_id, meta: r }))}
        rangeSince={new Date(Date.now() - range * 24 * 3600 * 1000).toISOString().slice(0, 10)}
        rangeDays={range}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function KpiCard({ kind, icon, label, value, prev, spark, color, onOpen }: {
  kind: KpiKind; icon: React.ReactNode; label: string; value: number; prev: number; spark: number[]; color: string; onOpen: () => void;
}) {
  const change = pct(value, prev);
  const up = change >= 0;
  return (
    <Tilt className="rounded-2xl">
      <motion.button
        onClick={onOpen}
        whileHover={{ y: -2 }}
        className="group relative w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.01] p-5 text-left shadow-xl"
      >
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-30 blur-2xl transition group-hover:opacity-60" style={{ background: color }} />
        <div className="relative flex items-start justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/50">
            <span className="rounded-lg p-1.5" style={{ background: `${color}22`, color }}>{icon}</span>
            {label}
          </div>
          <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${up ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"}`}>
            {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {Math.abs(change)}%
          </div>
        </div>
        <div className="relative mt-4 text-4xl font-black tabular-nums text-white">
          <CountUp value={value} />
        </div>
        <div className="relative mt-3 -mx-1">
          <Sparkline data={spark} color={color} />
        </div>
        <div className="relative mt-2 flex items-center justify-between text-[10px] text-white/40">
          <span>vs praėję: {fmt(prev)}</span>
          <span className="flex items-center gap-1 text-violet-300 opacity-0 transition group-hover:opacity-100"><Sparkles className="h-3 w-3" /> Detaliau</span>
        </div>
      </motion.button>
    </Tilt>
  );
}

function StatChip({ icon, label, value, tint = "cyan", suffix }: { icon: React.ReactNode; label: string; value: number; tint?: "cyan" | "violet" | "emerald" | "rose" | "amber"; suffix?: string }) {
  const map: Record<string, string> = { cyan: C.cyan, violet: C.violet, emerald: C.emerald, rose: C.rose, amber: C.amber };
  return (
    <motion.div whileHover={{ y: -2 }} className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/40">
        <span style={{ color: map[tint] }}>{icon}</span> {label}
      </div>
      <div className="mt-1 text-xl font-bold text-white">
        <CountUp value={value} />{suffix ?? ""}
      </div>
    </motion.div>
  );
}

function ChartCard({ id, title, subtitle, icon, children, full, setFull }: {
  id: string; title: string; subtitle?: string; icon?: React.ReactNode;
  children: React.ReactNode; full: string | null; setFull: (v: string | null) => void;
}) {
  const isFull = full === id;
  return (
    <motion.div
      layout
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-5 shadow-xl ${isFull ? "fixed inset-4 z-50 !m-0" : ""}`}
    >
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            {icon && <span className="text-violet-300">{icon}</span>}
            {title}
          </div>
          {subtitle && <div className="mt-0.5 text-xs text-white/40">{subtitle}</div>}
        </div>
        <button onClick={() => setFull(isFull ? null : id)} className="rounded-lg p-1.5 text-white/40 transition hover:bg-white/5 hover:text-white">
          {isFull ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>
      <div className={isFull ? "h-[calc(100%-3rem)] overflow-auto" : ""}>{children}</div>
    </motion.div>
  );
}

function BreakdownCard({ title, icon, rows, onHover, onLeave, color = C.cyan }: {
  title: string; icon: React.ReactNode;
  rows: { label: string; n: number }[];
  onHover: (row: { label: string; n: number }, e: React.PointerEvent) => void;
  onLeave: () => void;
  color?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-5 shadow-xl">
      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white"><span className="text-violet-300">{icon}</span>{title}</div>
      <div className="space-y-2">
        {rows.length === 0 && <div className="py-6 text-center text-xs text-white/40">Nėra duomenų</div>}
        {rows.slice(0, 8).map((r) => (
          <motion.div key={r.label} whileHover={{ x: 4 }}
            onPointerMove={(e) => onHover(r, e)} onPointerLeave={onLeave}
            className="cursor-pointer">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="truncate font-medium text-white/70">{r.label || "unknown"}</span>
              <span className="font-bold tabular-nums text-white">{fmt(r.n)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/5">
              <motion.div initial={{ width: 0 }} animate={{ width: `${(r.n / max) * 100}%` }} transition={{ duration: 0.6, ease: "easeOut" }}
                className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${color}, ${C.violet})`, boxShadow: `0 0 12px ${color}` }} />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
