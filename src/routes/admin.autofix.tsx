import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Sparkles,
  Copy,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Users,
  Clock,
  FileCode,
  Play,
  Pause,
  Zap,
} from "lucide-react";
import {
  analyzeErrorGroup,
  listPendingFingerprints,
  listRecentAnalyses,
} from "@/lib/ai-error-analysis.functions";

export const Route = createFileRoute("/admin/autofix")({
  head: () => ({
    meta: [
      { title: "⚡ Auto-Fix Feed — AI klaidų analizė" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AutoFixFeed,
});

type Analysis = {
  fingerprint: string;
  error_message: string | null;
  suspected_cause: string | null;
  suggested_file: string | null;
  suggested_fix: string | null;
  severity_estimate: string | null;
  confidence: number | null;
  model: string | null;
  tokens_used: number | null;
  raw_response: { prompt_for_agent?: string | null } | null;
  updated_at: string;
  occurrences_24h?: number;
  users_24h?: number;
  last_seen?: string | null;
};

const SEV_STYLES: Record<string, { bg: string; ring: string; text: string; label: string; icon: typeof Flame }> = {
  critical: { bg: "bg-red-500/10", ring: "ring-red-500/40", text: "text-red-300", label: "KRITINĖ", icon: Flame },
  high: { bg: "bg-orange-500/10", ring: "ring-orange-500/40", text: "text-orange-300", label: "AUKŠTA", icon: AlertTriangle },
  medium: { bg: "bg-amber-500/10", ring: "ring-amber-500/40", text: "text-amber-300", label: "VIDUTINĖ", icon: AlertTriangle },
  low: { bg: "bg-sky-500/10", ring: "ring-sky-500/40", text: "text-sky-300", label: "ŽEMA", icon: AlertTriangle },
};

function AutoFixFeed() {
  const listRecent = useServerFn(listRecentAnalyses);
  const listPending = useServerFn(listPendingFingerprints);
  const analyze = useServerFn(analyzeErrorGroup);
  const [autoOn, setAutoOn] = useState(true);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const busyRef = useRef(false);

  const feed = useQuery({
    queryKey: ["autofix-feed"],
    queryFn: () => listRecent({ data: { limit: 25 } }) as Promise<Analysis[]>,
    refetchInterval: 15_000,
  });

  const pending = useQuery({
    queryKey: ["autofix-pending"],
    queryFn: () => listPending({ data: { limit: 5 } }),
    refetchInterval: 20_000,
    enabled: autoOn,
  });

  // Auto-analyze pending fingerprints one at a time
  useEffect(() => {
    if (!autoOn || busyRef.current) return;
    const list = (pending.data ?? []) as { fingerprint: string; count: number; message: string }[];
    if (list.length === 0) return;
    const next = list[0];
    busyRef.current = true;
    setAnalyzing(next.fingerprint);
    analyze({ data: { fingerprint: next.fingerprint } })
      .then(() => {
        toast.success("🤖 AI išanalizavo naują klaidą", {
          description: next.message.slice(0, 120),
        });
        feed.refetch();
        pending.refetch();
      })
      .catch((err: Error) => {
        console.warn("[autofix] analyze failed", err.message);
        // stop auto on rate limit / quota errors to avoid loop
        if (/limit|quota|401|402|429/i.test(err.message)) {
          setAutoOn(false);
          toast.error("Auto-fix sustabdytas", { description: err.message });
        }
      })
      .finally(() => {
        busyRef.current = false;
        setAnalyzing(null);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending.data, autoOn]);

  const items = feed.data ?? [];
  const stats = useMemo(() => {
    const total = items.length;
    const crit = items.filter((i) => i.severity_estimate === "critical").length;
    const high = items.filter((i) => i.severity_estimate === "high").length;
    const tokens = items.reduce((s, i) => s + (i.tokens_used ?? 0), 0);
    return { total, crit, high, tokens };
  }, [items]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-white/10 bg-gradient-to-br from-violet-600/20 via-fuchsia-600/10 to-cyan-500/10 p-6 backdrop-blur-xl"
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 p-2.5 shadow-lg shadow-violet-500/30">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Auto-Fix Feed</h1>
                <p className="text-sm text-white/60">
                  AI (OpenAI · gpt-4o-mini) automatiškai analizuoja kiekvieną naują klaidą ir duoda paruoštą super-promptą Lovable agentui.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoOn((v) => !v)}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                autoOn
                  ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                  : "bg-white/5 text-white/60 ring-1 ring-white/10"
              }`}
            >
              {autoOn ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              Auto {autoOn ? "įjungta" : "išjungta"}
            </button>
            <button
              onClick={() => {
                feed.refetch();
                pending.refetch();
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm text-white/70 ring-1 ring-white/10 hover:bg-white/10"
            >
              <RefreshCw className={`h-4 w-4 ${feed.isFetching ? "animate-spin" : ""}`} />
              Perkrauti
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatChip label="Analizių" value={String(stats.total)} icon={Sparkles} tone="violet" />
          <StatChip label="Kritinės" value={String(stats.crit)} icon={Flame} tone="red" />
          <StatChip label="Aukštos" value={String(stats.high)} icon={AlertTriangle} tone="orange" />
          <StatChip label="Tokens" value={stats.tokens.toLocaleString()} icon={Zap} tone="cyan" />
        </div>
      </motion.div>

      {/* Live indicator */}
      <AnimatePresence>
        {analyzing && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 rounded-xl border border-violet-400/30 bg-violet-500/10 p-3 text-sm text-violet-200"
          >
            <div className="h-2 w-2 animate-pulse rounded-full bg-violet-400" />
            <span>AI analizuoja naują fingerprint: <code className="font-mono text-xs">{analyzing.slice(0, 16)}…</code></span>
          </motion.div>
        )}
        {autoOn && !analyzing && ((pending.data ?? []) as unknown[]).length === 0 && items.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-3 text-sm text-emerald-300"
          >
            <CheckCircle2 className="h-4 w-4" />
            Visos naujausios klaidos jau išanalizuotos. Laukiama naujų.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feed */}
      {feed.isLoading ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center text-white/50">
          Kraunama…
        </div>
      ) : items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {items.map((a) => (
              <FixCard key={a.fingerprint} analysis={a} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function StatChip({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof Sparkles;
  tone: "violet" | "red" | "orange" | "cyan";
}) {
  const tones = {
    violet: "from-violet-500/20 to-fuchsia-500/10 text-violet-200 ring-violet-400/30",
    red: "from-red-500/20 to-rose-500/10 text-red-200 ring-red-400/30",
    orange: "from-orange-500/20 to-amber-500/10 text-orange-200 ring-orange-400/30",
    cyan: "from-cyan-500/20 to-sky-500/10 text-cyan-200 ring-cyan-400/30",
  };
  return (
    <div className={`rounded-xl bg-gradient-to-br ${tones[tone]} p-3 ring-1`}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide opacity-80">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}

function EmptyState() {
  const router = useRouter();
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center">
      <Sparkles className="mx-auto h-10 w-10 text-white/30" />
      <h3 className="mt-3 text-lg font-semibold text-white">Kol kas nėra analizių</h3>
      <p className="mt-1 text-sm text-white/50">
        Kai svetainėje įvyks klaida, AI ją čia parodys automatiškai. Nori pabandyti dabar? Nueik į „Klaidos (live)" ir spausk „Analizuoti".
      </p>
      <button
        onClick={() => router.navigate({ to: "/admin/errors" })}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm text-white ring-1 ring-white/20 hover:bg-white/20"
      >
        Atidaryti klaidų sąrašą
      </button>
    </div>
  );
}

function FixCard({ analysis }: { analysis: Analysis }) {
  const [copied, setCopied] = useState(false);
  const analyze = useServerFn(analyzeErrorGroup);
  const [refreshing, setRefreshing] = useState(false);
  const sev = SEV_STYLES[analysis.severity_estimate ?? "medium"] ?? SEV_STYLES.medium;
  const SevIcon = sev.icon;
  const superPrompt = analysis.raw_response?.prompt_for_agent ?? buildFallbackPrompt(analysis);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(superPrompt);
      setCopied(true);
      toast.success("Super-promptas nukopijuotas — įklijuok Lovable chat'e");
      setTimeout(() => setCopied(false), 2200);
    } catch {
      toast.error("Nepavyko nukopijuoti");
    }
  };

  const forceRefresh = async () => {
    setRefreshing(true);
    try {
      await analyze({ data: { fingerprint: analysis.fingerprint, force: true } });
      toast.success("Analizė atnaujinta");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className={`rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-5 backdrop-blur-xl ring-1 ${sev.ring}`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 rounded-full ${sev.bg} px-2.5 py-1 text-xs font-semibold ${sev.text}`}>
            <SevIcon className="h-3.5 w-3.5" />
            {sev.label}
          </span>
          {analysis.occurrences_24h !== undefined && analysis.occurrences_24h > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-xs text-white/70">
              <Flame className="h-3 w-3" /> {analysis.occurrences_24h}× / 24h
            </span>
          )}
          {analysis.users_24h !== undefined && analysis.users_24h > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-xs text-white/70">
              <Users className="h-3 w-3" /> {analysis.users_24h} vartotojų
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-xs text-white/50">
            <Clock className="h-3 w-3" /> {new Date(analysis.updated_at).toLocaleString("lt-LT")}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/40">
          {analysis.confidence != null && <span>conf {(analysis.confidence * 100).toFixed(0)}%</span>}
          <button
            onClick={forceRefresh}
            disabled={refreshing}
            className="rounded-md p-1.5 hover:bg-white/10"
            title="Perkrauti analizę"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Error message */}
      <div className="mt-3 font-mono text-sm text-red-200/90 break-words">
        {analysis.error_message || "(nėra žinutės)"}
      </div>

      {/* AI Analysis */}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Panel title="Kodėl tai nutinka" tone="amber">
          <p className="text-sm text-white/80">{analysis.suspected_cause || "—"}</p>
        </Panel>
        <Panel title="Failas" tone="violet">
          <div className="flex items-center gap-2 font-mono text-sm text-violet-200">
            <FileCode className="h-4 w-4 shrink-0" />
            <span className="break-all">{analysis.suggested_file || "unknown"}</span>
          </div>
        </Panel>
      </div>

      <Panel title="Kaip pataisyti" tone="cyan" className="mt-3">
        <pre className="whitespace-pre-wrap text-sm text-white/85 leading-relaxed font-sans">
          {analysis.suggested_fix || "—"}
        </pre>
      </Panel>

      {/* Super prompt */}
      <div className="mt-4 rounded-xl border border-violet-400/30 bg-gradient-to-br from-violet-600/15 to-fuchsia-600/10 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-violet-200">
            <Sparkles className="h-4 w-4" />
            Super-promptas Lovable agentui
          </div>
          <button
            onClick={copyPrompt}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              copied
                ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/50"
                : "bg-violet-500 text-white hover:bg-violet-400 shadow-lg shadow-violet-500/30"
            }`}
          >
            {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Nukopijuota" : "Kopijuoti promptą"}
          </button>
        </div>
        <div className="rounded-lg bg-black/40 p-3 text-sm text-white/85 leading-relaxed max-h-48 overflow-y-auto">
          {superPrompt}
        </div>
        <p className="mt-2 text-[11px] text-white/40">
          Įklijuok Lovable chat'e → agentas turės pilną kontekstą ir ištaisys bug'ą.
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-white/30">
        <code className="font-mono">{analysis.fingerprint.slice(0, 20)}…</code>
        <span>
          {analysis.model} · {analysis.tokens_used ?? 0} tok
        </span>
      </div>
    </motion.div>
  );
}

function Panel({
  title,
  children,
  tone,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  tone: "amber" | "violet" | "cyan";
  className?: string;
}) {
  const tones = {
    amber: "border-amber-400/20 bg-amber-500/5",
    violet: "border-violet-400/20 bg-violet-500/5",
    cyan: "border-cyan-400/20 bg-cyan-500/5",
  };
  return (
    <div className={`rounded-xl border ${tones[tone]} p-3 ${className}`}>
      <div className="text-[11px] uppercase tracking-wider text-white/50 mb-1.5">{title}</div>
      {children}
    </div>
  );
}

function buildFallbackPrompt(a: Analysis): string {
  return `Ištaisyk šitą klaidą "Socialinės Valandos" projekte.

Klaida: ${a.error_message ?? "(žinutės nėra)"}
Failas (hipotezė): ${a.suggested_file ?? "unknown"}
Fingerprint: ${a.fingerprint}
Sunkumas: ${a.severity_estimate ?? "medium"}

Priežastis: ${a.suspected_cause ?? "unknown"}

Ką reikia padaryti:
${a.suggested_fix ?? "Ištirk klaidą ir pasiūlyk pataisymą."}

Prašau: (1) surask failą, (2) pataisyk kodą, (3) parašyk kaip patikrinti kad veikia, (4) neįvesk regresijos.`;
}
