import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  RefreshCw,
  Trash2,
  ArrowLeft,
  ShieldAlert,
  ShieldCheck,
  Activity,
  Zap,
  Mail,
  Bug,
  Search,
  X,
  LayoutDashboard,
  Radio,
  BarChart3,
  ListOrdered,
  Settings2,
  Menu,
  Copy,
  Check,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { AdminAurora, SaaSPanel, Sparkline } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { clearAllErrors, deleteErrorRow } from "@/lib/admin-errors.functions";

export const Route = createFileRoute("/admin/errors")({
  head: () => ({ meta: [{ title: "Klaidų centras — Sistemos administracija" }] }),
  component: AdminErrorsPage,
});

type ErrAction = "client.error" | "supabase.error" | "app.critical" | "app.warning" | "app.email_sent";
type ErrRow = {
  id: string;
  created_at: string;
  action: ErrAction | string;
  user_id: string | null;
  entity_type: string | null;
  meta: {
    message?: string;
    stack?: string;
    source?: string;
    path?: string;
    browser?: string;
    os?: string;
    device?: string;
    recipients?: number;
    lockdown?: boolean;
    [k: string]: unknown;
  } | null;
};

type SiteSettings = {
  lockdown_enabled: boolean;
  lockdown_code: string | null;
  lockdown_message: string | null;
  updated_at: string | null;
};

const KIND_LABEL: Record<string, string> = {
  "client.error": "Klientas",
  "supabase.error": "Supabase",
  "app.critical": "Kritinė",
  "app.warning": "Įspėjimas",
  "app.email_sent": "Email",
};

const KIND_STYLE: Record<string, string> = {
  "client.error": "bg-rose-500/15 text-rose-300 border-rose-500/30",
  "supabase.error": "bg-amber-500/15 text-amber-300 border-amber-500/30",
  "app.critical": "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
  "app.warning": "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  "app.email_sent": "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
};

const CRITICAL_KINDS = new Set(["client.error", "app.critical"]);

type Section = "overview" | "live" | "analytics" | "top" | "lockdown" | "settings";

const SECTIONS: { id: Section; label: string; icon: typeof Bug; hint: string }[] = [
  { id: "overview", label: "Apžvalga", icon: LayoutDashboard, hint: "KPI + srautas" },
  { id: "live", label: "Live srautas", icon: Radio, hint: "Realaus laiko sąrašas" },
  { id: "analytics", label: "Analitika", icon: BarChart3, hint: "24h trendai" },
  { id: "top", label: "Dažniausios", icon: ListOrdered, hint: "Grupuota pagal žinutę" },
  { id: "lockdown", label: "Auto-lockdown", icon: ShieldAlert, hint: "Slenkstis ir valdymas" },
  { id: "settings", label: "Nustatymai", icon: Settings2, hint: "Išvalyti / eksportuoti" },
];

function AdminErrorsPage() {
  const [rows, setRows] = useState<ErrRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [kind, setKind] = useState<"all" | ErrAction>("all");
  const [regexMode, setRegexMode] = useState(false);
  const [timeWindow, setTimeWindow] = useState<"5m" | "1h" | "24h" | "all">("all");
  const [selected, setSelected] = useState<ErrRow | null>(null);
  const [site, setSite] = useState<SiteSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState(true);
  const [section, setSection] = useState<Section>("overview");
  const [mobileNav, setMobileNav] = useState(false);
  const [copied, setCopied] = useState(false);
  const clearFn = useServerFn(clearAllErrors);
  const deleteFn = useServerFn(deleteErrorRow);

  const load = async () => {
    setLoading(true);
    const [{ data, error }, ss] = await Promise.all([
      supabase
        .from("activity_log")
        .select("id,created_at,action,user_id,entity_type,meta")
        .in("action", ["client.error", "supabase.error", "app.critical", "app.warning", "app.email_sent"])
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("site_settings")
        .select("lockdown_enabled,lockdown_code,lockdown_message,updated_at")
        .eq("id", true)
        .maybeSingle(),
    ]);
    if (error) toast.error("Nepavyko įkelti: " + error.message);
    setRows((data as ErrRow[]) ?? []);
    setSite((ss.data as SiteSettings) ?? null);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    const channel = supabase
      .channel("admin-errors-v3")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_log" },
        (payload) => {
          if (!live) return;
          const row = payload.new as ErrRow;
          if (
            row.action === "client.error" ||
            row.action === "supabase.error" ||
            row.action === "app.critical" ||
            row.action === "app.warning" ||
            row.action === "app.email_sent"
          ) {
            setRows((r) => [row, ...r].slice(0, 500));
            if (row.action === "app.critical" || row.action === "client.error") {
              const msg = row.meta?.message ?? "Nauja klaida";
              toast.error(`🚨 ${msg.slice(0, 90)}`, { duration: 4500 });
            }
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "site_settings" },
        (payload) => setSite(payload.new as SiteSettings),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [live]);

  const filtered = useMemo(() => {
    const f = filter.trim();
    const windowMs =
      timeWindow === "5m" ? 5 * 60_000 :
      timeWindow === "1h" ? 60 * 60_000 :
      timeWindow === "24h" ? 24 * 60 * 60_000 : Infinity;
    const cutoff = Date.now() - windowMs;
    let rx: RegExp | null = null;
    if (f && regexMode) {
      try { rx = new RegExp(f, "i"); } catch { rx = null; }
    }
    const fl = f.toLowerCase();
    return rows.filter((r) => {
      if (kind !== "all" && r.action !== kind) return false;
      if (windowMs !== Infinity && new Date(r.created_at).getTime() < cutoff) return false;
      if (!f) return true;
      const haystack = [r.meta?.message, r.meta?.source, r.meta?.path, r.meta?.browser, r.meta?.os, r.meta?.device, r.meta?.stack]
        .filter(Boolean).join(" \n ");
      if (rx) return rx.test(haystack);
      return haystack.toLowerCase().includes(fl);
    });
  }, [rows, filter, kind, regexMode, timeWindow]);

  const now = Date.now();
  const lastHour = rows.filter((r) => now - new Date(r.created_at).getTime() < 3_600_000);
  const last5m = rows.filter((r) => now - new Date(r.created_at).getTime() < 300_000);
  const criticalRecent = last5m.filter((r) => CRITICAL_KINDS.has(r.action));

  const spark = useMemo(() => {
    const buckets = new Array(48).fill(0);
    const cutoff = now - 24 * 3_600_000;
    for (const r of rows) {
      const t = new Date(r.created_at).getTime();
      if (t < cutoff) continue;
      const idx = Math.min(47, Math.floor((t - cutoff) / (30 * 60_000)));
      buckets[idx] += 1;
    }
    return buckets;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const topMessages = useMemo(() => {
    const map = new Map<string, { count: number; last: string; action: string }>();
    for (const r of rows.slice(0, 300)) {
      const key = (r.meta?.message ?? "(no message)").slice(0, 140);
      const prev = map.get(key);
      if (prev) {
        prev.count += 1;
        if (r.created_at > prev.last) prev.last = r.created_at;
      } else {
        map.set(key, { count: 1, last: r.created_at, action: r.action });
      }
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);
  }, [rows]);

  const clear = async () => {
    if (!confirm("Ištrinti visas klaidas iš žurnalo?")) return;
    setBusy(true);
    try {
      const res = await clearFn({});
      toast.success(`Ištrinta ${res.deleted} įrašų`);
      setRows([]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nepavyko ištrinti");
    } finally {
      setBusy(false);
    }
  };

  const deleteOne = async (id: string) => {
    try {
      await deleteFn({ data: { id } });
      setRows((r) => r.filter((x) => x.id !== id));
      if (selected?.id === id) setSelected(null);
      toast.success("Ištrinta");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nepavyko");
    }
  };

  const toggleLockdown = async (enable: boolean) => {
    setBusy(true);
    const { error } = await supabase.from("site_settings").upsert({
      id: true,
      lockdown_enabled: enable,
      lockdown_code: enable ? "E-MANUAL" : null,
      lockdown_message: enable
        ? "[rankinis] Super admin užrakino svetainę iš klaidų stebėsenos."
        : null,
      updated_at: new Date().toISOString(),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(enable ? "🔒 Lockdown ĮJUNGTAS" : "🔓 Lockdown išjungtas");
  };

  const lockdown = site?.lockdown_enabled === true;
  const criticalPressure = criticalRecent.length;

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `errors-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatRowsForCopy = (list: ErrRow[]) => {
    const header = `# Socialinės Valandos — klaidų eksportas\n# ${new Date().toLocaleString("lt-LT")} · ${list.length} įrašų\n\n`;
    return header + list.map((r) => {
      const m = r.meta ?? {};
      return [
        `── [${KIND_LABEL[r.action] ?? r.action}] ${new Date(r.created_at).toLocaleString("lt-LT")}`,
        `msg:    ${m.message ?? "(no message)"}`,
        m.path ? `path:   ${m.path}` : null,
        m.source ? `source: ${m.source}` : null,
        [m.browser, m.os, m.device].filter(Boolean).length ? `device: ${[m.browser, m.os, m.device].filter(Boolean).join(" · ")}` : null,
        m.stack ? `stack:\n${String(m.stack).split("\n").slice(0, 10).map((l) => "  " + l).join("\n")}` : null,
      ].filter(Boolean).join("\n");
    }).join("\n\n");
  };

  const copyAll = async (list: ErrRow[] = filtered) => {
    try {
      const text = formatRowsForCopy(list);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(`Nukopijuota ${list.length} įrašų — įklijuok į pokalbį`);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      toast.error("Naršyklė neleido kopijuoti");
    }
  };


  return (
    <>
      <AdminAurora />

      {/* Cinematic back button — spring-scaled, glowing */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 22 }}>
          <Link
            to="/admin"
            className="group inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-4 py-2 text-sm font-semibold backdrop-blur-xl transition hover:border-primary/50 hover:bg-primary/10"
          >
            <motion.span whileHover={{ x: -3 }} className="grid h-6 w-6 place-items-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow">
              <ArrowLeft className="h-3.5 w-3.5" />
            </motion.span>
            <span>Atgal į Super Admin</span>
          </Link>
        </motion.div>
        <button
          onClick={() => setMobileNav(true)}
          className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-card/70 backdrop-blur-xl md:hidden"
          aria-label="Klaidų sekcijos"
        >
          <Menu className="h-4 w-4" />
        </button>
      </div>

      {/* Header stripe */}
      <SaaSPanel className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
            <Bug className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-primary">Sistemos stebėsena</p>
            <h1 className="font-display text-xl font-bold tracking-tight sm:text-2xl">Klaidų centras</h1>
          </div>
          <div className="flex items-center gap-2">
            <label className="hidden cursor-pointer items-center gap-1.5 rounded-full border border-border/60 bg-background/40 px-3 py-1.5 text-xs text-muted-foreground sm:inline-flex">
              <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} className="accent-primary" />
              <span className="inline-flex items-center gap-1">
                <span className={`inline-block h-2 w-2 rounded-full ${live ? "animate-pulse bg-emerald-400" : "bg-muted"}`} />
                Live
              </span>
            </label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyAll(filtered)}
              disabled={rows.length === 0}
              title="Kopijuoti klaidas AI'ui / debug'ui"
            >
              {copied ? <Check className="mr-1 h-4 w-4 text-emerald-400" /> : <Copy className="mr-1 h-4 w-4" />}
              <span className="hidden sm:inline">{copied ? "Nukopijuota" : "Kopijuoti"}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Atnaujinti</span>
            </Button>
          </div>
        </div>
      </SaaSPanel>

      {/* Grid: internal sidebar + content */}
      <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
        {/* Desktop internal sidebar */}
        <aside className="sticky top-24 hidden h-fit rounded-2xl border border-border/70 bg-card/60 p-2 backdrop-blur-xl md:block">
          <nav className="flex flex-col gap-1">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const active = section === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                    active
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="err-nav-active"
                      className="absolute inset-0 -z-10 rounded-xl bg-gradient-primary shadow-glow"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{s.label}</span>
                    <span className={`block truncate text-[10px] ${active ? "text-primary-foreground/70" : "text-muted-foreground/70"}`}>{s.hint}</span>
                  </span>
                </button>
              );
            })}
          </nav>
          <div className="mt-2 rounded-xl border border-border/50 bg-background/40 p-3 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className={`inline-block h-2 w-2 rounded-full ${live ? "animate-pulse bg-emerald-400" : "bg-muted"}`} />
              {live ? "Live streamas" : "Live sustabdytas"}
            </div>
            <div className="mt-1 tabular-nums">{rows.length} įrašų atmintyje</div>
          </div>
        </aside>

        {/* Mobile drawer */}
        <AnimatePresence>
          {mobileNav && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileNav(false)}
                className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm md:hidden"
              />
              <motion.aside
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 260, damping: 30 }}
                className="fixed right-0 top-0 z-[91] flex h-full w-[86%] max-w-[320px] flex-col border-l border-border bg-card/95 p-4 shadow-2xl backdrop-blur-xl md:hidden"
              >
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-primary text-primary-foreground shadow-glow">
                      <Bug className="h-4 w-4" />
                    </div>
                    <span className="font-display text-sm font-bold">Klaidų centras</span>
                  </div>
                  <button onClick={() => setMobileNav(false)} className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-accent">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <nav className="mt-3 flex flex-1 flex-col gap-1 overflow-y-auto">
                  {SECTIONS.map((s) => {
                    const Icon = s.icon;
                    const active = section === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => {
                          setSection(s.id);
                          setMobileNav(false);
                        }}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium ${
                          active ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:bg-accent/60"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="flex-1">
                          <span className="block">{s.label}</span>
                          <span className={`block text-[10px] ${active ? "text-primary-foreground/70" : "text-muted-foreground/70"}`}>{s.hint}</span>
                        </span>
                      </button>
                    );
                  })}
                </nav>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Section content */}
        <div className="min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={section}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
              className="space-y-4"
            >
              {section === "overview" && (
                <>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <StatCard label="Iš viso (500)" value={rows.length} icon={Activity} accent="text-primary" />
                    <StatCard label="Paskutinė val." value={lastHour.length} icon={Zap} accent="text-amber-300" />
                    <StatCard
                      label="Kritinės 5min"
                      value={criticalRecent.length}
                      icon={AlertTriangle}
                      accent={criticalRecent.length >= 3 ? "text-rose-300" : "text-fuchsia-300"}
                    />
                    <StatCard
                      label="Email siųsta"
                      value={rows.filter((r) => r.action === "app.email_sent").length}
                      icon={Mail}
                      accent="text-cyan-300"
                    />
                  </div>

                  <SaaSPanel>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">Klaidų srautas · 24h</div>
                        <div className="mt-0.5 text-lg font-semibold">
                          {spark.reduce((a, b) => a + b, 0)}{" "}
                          <span className="text-xs font-normal text-muted-foreground">įvykių</span>
                        </div>
                      </div>
                      <span className="rounded-full border border-border/50 bg-background/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        30-min buckets
                      </span>
                    </div>
                    <div className="mt-3">
                      <Sparkline values={spark} className="!h-20" />
                    </div>
                  </SaaSPanel>

                  <LockdownBanner
                    lockdown={lockdown}
                    site={site}
                    criticalPressure={criticalPressure}
                    busy={busy}
                    onToggle={toggleLockdown}
                    compact
                  />
                </>
              )}

              {section === "live" && (
                <>
                  <SaaSPanel padded={false}>
                    <div className="flex flex-wrap items-center gap-2 p-3">
                      <div className="relative min-w-[200px] flex-1">
                        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder={regexMode ? "Regex, pvz. ^Cannot read|is not a function" : "Ieškoti žinutėje, kelyje, stack…"}
                          value={filter}
                          onChange={(e) => setFilter(e.target.value)}
                          className="pl-8 pr-20 font-mono text-sm"
                        />
                        <div className="absolute right-1.5 top-1.5 flex items-center gap-1">
                          <button
                            onClick={() => setRegexMode((v) => !v)}
                            title="Regex režimas"
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase transition ${
                              regexMode ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
                            }`}
                          >.*</button>
                          {filter && (
                            <button onClick={() => setFilter("")} className="text-muted-foreground hover:text-foreground">
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {(["5m", "1h", "24h", "all"] as const).map((t) => (
                          <button
                            key={t}
                            onClick={() => setTimeWindow(t)}
                            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                              timeWindow === t
                                ? "border-primary/60 bg-primary/15 text-primary"
                                : "border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                            }`}
                          >{t === "all" ? "Visos" : t}</button>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(["all", "client.error", "supabase.error", "app.critical", "app.warning", "app.email_sent"] as const).map((k) => {
                          const active = kind === k;
                          const count = k === "all" ? rows.length : rows.filter((r) => r.action === k).length;
                          return (
                            <button
                              key={k}
                              onClick={() => setKind(k)}
                              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                                active
                                  ? "border-primary/60 bg-primary/15 text-primary"
                                  : "border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                              }`}
                            >
                              {k === "all" ? "Visos" : KIND_LABEL[k]} <span className="ml-1 tabular-nums opacity-70">{count}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </SaaSPanel>

                  <div className="space-y-2">
                    {filtered.length === 0 && !loading && (
                      <SaaSPanel>
                        <div className="p-10 text-center">
                          <ShieldCheck className="mx-auto h-10 w-10 text-emerald-400" />
                          <p className="mt-3 text-sm text-muted-foreground">Klaidų nėra pagal šį filtrą — sistema švari 🎉</p>
                        </div>
                      </SaaSPanel>
                    )}
                    <AnimatePresence initial={false}>
                      {filtered.map((r) => (
                        <motion.div
                          key={r.id}
                          layout
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.2 }}
                        >
                          <SaaSPanel className="group transition hover:border-primary/40 hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.3)]">
                            <div className="flex items-start gap-2">
                              <button onClick={() => setSelected(r)} className="min-w-0 flex-1 text-left">
                                <div className="space-y-1 text-sm">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${KIND_STYLE[r.action] ?? ""}`}>
                                      {KIND_LABEL[r.action] ?? r.action}
                                    </span>
                                    <span className="text-xs text-muted-foreground tabular-nums">{relTime(r.created_at)}</span>
                                    {r.meta?.path && <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{r.meta.path}</code>}
                                    {r.meta?.source && <span className="text-xs text-muted-foreground">via {r.meta.source}</span>}
                                    {r.meta?.lockdown && (
                                      <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">LOCKDOWN</span>
                                    )}
                                  </div>
                                  <div className="line-clamp-2 break-words font-mono text-[13px] text-rose-200/90">
                                    {r.meta?.message ?? "(no message)"}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground">
                                    {[r.meta?.browser, r.meta?.os, r.meta?.device].filter(Boolean).join(" • ")}
                                  </div>
                                </div>
                              </button>
                              <button
                                onClick={() => deleteOne(r.id)}
                                className="shrink-0 rounded-lg p-1.5 text-muted-foreground opacity-0 transition hover:bg-rose-500/10 hover:text-rose-300 group-hover:opacity-100"
                                aria-label="Ištrinti"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </SaaSPanel>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </>
              )}

              {section === "analytics" && (
                <>
                  <SaaSPanel>
                    <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">Pasiskirstymas pagal tipą</div>
                    <div className="mt-3 space-y-2">
                      {(["client.error", "supabase.error", "app.critical", "app.warning", "app.email_sent"] as const).map((k) => {
                        const count = rows.filter((r) => r.action === k).length;
                        const pct = rows.length ? (count / rows.length) * 100 : 0;
                        return (
                          <div key={k}>
                            <div className="mb-1 flex items-center justify-between text-xs">
                              <span className="font-medium">{KIND_LABEL[k]}</span>
                              <span className="tabular-nums text-muted-foreground">
                                {count} · {pct.toFixed(1)}%
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-muted/40">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ type: "spring", stiffness: 120, damping: 24 }}
                                className={`h-full ${
                                  k === "app.critical" || k === "client.error"
                                    ? "bg-gradient-to-r from-rose-500 to-fuchsia-500"
                                    : k === "supabase.error"
                                      ? "bg-amber-400"
                                      : k === "app.email_sent"
                                        ? "bg-cyan-400"
                                        : "bg-yellow-400"
                                }`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </SaaSPanel>

                  <SaaSPanel>
                    <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">24h srautas</div>
                    <div className="mt-3">
                      <Sparkline values={spark} className="!h-28" />
                    </div>
                    <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                      <span>prieš 24h</span>
                      <span>dabar</span>
                    </div>
                  </SaaSPanel>
                </>
              )}

              {section === "top" && (
                <SaaSPanel>
                  <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">Dažniausios klaidos (top 10)</div>
                  {topMessages.length === 0 ? (
                    <p className="mt-4 text-sm text-muted-foreground">Nėra duomenų.</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {topMessages.map(([msg, info]) => (
                        <button
                          key={msg}
                          onClick={() => {
                            setFilter(msg.slice(0, 40));
                            setSection("live");
                          }}
                          className="group flex w-full items-center gap-3 rounded-lg border border-border/50 bg-background/40 p-2.5 text-left transition hover:border-primary/40 hover:bg-primary/5"
                        >
                          <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase ${KIND_STYLE[info.action] ?? ""}`}>
                            {KIND_LABEL[info.action] ?? info.action}
                          </span>
                          <span className="min-w-0 flex-1 truncate font-mono text-xs">{msg}</span>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold tabular-nums">×{info.count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </SaaSPanel>
              )}

              {section === "lockdown" && (
                <LockdownBanner
                  lockdown={lockdown}
                  site={site}
                  criticalPressure={criticalPressure}
                  busy={busy}
                  onToggle={toggleLockdown}
                />
              )}

              {section === "settings" && (
                <SaaSPanel>
                  <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">Priežiūra</div>
                  <div className="mt-3 space-y-3">
                    <div className="rounded-xl border border-border/50 bg-background/40 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">Eksportuoti JSON</p>
                          <p className="text-xs text-muted-foreground">Atsisiųsti visus atmintyje esančius įrašus (iki 500).</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={exportJson}>
                          Eksportuoti
                        </Button>
                      </div>
                    </div>
                    <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-rose-200">Išvalyti visas klaidas</p>
                          <p className="text-xs text-rose-200/70">Ištrinti visus client.error / supabase.error / app.* įrašus.</p>
                        </div>
                        <Button variant="destructive" size="sm" onClick={clear} disabled={busy}>
                          <Trash2 className="mr-1 h-4 w-4" /> Išvalyti visus
                        </Button>
                      </div>
                    </div>
                  </div>
                </SaaSPanel>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>{selected && <DetailModal row={selected} onClose={() => setSelected(null)} onDelete={() => deleteOne(selected.id)} />}</AnimatePresence>
    </>
  );
}

function LockdownBanner({
  lockdown,
  site,
  criticalPressure,
  busy,
  onToggle,
  compact,
}: {
  lockdown: boolean;
  site: SiteSettings | null;
  criticalPressure: number;
  busy: boolean;
  onToggle: (v: boolean) => void;
  compact?: boolean;
}) {
  return (
    <SaaSPanel
      className={
        lockdown ? "border-rose-500/50 bg-rose-500/5" : criticalPressure >= 2 ? "border-amber-500/50 bg-amber-500/5" : ""
      }
    >
      <div className="flex flex-wrap items-center gap-4">
        <motion.div
          animate={lockdown ? { scale: [1, 1.08, 1] } : { scale: 1 }}
          transition={{ repeat: lockdown ? Infinity : 0, duration: 1.4 }}
          className={`relative flex h-14 w-14 items-center justify-center rounded-2xl border ${
            lockdown ? "border-rose-500/50 bg-rose-500/10 text-rose-300" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
          }`}
        >
          {lockdown ? <ShieldAlert className="h-7 w-7" /> : <ShieldCheck className="h-7 w-7" />}
          {lockdown && <span className="absolute inset-0 -z-10 animate-ping rounded-2xl bg-rose-500/30" />}
        </motion.div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">Auto-lockdown būsena</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <span className={`text-xl font-black tracking-tight ${lockdown ? "text-rose-300" : "text-emerald-300"}`}>
              {lockdown ? "LOCKDOWN" : "SVEIKAS"}
            </span>
            {site?.lockdown_code && lockdown && (
              <code className="rounded bg-rose-500/20 px-2 py-0.5 text-xs text-rose-200">{site.lockdown_code}</code>
            )}
            <span className="text-xs text-muted-foreground">
              Kritinės per 5 min: <b className="text-foreground">{criticalPressure}</b> / 3
            </span>
          </div>
          {lockdown && site?.lockdown_message && !compact && (
            <p className="mt-1 line-clamp-2 text-xs text-rose-200/80">{site.lockdown_message}</p>
          )}
          {!lockdown && criticalPressure > 0 && (
            <p className="mt-1 text-xs text-amber-300/90">
              {criticalPressure >= 3
                ? "Slenkstis pasiektas — kitas kritinis triggeris auto-užrakins."
                : `Auto-lockdown suveiks kai bus ≥3 kritinės klaidos per 5 min.`}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {lockdown ? (
            <Button onClick={() => onToggle(false)} disabled={busy} className="bg-emerald-500 text-black hover:bg-emerald-400">
              <ShieldCheck className="mr-1 h-4 w-4" /> Išjungti lockdown
            </Button>
          ) : (
            <Button variant="destructive" onClick={() => onToggle(true)} disabled={busy}>
              <ShieldAlert className="mr-1 h-4 w-4" /> Užrakinti dabar
            </Button>
          )}
        </div>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted/50">
        <motion.div
          initial={false}
          animate={{ width: `${Math.min(100, (criticalPressure / 3) * 100)}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
          className={`h-full ${
            criticalPressure >= 3
              ? "bg-gradient-to-r from-rose-500 to-fuchsia-500"
              : criticalPressure >= 2
                ? "bg-amber-400"
                : "bg-emerald-500"
          }`}
        />
      </div>
    </SaaSPanel>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}) {
  return (
    <SaaSPanel>
      <div className="flex items-center gap-3">
        <div className={`rounded-xl border border-border/50 bg-background/40 p-2 ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
          <motion.div key={value} initial={{ scale: 0.9, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }} className="mt-0.5 text-2xl font-black tabular-nums">
            {value}
          </motion.div>
        </div>
      </div>
    </SaaSPanel>
  );
}

function DetailModal({ row, onClose, onDelete }: { row: ErrRow; onClose: () => void; onDelete: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.95, y: 10, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center gap-2 border-b border-border/60 p-4">
          <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${KIND_STYLE[row.action] ?? ""}`}>
            {KIND_LABEL[row.action] ?? row.action}
          </span>
          <span className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString("lt-LT")}</span>
          <button onClick={onDelete} className="ml-auto rounded-lg p-1.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-300" aria-label="Ištrinti">
            <Trash2 className="h-4 w-4" />
          </button>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label="Uždaryti">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[70vh] space-y-4 overflow-auto p-4 text-sm">
          <div>
            <div className="text-[10px] font-bold uppercase text-muted-foreground">Žinutė</div>
            <pre className="mt-1 whitespace-pre-wrap break-words rounded-lg border border-border/50 bg-background/60 p-3 font-mono text-[13px] text-rose-200">
              {row.meta?.message ?? "(no message)"}
            </pre>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {row.meta?.path && <Kv k="Puslapis" v={row.meta.path} />}
            {row.meta?.source && <Kv k="Šaltinis" v={row.meta.source} />}
            {row.meta?.browser && <Kv k="Naršyklė" v={row.meta.browser} />}
            {row.meta?.os && <Kv k="OS" v={row.meta.os} />}
            {row.meta?.device && <Kv k="Įrenginys" v={row.meta.device} />}
            {row.user_id && <Kv k="Vartotojas" v={row.user_id.slice(0, 8)} />}
          </div>
          {row.meta?.stack && (
            <div>
              <div className="text-[10px] font-bold uppercase text-muted-foreground">Stack</div>
              <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-border/50 bg-black/40 p-3 font-mono text-[11px] text-muted-foreground">
                {row.meta.stack}
              </pre>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-background/40 p-2">
      <div className="text-[10px] font-bold uppercase text-muted-foreground">{k}</div>
      <div className="mt-0.5 truncate font-mono">{v}</div>
    </div>
  );
}

function relTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `prieš ${Math.floor(diff)}s`;
  if (diff < 3600) return `prieš ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `prieš ${Math.floor(diff / 3600)}h`;
  return new Date(iso).toLocaleString("lt-LT");
}
