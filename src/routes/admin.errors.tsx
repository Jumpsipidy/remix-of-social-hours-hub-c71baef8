import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
  EyeOff,
  Plus,
  Globe,
  Filter,
  Play,
  Pause,
  RotateCw,
  GitCommit,
  CheckCircle2,
  Sparkles,
  Loader2,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { AdminAurora, SaaSPanel, Sparkline } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { clearAllErrors, deleteErrorRow } from "@/lib/admin-errors.functions";
import { adminUpdateLockdownSettings } from "@/lib/lockdown.functions";
import { logClientError } from "@/lib/error-log";
import { sendTestAlert } from "@/lib/error-escalation.functions";
import { fingerprint as fpOf, severityScore, routeWeight } from "@/lib/error-fingerprint";
import { loadResolved, markResolved, unmarkResolved, isRegression, type ResolvedEntry } from "@/lib/error-resolved";
import { analyzeErrorGroup, getAiAnalysis } from "@/lib/ai-error-analysis.functions";

const CURRENT_BUILD = (import.meta as { env?: { VITE_COMMIT_SHA?: string; VITE_BUILD_TIME?: string } }).env?.VITE_COMMIT_SHA || "unknown";
const CURRENT_BUILD_TIME = (import.meta as { env?: { VITE_COMMIT_SHA?: string; VITE_BUILD_TIME?: string } }).env?.VITE_BUILD_TIME || "";


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

type Section = "overview" | "live" | "analytics" | "top" | "sources" | "lockdown" | "settings";

const SECTIONS: { id: Section; label: string; icon: typeof Bug; hint: string }[] = [
  { id: "overview", label: "Apžvalga", icon: LayoutDashboard, hint: "Pulse · burst · replay" },
  { id: "live", label: "Live srautas", icon: Radio, hint: "Realaus laiko sąrašas" },
  { id: "analytics", label: "Analitika", icon: BarChart3, hint: "24h trendai" },
  { id: "top", label: "Grupės (fingerprint)", icon: ListOrdered, hint: "Severity · unikalūs · nauji" },
  { id: "sources", label: "Šaltiniai", icon: Globe, hint: "Puslapiai · naršyklės · OS" },
  { id: "lockdown", label: "Auto-lockdown", icon: ShieldAlert, hint: "Slenkstis ir valdymas" },
  { id: "settings", label: "Nustatymai", icon: Settings2, hint: "Ignore · testas · eksportas" },
];

const IGNORE_KEY = "admin-errors-ignore-rules";
const AUTO_KEY = "admin-errors-auto-refresh";
const MUTE_KEY = "admin-errors-muted-fingerprints";
function loadIgnore(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(IGNORE_KEY) ?? "[]") as string[]; } catch { return []; }
}
function saveIgnore(list: string[]) {
  try { localStorage.setItem(IGNORE_KEY, JSON.stringify(list)); } catch {}
}
function loadMuted(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(MUTE_KEY) ?? "[]") as string[]; } catch { return []; }
}
function saveMuted(list: string[]) {
  try { localStorage.setItem(MUTE_KEY, JSON.stringify(list)); } catch {}
}

function fpOfRow(r: { meta: any }): string {
  const stored = r.meta?.fingerprint as string | undefined;
  if (stored) return stored;
  return fpOf(r.meta?.message ?? "", r.meta?.stack ?? null).id;
}

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
  const [ignoreRules, setIgnoreRules] = useState<string[]>([]);
  const [showIgnored, setShowIgnored] = useState(false);
  const [autoMs, setAutoMs] = useState<number>(0);
  const [testing, setTesting] = useState(false);
  const [muted, setMuted] = useState<string[]>([]);
  const [groupSort, setGroupSort] = useState<"severity" | "count" | "recent" | "users">("severity");
  const [groupNewOnly, setGroupNewOnly] = useState(false);
  const [newSinceLoad, setNewSinceLoad] = useState(0);
  const [resolvedMap, setResolvedMap] = useState<Record<string, ResolvedEntry>>({});
  const searchRef = useRef<HTMLInputElement | null>(null);
  const clearFn = useServerFn(clearAllErrors);
  const deleteFn = useServerFn(deleteErrorRow);
  const updateLockdownFn = useServerFn(adminUpdateLockdownSettings);
  const sendTestAlertFn = useServerFn(sendTestAlert);
  const [alertResult, setAlertResult] = useState<null | {
    mode: string;
    discord?: { ok: boolean; error: string | null };
    email?: { ok: boolean; recipients: number; error: string | null };
    hasDiscordWebhook?: boolean;
    hasResend?: boolean;
    ts: number;
  }>(null);


  useEffect(() => {
    setIgnoreRules(loadIgnore());
    setMuted(loadMuted());
    setResolvedMap(loadResolved());
    try {
      const v = Number(localStorage.getItem(AUTO_KEY));
      if (Number.isFinite(v) && v > 0) setAutoMs(v);
    } catch {}
  }, []);

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
        .select("lockdown_enabled,lockdown_message,updated_at")
        .eq("id", true)
        .maybeSingle(),
    ]);
    if (error) toast.error("Nepavyko įkelti: " + error.message);
    setRows((data as ErrRow[]) ?? []);
    setNewSinceLoad(0);
    // lockdown_code is admin-only via SECURITY DEFINER server fn; not exposed here.
    setSite(ss.data ? ({ ...(ss.data as SiteSettings), lockdown_code: null } as SiteSettings) : null);
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
            setNewSinceLoad((n) => n + 1);
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

  // Auto-refresh interval
  useEffect(() => {
    if (!autoMs) return;
    const t = setInterval(() => { void load(); }, autoMs);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoMs]);

  // Keyboard shortcuts: `/` focuses search, `l` toggles live, `Esc` clears filter
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inField = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || (target as HTMLElement).isContentEditable);
      if (e.key === "/" && !inField) {
        e.preventDefault();
        setSection("live");
        setTimeout(() => searchRef.current?.focus(), 50);
      } else if (e.key === "Escape" && filter && !selected) {
        setFilter("");
      } else if ((e.key === "l" || e.key === "L") && !inField) {
        setLive((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filter, selected]);

  const matchesIgnore = (r: ErrRow) => {
    if (!ignoreRules.length) return false;
    const hay = (r.meta?.message ?? "") + " " + (r.meta?.path ?? "") + " " + (r.meta?.source ?? "");
    return ignoreRules.some((p) => p && hay.toLowerCase().includes(p.toLowerCase()));
  };

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
      if (!showIgnored && matchesIgnore(r)) return false;
      if (kind !== "all" && r.action !== kind) return false;
      if (windowMs !== Infinity && new Date(r.created_at).getTime() < cutoff) return false;
      if (!f) return true;
      const haystack = [r.meta?.message, r.meta?.source, r.meta?.path, r.meta?.browser, r.meta?.os, r.meta?.device, r.meta?.stack, fpOfRow(r)]
        .filter(Boolean).join(" \n ");
      if (rx) return rx.test(haystack);
      return haystack.toLowerCase().includes(fl);
    });
  }, [rows, filter, kind, regexMode, timeWindow, ignoreRules, showIgnored]);

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

  type Group = {
    fp: string;
    sample: ErrRow;
    message: string;
    action: string;
    count: number;
    critCount: number;
    users: Set<string>;
    paths: Set<string>;
    browsers: Set<string>;
    builds: Set<string>;
    firstMs: number;
    lastMs: number;
    trend: number[]; // 24 buckets = 1h each
    frame?: string;
  };

  const groups = useMemo(() => {
    const map = new Map<string, Group>();
    const now = Date.now();
    const trendStart = now - 24 * 3_600_000;
    for (const r of rows) {
      const id = fpOfRow(r);
      const ts = new Date(r.created_at).getTime();
      const isCrit = CRITICAL_KINDS.has(r.action);
      let g = map.get(id);
      if (!g) {
        g = {
          fp: id,
          sample: r,
          message: (r.meta?.message ?? "(no message)").slice(0, 200),
          action: r.action,
          count: 0,
          critCount: 0,
          users: new Set(),
          paths: new Set(),
          browsers: new Set(),
          builds: new Set(),
          firstMs: ts,
          lastMs: ts,
          trend: new Array(24).fill(0),
          frame: (r.meta as any)?.fingerprint_frame,
        };
        map.set(id, g);
      }
      g.count += 1;
      if (isCrit) g.critCount += 1;
      if (r.user_id) g.users.add(r.user_id);
      if (r.meta?.path) g.paths.add(String(r.meta.path).split("?")[0]);
      if (r.meta?.browser) g.browsers.add(String(r.meta.browser));
      const bsha = (r.meta as any)?.commit_sha;
      if (bsha && bsha !== "unknown") g.builds.add(String(bsha));
      if (ts < g.firstMs) g.firstMs = ts;
      if (ts > g.lastMs) { g.lastMs = ts; g.sample = r; }
      if (ts >= trendStart) {
        const idx = Math.min(23, Math.floor((ts - trendStart) / 3_600_000));
        g.trend[idx] += 1;
      }
    }
    return Array.from(map.values()).map((g) => {
      const regressed = isRegression(g.fp, g.lastMs);
      return {
        ...g,
        severity: severityScore({
          count: g.count,
          users: g.users.size,
          paths: g.paths.size,
          criticalCount: g.critCount,
          lastSeenMs: g.lastMs,
          maxRouteWeight: Math.max(1, ...Array.from(g.paths).map((p) => routeWeight(String(p)))),
          isRegression: regressed || (g.firstMs > now - 6 * 3_600_000 && g.count >= 3),
        }),
        isNewToday: g.firstMs > now - 24 * 3_600_000,
        isRegression: regressed,
        isResolved: !!resolvedMap[g.fp] && !regressed,
        resolvedEntry: resolvedMap[g.fp],
      };
    });
  }, [rows, resolvedMap]);

  const topGroups = useMemo(() => {
    const list = groups.filter((g) => (groupNewOnly ? g.isNewToday : true))
      .filter((g) => !muted.includes(g.fp))
      .filter((g) => !g.isResolved);
    return [...list].sort((a, b) => {
      if (groupSort === "count") return b.count - a.count;
      if (groupSort === "users") return b.users.size - a.users.size;
      if (groupSort === "recent") return b.lastMs - a.lastMs;
      return b.severity - a.severity;
    });
  }, [groups, groupSort, groupNewOnly, muted]);

  const resolveGroup = (fp: string) => {
    markResolved(fp, CURRENT_BUILD);
    setResolvedMap(loadResolved());
    toast.success(`Grupė #${fp.slice(0, 7)} pažymėta kaip išspręsta. Jei vėl pasirodys — bus REGRESSION 🔁`);
  };
  const unresolveGroup = (fp: string) => {
    unmarkResolved(fp);
    setResolvedMap(loadResolved());
    toast.success("Atkurta į aktyvių sąrašą");
  };



  const toggleMute = (fp: string) => {
    const next = muted.includes(fp) ? muted.filter((x) => x !== fp) : [...muted, fp];
    setMuted(next); saveMuted(next);
    toast.success(muted.includes(fp) ? "Grupė vėl matoma" : "Grupė nutildyta");
  };

  const topSources = useMemo(() => {
    const paths = new Map<string, number>();
    const browsers = new Map<string, number>();
    const oses = new Map<string, number>();
    for (const r of rows) {
      const p = (r.meta?.path ?? "").split("?")[0] || "(nežinomas)";
      paths.set(p, (paths.get(p) ?? 0) + 1);
      const b = r.meta?.browser ?? "(nežinoma)";
      browsers.set(b, (browsers.get(b) ?? 0) + 1);
      const o = r.meta?.os ?? "(nežinoma)";
      oses.set(o, (oses.get(o) ?? 0) + 1);
    }
    const top = (m: Map<string, number>, n = 8) =>
      Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, n);
    return { paths: top(paths, 10), browsers: top(browsers), oses: top(oses) };
  }, [rows]);

  const ignoredCount = useMemo(() => rows.filter(matchesIgnore).length, [rows, ignoreRules]);

  const addIgnoreRule = (pattern: string) => {
    const p = pattern.trim();
    if (!p) return;
    if (ignoreRules.includes(p)) return toast.info("Toks šablonas jau yra");
    const next = [...ignoreRules, p];
    setIgnoreRules(next); saveIgnore(next);
    toast.success(`Paslėpta: „${p.slice(0, 40)}"`);
  };
  const removeIgnoreRule = (p: string) => {
    const next = ignoreRules.filter((x) => x !== p);
    setIgnoreRules(next); saveIgnore(next);
  };

  const setAutoInterval = (ms: number) => {
    setAutoMs(ms);
    try { localStorage.setItem(AUTO_KEY, String(ms)); } catch {}
  };

  const triggerTestError = async () => {
    setTesting(true);
    try {
      await logClientError(new Error(`[TEST] Testinė klaida ${new Date().toLocaleTimeString("lt-LT")}`), {
        source: "admin.errors.test",
        extra: { path: "/admin/errors" },
      });
      toast.success("Testinė klaida sukurta — turėtų atsirasti Live sraute");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nepavyko");
    } finally {
      setTesting(false);
    }
  };

  const runTestAlert = async (mode: "discord" | "email" | "both" | "lockdown-sim") => {
    setTesting(true);
    setAlertResult(null);
    try {
      const res = await sendTestAlertFn({ data: { mode } });
      if (!res?.ok) {
        toast.error(`Testas atmestas: ${(res as { error?: string })?.error ?? "unknown"}`);
        return;
      }
      setAlertResult({
        mode,
        discord: res.discord,
        email: res.email,
        hasDiscordWebhook: res.hasDiscordWebhook,
        hasResend: res.hasResend,
        ts: Date.now(),
      });
      const parts: string[] = [];
      if (res.discord) parts.push(`Discord: ${res.discord.ok ? "✅" : "❌ " + (res.discord.error ?? "")}`);
      if (res.email) parts.push(`Email → ${res.email.recipients}: ${res.email.ok ? "✅" : "❌ " + (res.email.error ?? "")}`);
      if (parts.every((p) => p.includes("✅"))) toast.success(parts.join("  ·  "));
      else toast.warning(parts.join("  ·  "));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nepavyko");
    } finally {
      setTesting(false);
    }
  };


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
    try {
      // Write via admin-gated server fn — lockdown_code column privileges are
      // revoked from authenticated, so a direct client upsert would fail.
      await updateLockdownFn({
        data: {
          lockdown_enabled: enable,
          lockdown_code: enable ? "E-MANUAL" : null,
          lockdown_message: enable
            ? "[rankinis] Super admin užrakino svetainę iš klaidų stebėsenos."
            : null,
        },
      });
      toast.success(enable ? "🔒 Lockdown ĮJUNGTAS" : "🔓 Lockdown išjungtas");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nepavyko");
    } finally {
      setBusy(false);
    }
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
        `── [${KIND_LABEL[r.action] ?? r.action}] ${new Date(r.created_at).toLocaleString("lt-LT")} · #${fpOfRow(r)}`,
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
            <div className="hidden items-center gap-1 rounded-full border border-border/60 bg-background/40 px-2 py-1 text-[11px] sm:inline-flex" title="Automatinis atnaujinimas">
              {autoMs ? <Play className="h-3 w-3 text-emerald-400" /> : <Pause className="h-3 w-3 text-muted-foreground" />}
              <select
                value={autoMs}
                onChange={(e) => setAutoInterval(Number(e.target.value))}
                className="bg-transparent text-xs outline-none"
              >
                <option value={0}>Auto: išj.</option>
                <option value={5000}>5s</option>
                <option value={15000}>15s</option>
                <option value={60000}>60s</option>
              </select>
            </div>
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
              {section === "overview" && (() => {
                const now = Date.now();
                const burstWindow = rows.filter(
                  (r) => CRITICAL_KINDS.has(r.action) && now - new Date(r.created_at).getTime() < 90_000,
                );
                const burstUsers = new Set(burstWindow.map((r) => r.user_id ?? r.meta?.browser ?? r.id)).size;
                const burstActive = burstUsers >= 3;
                const replayCount = rows.filter((r) => {
                  const m = r.meta as any;
                  return Array.isArray(m?.replay) || Array.isArray(m?.breadcrumbs);
                }).length;
                const newGroupsToday = groups.filter((g) => g.isNewToday).length;
                const topGroup = topGroups[0];
                const uniqueFps = groups.length;
                return (
                  <>
                    {/* Feature status strip */}
                    <SaaSPanel padded={false}>
                      <div className="flex flex-wrap items-center gap-2 p-3 text-[11px]">
                        <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-1 font-bold uppercase tracking-widest text-emerald-300">
                          v3 · fingerprint aktyvus
                        </span>
                        <span className={`rounded-full border px-2.5 py-1 font-bold uppercase tracking-widest ${burstActive ? "border-rose-500/50 bg-rose-500/15 text-rose-300 animate-pulse" : "border-border/60 bg-background/40 text-muted-foreground"}`}>
                          {burstActive ? `🔥 Burst · ${burstUsers} vart / 90s` : "Burst detektorius: rimta"}
                        </span>
                        <span className="rounded-full border border-fuchsia-400/40 bg-fuchsia-400/10 px-2.5 py-1 font-bold uppercase tracking-widest text-fuchsia-300">
                          Replay: {replayCount}
                        </span>
                        <span className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-2.5 py-1 font-bold uppercase tracking-widest text-cyan-300">
                          Auto-recovery: 10 min
                        </span>
                        {muted.length > 0 && (
                          <span className="rounded-full border border-border/60 bg-background/40 px-2.5 py-1 font-bold uppercase tracking-widest text-muted-foreground">
                            Nutildyta: {muted.length}
                          </span>
                        )}
                        <span className="ml-auto text-muted-foreground">
                          {live ? "🟢 Realtime kanalas" : "⚪️ Realtime pauzėje"}
                        </span>
                      </div>
                    </SaaSPanel>

                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                      <StatCard label="Iš viso (500)" value={rows.length} icon={Activity} accent="text-primary" />
                      <StatCard label="Paskutinė val." value={lastHour.length} icon={Zap} accent="text-amber-300" />
                      <StatCard
                        label="Kritinės 5min"
                        value={criticalRecent.length}
                        icon={AlertTriangle}
                        accent={criticalRecent.length >= 2 ? "text-rose-300" : "text-fuchsia-300"}
                      />
                      <StatCard
                        label="Email siųsta"
                        value={rows.filter((r) => r.action === "app.email_sent").length}
                        icon={Mail}
                        accent="text-cyan-300"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                      <StatCard label="Unikalios grupės" value={uniqueFps} icon={ListOrdered} accent="text-violet-300" />
                      <StatCard label="🆕 Naujos (24h)" value={newGroupsToday} icon={Plus} accent="text-emerald-300" />
                      <StatCard label="Su session replay" value={replayCount} icon={Radio} accent="text-fuchsia-300" />
                      <StatCard label="Nutildytos grupės" value={muted.length} icon={EyeOff} accent="text-muted-foreground" />
                    </div>

                    {topGroup && (
                      <SaaSPanel className="border-rose-500/30">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-rose-300">
                                🔥 Aukščiausio severity grupė
                              </span>
                              <span className="rounded-md bg-rose-500/20 px-2 py-0.5 text-[10px] font-black text-rose-200 tabular-nums">
                                sev {topGroup.severity}
                              </span>
                              {topGroup.isNewToday && (
                                <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black text-emerald-200">🆕 NAUJA</span>
                              )}
                            </div>
                            <div className="mt-1.5 line-clamp-2 break-words font-mono text-[13px] text-rose-100/90">
                              {topGroup.message}
                            </div>
                            <div className="mt-1.5 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                              <span>#{topGroup.fp.slice(0, 8)}</span>
                              <span>{topGroup.count}× įvykių</span>
                              <span>{topGroup.users.size} vartotojų</span>
                              <span>{topGroup.paths.size} puslapių</span>
                              <span>paskutinį kartą {relTime(new Date(topGroup.lastMs).toISOString())}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => setSection("top")}
                            className="shrink-0 rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-[11px] font-bold text-rose-200 hover:bg-rose-500/20 transition"
                          >
                            Visos grupės →
                          </button>
                        </div>
                        <div className="mt-3">
                          <Sparkline values={topGroup.trend} className="!h-14" />
                        </div>
                      </SaaSPanel>
                    )}

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
                );
              })()}

              {section === "live" && (
                <>
                  <SaaSPanel padded={false}>
                    <div className="flex flex-wrap items-center gap-2 p-3">
                      <div className="relative min-w-[200px] flex-1">
                        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          ref={searchRef}
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
                <div className="space-y-3">
                  <SaaSPanel padded={false}>
                    <div className="flex flex-wrap items-center gap-2 p-3">
                      <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
                        Grupuota pagal fingerprint · {topGroups.length} grupių
                      </div>
                      <div className="ml-auto flex flex-wrap gap-1.5">
                        {(["severity", "count", "users", "recent"] as const).map((s) => (
                          <button
                            key={s}
                            onClick={() => setGroupSort(s)}
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                              groupSort === s
                                ? "border-primary/60 bg-primary/15 text-primary"
                                : "border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                            }`}
                          >
                            {s === "severity" ? "Severity" : s === "count" ? "Kiekis" : s === "users" ? "Vartotojai" : "Naujausia"}
                          </button>
                        ))}
                        <button
                          onClick={() => setGroupNewOnly((v) => !v)}
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                            groupNewOnly
                              ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-300"
                              : "border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                          }`}
                        >
                          🆕 Tik nauja (24h)
                        </button>
                      </div>
                    </div>
                  </SaaSPanel>

                  {topGroups.length === 0 ? (
                    <SaaSPanel>
                      <div className="p-8 text-center text-sm text-muted-foreground">
                        <ShieldCheck className="mx-auto mb-2 h-8 w-8 text-emerald-400" />
                        Grupių nėra — sistema švari.
                      </div>
                    </SaaSPanel>
                  ) : (
                    topGroups.slice(0, 30).map((g) => (
                      <ErrorGroupCard
                        key={g.fp}
                        g={g}
                        onOpen={() => setSelected(g.sample)}
                        onFilterLive={() => { setFilter(g.fp); setSection("live"); }}
                        onMute={() => toggleMute(g.fp)}
                        onResolve={() => resolveGroup(g.fp)}
                        onUnresolve={() => unresolveGroup(g.fp)}
                      />
                    ))
                  )}

                  {muted.length > 0 && (
                    <SaaSPanel>
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
                          Nutildyta ({muted.length})
                        </div>
                        <button onClick={() => { setMuted([]); saveMuted([]); toast.success("Visos grupės atkurtos"); }}
                          className="text-[11px] text-primary hover:underline">
                          Atkurti visas
                        </button>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {muted.map((fp) => (
                          <button key={fp} onClick={() => toggleMute(fp)}
                            className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/40 px-2 py-1 font-mono text-[10px] hover:border-primary/40">
                            #{fp} <X className="h-3 w-3" />
                          </button>
                        ))}
                      </div>
                    </SaaSPanel>
                  )}
                </div>
              )}

              {section === "sources" && (
                <div className="grid gap-3 lg:grid-cols-2">
                  <SourceBreakdown title="Puslapiai" items={topSources.paths} total={rows.length} onPick={(v) => { setFilter(v); setSection("live"); }} />
                  <SourceBreakdown title="Naršyklės" items={topSources.browsers} total={rows.length} onPick={(v) => { setFilter(v); setSection("live"); }} />
                  <SourceBreakdown title="OS" items={topSources.oses} total={rows.length} onPick={(v) => { setFilter(v); setSection("live"); }} />
                  <SaaSPanel>
                    <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">Klavišų kombinacijos</div>
                    <div className="mt-3 space-y-2 text-xs">
                      <ShortcutRow k="/" desc="Fokusuoti paiešką (Live)" />
                      <ShortcutRow k="L" desc="Įjungti / išjungti Live streamą" />
                      <ShortcutRow k="Esc" desc="Išvalyti paiešką" />
                    </div>
                  </SaaSPanel>
                </div>
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
                <div className="space-y-3">
                  <SaaSPanel>
                    <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">Diagnostika</div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
                        <p className="text-sm font-semibold">Kopijuoti klaidas</p>
                        <p className="text-xs text-muted-foreground">Formatuotas plain text — įklijuok į Lovable pokalbį.</p>
                        <div className="mt-2 flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => copyAll(rows)}>
                            <Copy className="mr-1 h-4 w-4" /> Visas ({rows.length})
                          </Button>
                          <Button size="sm" onClick={() => copyAll(filtered)}>
                            <Copy className="mr-1 h-4 w-4" /> Filtruotos ({filtered.length})
                          </Button>
                        </div>
                      </div>
                      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
                        <p className="text-sm font-semibold text-emerald-200">Testinė klaida (pipeline)</p>
                        <p className="text-xs text-emerald-200/70">Sukuria įrašą Supabase → Live sraute (be email/Discord, nes [TEST] filtruojamas).</p>
                        <Button variant="outline" size="sm" className="mt-2 border-emerald-500/40" onClick={triggerTestError} disabled={testing}>
                          <Zap className="mr-1 h-4 w-4" /> {testing ? "Siunčiu…" : "Testinė klaida"}
                        </Button>
                      </div>
                    </div>

                    {/* -------- Alert channel tests (bypasses filters) -------- */}
                    <div className="mt-4 rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-rose-500/10 p-4">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-300">▸ Signalizacijos kanalų testas</div>
                          <p className="mt-1 text-xs text-amber-200/80 max-w-md">
                            Aplenkia visus filtrus, rate limit ir dedupe. Tikrina, ar Discord webhook ir Resend email realiai išsiunčia.
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-semibold">
                          <span className={`rounded-full px-2 py-1 ${alertResult?.hasDiscordWebhook === false ? "bg-rose-500/20 text-rose-200" : "bg-emerald-500/20 text-emerald-200"}`}>
                            Discord {alertResult?.hasDiscordWebhook === false ? "❌" : "✓"}
                          </span>
                          <span className={`rounded-full px-2 py-1 ${alertResult?.hasResend === false ? "bg-rose-500/20 text-rose-200" : "bg-emerald-500/20 text-emerald-200"}`}>
                            Resend {alertResult?.hasResend === false ? "❌" : "✓"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        <Button size="sm" variant="outline" className="border-indigo-400/40 bg-indigo-500/10 hover:bg-indigo-500/20"
                          onClick={() => runTestAlert("discord")} disabled={testing}>
                          <Radio className="mr-1 h-4 w-4" /> Discord ping
                        </Button>
                        <Button size="sm" variant="outline" className="border-sky-400/40 bg-sky-500/10 hover:bg-sky-500/20"
                          onClick={() => runTestAlert("email")} disabled={testing}>
                          <Mail className="mr-1 h-4 w-4" /> Email test
                        </Button>
                        <Button size="sm" variant="outline" className="border-emerald-400/40 bg-emerald-500/10 hover:bg-emerald-500/20"
                          onClick={() => runTestAlert("both")} disabled={testing}>
                          <Zap className="mr-1 h-4 w-4" /> Abu kanalai
                        </Button>
                        <Button size="sm" variant="outline" className="border-rose-400/40 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20"
                          onClick={() => runTestAlert("lockdown-sim")} disabled={testing}>
                          <ShieldAlert className="mr-1 h-4 w-4" /> Lockdown simuliacija
                        </Button>
                      </div>

                      <AnimatePresence>
                        {alertResult && (
                          <motion.div
                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="mt-3 rounded-lg border border-border/50 bg-background/60 p-3 font-mono text-xs"
                          >
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Rezultatas · {alertResult.mode}</span>
                              <span className="text-[10px] text-muted-foreground">{new Date(alertResult.ts).toLocaleTimeString("lt-LT")}</span>
                            </div>
                            {alertResult.discord && (
                              <div className="flex items-center gap-2">
                                <Radio className="h-3.5 w-3.5" />
                                Discord: {alertResult.discord.ok
                                  ? <span className="text-emerald-300 font-bold">✅ išsiųsta</span>
                                  : <span className="text-rose-300 font-bold">❌ {alertResult.discord.error}</span>}
                              </div>
                            )}
                            {alertResult.email && (
                              <div className="mt-1 flex items-center gap-2">
                                <Mail className="h-3.5 w-3.5" />
                                Email: {alertResult.email.ok
                                  ? <span className="text-emerald-300 font-bold">✅ išsiųsta {alertResult.email.recipients} adm.</span>
                                  : <span className="text-rose-300 font-bold">❌ {alertResult.email.error}</span>}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-border/50 bg-background/40 p-3">
                        <p className="text-sm font-semibold">Eksportuoti JSON</p>
                        <p className="text-xs text-muted-foreground">Iki 500 įrašų (aktuali atmintis).</p>
                        <Button variant="outline" size="sm" className="mt-2" onClick={exportJson}>Eksportuoti</Button>
                      </div>
                      <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3">
                        <p className="text-sm font-semibold text-rose-200">Išvalyti visas klaidas</p>
                        <p className="text-xs text-rose-200/70">Ištrina client.error / supabase.error / app.* įrašus.</p>
                        <Button variant="destructive" size="sm" className="mt-2" onClick={clear} disabled={busy}>
                          <Trash2 className="mr-1 h-4 w-4" /> Išvalyti visus
                        </Button>
                      </div>
                    </div>

                  </SaaSPanel>

                  <SaaSPanel>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">Ignoravimo šablonai</div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Slepia įrašus, kurių žinutė / kelias / šaltinis atitinka bet kurį šabloną. Saugoma tik tavo naršyklėje.
                        </p>
                      </div>
                      <label className="flex items-center gap-1.5 text-xs">
                        <input type="checkbox" checked={showIgnored} onChange={(e) => setShowIgnored(e.target.checked)} className="accent-primary" />
                        Rodyti paslėptus ({ignoredCount})
                      </label>
                    </div>
                    <IgnoreRuleEditor onAdd={addIgnoreRule} />
                    {ignoreRules.length === 0 ? (
                      <p className="mt-2 text-xs text-muted-foreground">Šablonų nėra. Įrašyk fragmentą, pvz. „ResizeObserver".</p>
                    ) : (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {ignoreRules.map((p) => (
                          <span key={p} className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/40 px-2 py-1 text-xs">
                            <EyeOff className="h-3 w-3 text-muted-foreground" />
                            <code className="font-mono">{p}</code>
                            <button onClick={() => removeIgnoreRule(p)} className="ml-1 rounded p-0.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-300" aria-label="Šalinti">
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </SaaSPanel>
                </div>
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
          <button
            onClick={async () => {
              try {
                const m = row.meta ?? {};
                const text = [
                  `[${KIND_LABEL[row.action] ?? row.action}] ${new Date(row.created_at).toLocaleString("lt-LT")}`,
                  `msg: ${m.message ?? "(no message)"}`,
                  m.path ? `path: ${m.path}` : null,
                  m.source ? `source: ${m.source}` : null,
                  [m.browser, m.os, m.device].filter(Boolean).length ? `device: ${[m.browser, m.os, m.device].filter(Boolean).join(" · ")}` : null,
                  m.stack ? `stack:\n${m.stack}` : null,
                ].filter(Boolean).join("\n");
                await navigator.clipboard.writeText(text);
                toast.success("Nukopijuota");
              } catch { toast.error("Nepavyko kopijuoti"); }
            }}
            className="ml-auto rounded-lg p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary"
            aria-label="Kopijuoti"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button onClick={onDelete} className="rounded-lg p-1.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-300" aria-label="Ištrinti">
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

          {/* Student-impact panel — what will an actual user see because of this? */}
          {(() => {
            const path = String(row.meta?.path ?? "");
            const w = routeWeight(path);
            const severity = w >= 5 ? "🔴 Kritinis mokinių srautui" : w >= 3 ? "🟠 Blokuoja veiksmą" : "🟡 Vizualus / nekritinis";
            const impact = path.includes("/checkin") ? "Mokinys negali įsiregistruoti QR kodu — valandos neįskaitomos."
              : path.includes("/reservation") || path.includes("/organization/scan") ? "Rezervacijos / darbo patvirtinimo srautas gali sulūžti."
              : path.includes("/pdf") || path.includes("/verify") ? "PDF sertifikatas gali nepasirašyti arba nepatikrinamas."
              : path.includes("/auth") || path.includes("/login") || path.includes("/register") ? "Naujas vartotojas gali neprisijungti / neužsiregistruoti."
              : "Puslapis gali užstrigti arba parodyti tuščią ekraną.";
            return (
              <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-rose-500/5 to-transparent p-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">Ką matys mokinys?</div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-200">{severity}</span>
                  <span className="rounded-full border border-border/60 bg-background/40 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">route weight ×{w}</span>
                </div>
                <div className="mt-2 text-[13px] leading-snug text-foreground">{impact}</div>
              </div>
            );
          })()}

          <div className="grid grid-cols-2 gap-3 text-xs">
            {row.meta?.path && <Kv k="Puslapis" v={String(row.meta.path)} />}
            {row.meta?.source && <Kv k="Šaltinis" v={String(row.meta.source)} />}
            {row.meta?.browser && <Kv k="Naršyklė" v={String(row.meta.browser)} />}
            {row.meta?.os && <Kv k="OS" v={String(row.meta.os)} />}
            {row.meta?.device && <Kv k="Įrenginys" v={String(row.meta.device)} />}
            {(row.meta as any)?.commit_sha && (row.meta as any).commit_sha !== "unknown" && (
              <Kv k="Build (commit)" v={String((row.meta as any).commit_sha).slice(0, 12)} />
            )}
            {(row.meta as any)?.fingerprint && <Kv k="Fingerprint" v={String((row.meta as any).fingerprint)} />}
            {row.user_id && <Kv k="Vartotojas" v={row.user_id.slice(0, 8)} />}
          </div>
          <ReplayTimeline meta={row.meta} />
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

type ReplayEvent = { t?: number; dt?: number; kind: string; label: string; path?: string; extra?: Record<string, unknown> };

const KIND_COLOR: Record<string, string> = {
  click: "text-sky-300 border-sky-500/40 bg-sky-500/10",
  nav: "text-violet-300 border-violet-500/40 bg-violet-500/10",
  input: "text-emerald-300 border-emerald-500/40 bg-emerald-500/10",
  scroll: "text-slate-300 border-slate-500/40 bg-slate-500/10",
  resize: "text-slate-300 border-slate-500/40 bg-slate-500/10",
  visibility: "text-amber-300 border-amber-500/40 bg-amber-500/10",
  "fetch-fail": "text-rose-300 border-rose-500/50 bg-rose-500/10",
  rage: "text-fuchsia-300 border-fuchsia-500/50 bg-fuchsia-500/15",
  net: "text-cyan-300 border-cyan-500/40 bg-cyan-500/10",
  key: "text-slate-300 border-slate-500/40 bg-slate-500/10",
  custom: "text-white/70 border-white/20 bg-white/5",
};

function ReplayTimeline({ meta }: { meta: ErrRow["meta"] }) {
  const replay = (meta as any)?.replay as ReplayEvent[] | undefined;
  const crumbs = (meta as any)?.breadcrumbs as ReplayEvent[] | undefined;
  const events = (replay && replay.length ? replay : crumbs) ?? [];
  if (events.length === 0) return null;

  // normalize to relative timestamps (dt in ms from first event)
  const t0 = events[0].t ?? 0;
  const normalized = events.map((e, i) => ({
    ...e,
    dtMs: typeof e.dt === "number" ? e.dt : (e.t ?? 0) - t0,
    idx: i,
  }));
  const totalMs = Math.max(1, normalized[normalized.length - 1].dtMs);

  return (
    <div className="rounded-xl border border-border/50 bg-black/30 p-3">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="h-3.5 w-3.5 text-rose-300" />
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Session Replay · paskutinės {(totalMs / 1000).toFixed(1)}s prieš klaidą
          </div>
        </div>
        <div className="text-[10px] tabular-nums text-muted-foreground">{events.length} įvykių</div>
      </div>

      {/* Density strip */}
      <div className="relative mb-3 h-6 overflow-hidden rounded-md border border-border/40 bg-background/40">
        {normalized.map((e, i) => {
          const left = totalMs > 0 ? (e.dtMs / totalMs) * 100 : 0;
          const color =
            e.kind === "fetch-fail" || e.kind === "rage" ? "#f43f5e"
            : e.kind === "click" ? "#38bdf8"
            : e.kind === "nav" ? "#a78bfa"
            : e.kind === "input" ? "#34d399"
            : "#64748b";
          return (
            <span
              key={i}
              className="absolute top-0 h-full w-[2px] opacity-80"
              style={{ left: `${left}%`, background: color }}
              title={`${(e.dtMs / 1000).toFixed(2)}s · ${e.kind} · ${e.label}`}
            />
          );
        })}
        <span className="absolute right-0 top-0 h-full w-[3px] bg-rose-500" title="Crash" />
      </div>

      {/* Event list */}
      <ol className="max-h-64 space-y-1 overflow-auto pr-1">
        {normalized.map((e, i) => (
          <li key={i} className="flex items-start gap-2 rounded-md border border-transparent px-2 py-1 hover:border-border/50 hover:bg-background/40">
            <span className="mt-0.5 shrink-0 rounded font-mono text-[10px] tabular-nums text-muted-foreground">
              {(e.dtMs / 1000).toFixed(2)}s
            </span>
            <span className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase ${KIND_COLOR[e.kind] ?? "border-white/20 bg-white/5 text-white/70"}`}>
              {e.kind}
            </span>
            <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-white/85">
              {e.label}
              {e.path && <span className="ml-1 text-muted-foreground">· {e.path}</span>}
            </span>
          </li>
        ))}
        <li className="flex items-center gap-2 rounded-md border border-rose-500/40 bg-rose-500/10 px-2 py-1">
          <span className="mt-0.5 shrink-0 font-mono text-[10px] tabular-nums text-rose-300">💥 crash</span>
          <span className="font-mono text-[11px] text-rose-200">{(meta as any)?.message ?? "unknown error"}</span>
        </li>
      </ol>
    </div>
  );
}

function SourceBreakdown({
  title, items, total, onPick,
}: {
  title: string;
  items: [string, number][];
  total: number;
  onPick: (v: string) => void;
}) {
  return (
    <SaaSPanel>
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">{title}</div>
        <span className="text-[10px] text-muted-foreground">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">Nėra duomenų.</p>
      ) : (
        <div className="mt-3 space-y-1.5">
          {items.map(([label, count]) => {
            const pct = total ? (count / total) * 100 : 0;
            return (
              <button
                key={label}
                onClick={() => onPick(label)}
                className="group block w-full text-left"
                title="Filtruoti Live srautą"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="min-w-0 truncate font-mono">{label}</span>
                  <span className="ml-2 shrink-0 tabular-nums text-muted-foreground">{count} · {pct.toFixed(0)}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted/30">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ type: "spring", stiffness: 140, damping: 22 }}
                    className="h-full bg-gradient-primary"
                  />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </SaaSPanel>
  );
}

function ShortcutRow({ k, desc }: { k: string; desc: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/50 bg-background/40 px-3 py-2">
      <span className="text-muted-foreground">{desc}</span>
      <kbd className="inline-flex min-w-[28px] justify-center rounded border border-border bg-background px-2 py-0.5 font-mono text-[11px] font-bold">{k}</kbd>
    </div>
  );
}

function IgnoreRuleEditor({ onAdd }: { onAdd: (p: string) => void }) {
  const [v, setV] = useState("");
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onAdd(v); setV(""); }}
      className="mt-3 flex gap-2"
    >
      <div className="relative flex-1">
        <Filter className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={v}
          onChange={(e) => setV(e.target.value)}
          placeholder={'Įrašyk fragmentą, pvz. „ResizeObserver" arba „/admin/errors"'}
          className="pl-8 font-mono text-xs"
        />
      </div>
      <Button type="submit" size="sm" disabled={!v.trim()}>
        <Plus className="mr-1 h-4 w-4" /> Pridėti
      </Button>
    </form>
  );
}

type GroupCardProps = {
  g: {
    fp: string;
    message: string;
    action: string;
    count: number;
    critCount: number;
    users: Set<string>;
    paths: Set<string>;
    browsers: Set<string>;
    builds: Set<string>;
    firstMs: number;
    lastMs: number;
    trend: number[];
    severity: number;
    isNewToday: boolean;
    isRegression?: boolean;
    isResolved?: boolean;
    resolvedEntry?: ResolvedEntry;
    frame?: string;
    sample: ErrRow;
  };
  onOpen: () => void;
  onFilterLive: () => void;
  onMute: () => void;
  onResolve: () => void;
  onUnresolve: () => void;
};

function ErrorGroupCard({ g, onOpen, onFilterLive, onMute, onResolve, onUnresolve }: GroupCardProps) {
  const sevColor =
    g.isRegression ? "from-fuchsia-500 to-rose-500 text-fuchsia-100 border-fuchsia-500/60"
    : g.severity >= 70 ? "from-rose-500 to-fuchsia-500 text-rose-200 border-rose-500/50"
    : g.severity >= 40 ? "from-amber-500 to-orange-500 text-amber-100 border-amber-500/40"
    : "from-emerald-500 to-sky-500 text-emerald-100 border-emerald-500/40";
  const sevBadge =
    g.severity >= 70 ? "bg-rose-500/20 text-rose-200 border-rose-500/50"
    : g.severity >= 40 ? "bg-amber-500/20 text-amber-200 border-amber-500/40"
    : "bg-emerald-500/15 text-emerald-200 border-emerald-500/40";
  const maxTrend = Math.max(1, ...g.trend);
  const sampleBuild = (g.sample.meta as any)?.commit_sha as string | undefined;
  const buildCount = g.builds.size;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 240, damping: 24 }}
    >
      <SaaSPanel className={`group relative overflow-hidden ${g.isRegression ? "ring-1 ring-fuchsia-500/40" : ""}`}>
        <div className={`pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${sevColor}`} />
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase ${KIND_STYLE[g.action] ?? ""}`}>
                {KIND_LABEL[g.action] ?? g.action}
              </span>
              <code className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] tracking-wider">
                #{g.fp}
              </code>
              {g.isRegression && (
                <span className="animate-pulse rounded-full border border-fuchsia-500/60 bg-fuchsia-500/20 px-2 py-0.5 text-[9px] font-bold uppercase text-fuchsia-200">
                  🔁 REGRESSION
                </span>
              )}
              {g.isNewToday && !g.isRegression && (
                <span className="rounded-full border border-emerald-500/50 bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-300">
                  🆕 nauja
                </span>
              )}
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${sevBadge}`}>
                Severity {g.severity}
              </span>
              {sampleBuild && sampleBuild !== "unknown" && (
                <span
                  title={buildCount > 1 ? `Matoma ${buildCount} skirtinguose build'uose` : "Build, kuriame įvyko"}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] ${
                    buildCount > 1
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                      : "border-border/60 bg-background/40 text-muted-foreground"
                  }`}
                >
                  <GitCommit className="h-3 w-3" />
                  {sampleBuild.slice(0, 7)}{buildCount > 1 ? ` +${buildCount - 1}` : ""}
                </span>
              )}
              <span className="text-[10px] text-muted-foreground">
                pirmas: {relTimeShort(g.firstMs)} · paskutinis: {relTimeShort(g.lastMs)}
              </span>
            </div>
            <div className="mt-1.5 line-clamp-2 break-words font-mono text-[13px] text-rose-200/90">
              {g.message}
            </div>
            {g.frame && (
              <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground">↳ {g.frame}</div>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
              <span className="tabular-nums"><b className="text-foreground">{g.count}×</b> įvykių</span>
              <span
                title="Kiek unikalių vartotojų palietė ši klaida"
                className={`tabular-nums ${g.users.size >= 5 ? "text-rose-300" : ""}`}
              >
                <b className="text-foreground">{g.users.size}</b> vartotojų
                {g.users.size >= 5 && <span className="ml-1">🔥</span>}
              </span>
              <span className="tabular-nums"><b className="text-foreground">{g.paths.size}</b> puslapių</span>
              <span className="tabular-nums"><b className="text-foreground">{g.browsers.size}</b> naršyklių</span>
              {g.critCount > 0 && (
                <span className="rounded bg-rose-500/15 px-1.5 py-0.5 text-rose-300">
                  {g.critCount} kritinės
                </span>
              )}
              {g.isRegression && g.resolvedEntry && (
                <span className="rounded bg-fuchsia-500/15 px-1.5 py-0.5 text-fuchsia-200">
                  Buvo fixinta {relTimeShort(g.resolvedEntry.resolvedAt)} atgal ({g.resolvedEntry.resolvedInBuild.slice(0, 7)})
                </span>
              )}
            </div>
          </div>

          {/* Trend sparkline (24h · 1h buckets) */}
          <div className="flex shrink-0 flex-col items-end gap-1">
            <div className="flex h-10 w-32 items-end gap-[2px]">
              {g.trend.map((n, i) => (
                <span
                  key={i}
                  className={`flex-1 rounded-sm ${
                    n > 0
                      ? g.isRegression ? "bg-gradient-to-t from-fuchsia-500 to-rose-400"
                        : g.severity >= 70 ? "bg-gradient-to-t from-rose-500 to-fuchsia-400"
                        : g.severity >= 40 ? "bg-gradient-to-t from-amber-500 to-orange-400"
                        : "bg-gradient-to-t from-emerald-500 to-sky-400"
                      : "bg-muted/30"
                  }`}
                  style={{ height: `${(n / maxTrend) * 100}%`, minHeight: n > 0 ? 3 : 2 }}
                  title={`${n} įvykių prieš ${23 - i}h`}
                />
              ))}
            </div>
            <span className="text-[9px] text-muted-foreground">24h srautas</span>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Button variant="outline" size="sm" onClick={onOpen}>
            <Search className="mr-1 h-3.5 w-3.5" /> Detalės
          </Button>
          <Button variant="outline" size="sm" onClick={onFilterLive}>
            <Radio className="mr-1 h-3.5 w-3.5" /> Live filtras
          </Button>
          {g.isResolved ? (
            <Button variant="outline" size="sm" onClick={onUnresolve}>
              <RotateCw className="mr-1 h-3.5 w-3.5" /> Atkurti
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={onResolve}
              className="border-emerald-500/50 text-emerald-200 hover:bg-emerald-500/10">
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Fixinta
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onMute}>
            <EyeOff className="mr-1 h-3.5 w-3.5" /> Nutildyti
          </Button>
          <button
            onClick={() => { try { navigator.clipboard.writeText(`#${g.fp} · ${g.message}`); toast.success("Nukopijuota"); } catch {} }}
            className="ml-auto rounded-lg border border-border/50 px-2 py-1 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground"
          >
            <Copy className="mr-1 inline h-3 w-3" /> #{g.fp}
          </button>
        </div>
      </SaaSPanel>
    </motion.div>
  );
}


function relTimeShort(ms: number): string {
  const diff = (Date.now() - ms) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}
