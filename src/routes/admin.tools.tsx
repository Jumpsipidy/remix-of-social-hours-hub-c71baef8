import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AnimatePresence, motion } from "framer-motion";
import {
  adminPurgeOldMessages,
  adminWipeAllReservations,
  adminWipeAllTasks,
  adminPlatformHealth,
  adminTableSample,
  adminDeepHealth,
  adminExportAllData,
} from "@/lib/admin-delete.functions";
import { toast } from "sonner";
import {
  Wrench,
  Activity,
  MessageSquare,
  ClipboardList,
  ListTodo,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Database,
  Users,
  Building2,
  School,
  Bug,
  MessagesSquare,
  KeyRound,
  CheckCircle2,
  FileText,
  X,
  Search,
  Eye,
  Zap,
  Download,
} from "lucide-react";
import { CertificateButton } from "@/components/certificate-button";
import { CelebrationSimulator } from "@/components/admin/celebration-simulator";


const TABLE_META: Record<string, { label: string; icon: typeof Database; tone: string }> = {
  profiles: { label: "Profiliai", icon: Users, tone: "from-blue-500/30 to-blue-500/5" },
  reservations: { label: "Rezervacijos", icon: ClipboardList, tone: "from-emerald-500/30 to-emerald-500/5" },
  tasks: { label: "Užduotys", icon: ListTodo, tone: "from-amber-500/30 to-amber-500/5" },
  messages: { label: "Žinutės", icon: MessagesSquare, tone: "from-purple-500/30 to-purple-500/5" },
  chat_rooms: { label: "Pokalbių kambariai", icon: MessageSquare, tone: "from-pink-500/30 to-pink-500/5" },
  schools: { label: "Mokyklos", icon: School, tone: "from-cyan-500/30 to-cyan-500/5" },
  bug_reports: { label: "Bug reports", icon: Bug, tone: "from-red-500/30 to-red-500/5" },
  organization_access_requests: { label: "Org. užklausos", icon: Building2, tone: "from-indigo-500/30 to-indigo-500/5" },
  user_roles: { label: "Rolės", icon: KeyRound, tone: "from-fuchsia-500/30 to-fuchsia-500/5" },
  site_settings: { label: "Svetainės nustatymai", icon: Wrench, tone: "from-emerald-500/30 to-emerald-500/5" },
};

export const Route = createFileRoute("/admin/tools")({
  component: ToolsPage,
});

function ToolsPage() {
  const purge = useServerFn(adminPurgeOldMessages);
  const wipeRes = useServerFn(adminWipeAllReservations);
  const wipeTasks = useServerFn(adminWipeAllTasks);
  const health = useServerFn(adminPlatformHealth);
  const deepHealth = useServerFn(adminDeepHealth);
  const exportAll = useServerFn(adminExportAllData);
  const sample = useServerFn(adminTableSample);
  const [busy, setBusy] = useState<string | null>(null);
  const [snap, setSnap] = useState<Record<string, unknown> | null>(null);
  const [deep, setDeep] = useState<null | {
    tables: { table: string; count: number; ms: number; ok: boolean; error: string | null }[];
    recent_critical_24h: number;
    generated_at: string;
  }>(null);
  const [inspect, setInspect] = useState<null | { table: string; rows: any[]; total: number; loading: boolean }>(null);

  const openInspector = async (table: string) => {
    setInspect({ table, rows: [], total: 0, loading: true });
    try {
      const r = (await sample({ data: { table, limit: 100 } })) as { rows: any[]; total: number };
      setInspect({ table, rows: r.rows, total: r.total, loading: false });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nepavyko įkelti");
      setInspect(null);
    }
  };

  const run = async (key: string, fn: () => Promise<unknown>, confirmMsg?: string) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusy(key);
    try {
      const r = (await fn()) as Record<string, unknown>;
      if (key === "health") {
        setSnap(r);
        toast.success("Ataskaita paruošta");
      } else {
        toast.success(`${key}: ${JSON.stringify(r)}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Klaida");
    } finally {
      setBusy(null);
    }
  };
  
  const handleExport = async () => {
    setBusy("export");
    try {
      const data = await exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `socialines-valandos-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Atsarginė kopija paruošta ir atsiųsta");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nepavyko eksportuoti");
    } finally {
      setBusy(null);
    }
  };

  const actions = [
    {
      key: "health",
      label: "DB sveikatos patikra",
      desc: "Suskaičiuoja įrašus visose lentelėse ir parodo momentinį suvestinį vaizdą.",
      icon: Activity,
      variant: "default" as const,
      run: () => run("health", () => health()),
    },
    {
      key: "export",
      label: "Eksportuoti VISUS duomenis",
      desc: "Sugeneruoja pilną JSON kopiją su visais mokiniais, rezervacijomis, mokyklomis ir žinutėmis.",
      icon: Download,
      variant: "default" as const,
      run: handleExport,
    },
    {
      key: "deep",
      label: "Giluminis sveikatos skenavimas",
      desc: "Patikrina kiekvienos kritinės lentelės pasiekiamumą, delsą (ms) ir 24h kritinių klaidų skaičių.",
      icon: Zap,
      variant: "default" as const,
      run: async () => {
        setBusy("deep");
        try {
          const r = (await deepHealth()) as any;
          setDeep(r);
          toast.success(`Skenavimas baigtas · ${r.tables.length} lentelės`);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Klaida");
        } finally {
          setBusy(null);
        }
      },
    },
    {
      key: "purge",
      label: "Išvalyti senas žinutes (12 d.)",
      desc: "Ištrina visas žinutes senesnes nei 12 dienų. Naudinga prieš auditą.",
      icon: MessageSquare,
      variant: "default" as const,
      run: () =>
        run("purge", () => purge(), "Ištrinti visas žinutes senesnes nei 12 dienų?"),
    },
    {
      key: "res",
      label: "Trinti VISAS rezervacijas",
      desc: "Negrįžtama: ištrina absoliučiai visas rezervacijas iš DB.",
      icon: ClipboardList,
      variant: "danger" as const,
      run: () =>
        run("res", () => wipeRes(), "IŠTRINTI VISAS rezervacijas iš duomenų bazės?"),
    },
    {
      key: "tasks",
      label: "Trinti VISAS užduotis",
      desc: "Negrįžtama: ištrina visas organizacijų paskelbtas užduotis.",
      icon: ListTodo,
      variant: "danger" as const,
      run: () => run("tasks", () => wipeTasks(), "IŠTRINTI VISAS užduotis?"),
    },
    {
      key: "reload",
      label: "Perkrauti visus duomenis",
      desc: "Perkrauna esamą puslapį, kad pamatytum naujausius įrašus.",
      icon: RefreshCw,
      variant: "default" as const,
      run: () => window.location.reload(),
    },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 font-display text-3xl font-bold tracking-tight">
          <Wrench className="h-6 w-6 text-primary" /> Įrankiai
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Priežiūros veiksmai. Raudonai pažymėti — negrįžtami.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {actions.map((a) => {
          const isBusy = busy === a.key;
          const isDanger = a.variant === "danger";
          const Icon = a.icon;
          return (
            <div
              key={a.key}
              className={`rounded-2xl border p-5 shadow-md backdrop-blur ${
                isDanger
                  ? "border-destructive/40 bg-destructive/5"
                  : "border-border bg-card/70"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`grid h-10 w-10 place-items-center rounded-xl ${
                    isDanger
                      ? "bg-destructive/15 text-destructive"
                      : "bg-gradient-primary text-primary-foreground shadow-glow"
                  }`}
                >
                  {isDanger ? <AlertTriangle className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{a.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{a.desc}</p>
                </div>
              </div>
              <button
                onClick={() => void a.run()}
                disabled={!!busy}
                className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
                  isDanger
                    ? "bg-destructive text-destructive-foreground hover:opacity-90"
                    : "bg-gradient-primary text-primary-foreground shadow-glow"
                }`}
              >
                {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
                Vykdyti
              </button>
            </div>
          );
        })}
      </div>


      {/* Celebration animation sandbox */}
      <CelebrationSimulator />

      {/* PDF Certificate Testing */}
      <div className="rounded-3xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent p-6 shadow-md">

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/20 text-blue-300">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold">PDF sertifikatų testavimas</h3>
              <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
                Kaip super admin gali generuoti <b>Debug PDF</b> — QR kodas, HMAC parašas, viskas veikia,
                bet <b>neįrašoma</b> į <code>certificates</code> lentelę. Puikiai tinka testuoti be tikrų valandų.
                Vieša paaiškinimo puslapis: <a href="/verify" className="font-semibold text-blue-300 underline">/verify</a>.
              </p>
              <div className="mt-4">
                <CertificateButton />
              </div>
            </div>
          </div>
        </div>
      </div>


      {snap && (() => {
        const entries = Object.entries(snap).filter(([, v]) => typeof v === "number");
        const total = entries.reduce((a, [, v]) => a + Number(v), 0);
        const max = Math.max(...entries.map(([, v]) => Number(v)), 1);
        return (
          <div className="rounded-3xl border border-border bg-gradient-card p-6 shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 font-display text-xl font-bold">
                  <Database className="h-5 w-5 text-primary" /> DB sveikatos ataskaita
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Momentinė nuotrauka · {entries.length} lentelių · {total.toLocaleString("lt-LT")} įrašų
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1.5 text-xs font-semibold text-success">
                <CheckCircle2 className="h-3.5 w-3.5" /> Sistema veikia
              </span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {entries.map(([k, v]) => {
                const meta = TABLE_META[k] ?? { label: k, icon: Database, tone: "from-primary/20 to-primary/0" };
                const Icon = meta.icon;
                const count = Number(v);
                const pct = (count / max) * 100;
                const tableName = k === "access_requests" ? "organization_access_requests" : k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => openInspector(tableName)}
                    className="group relative overflow-hidden rounded-2xl border border-border bg-background/60 p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-glow"
                  >
                    <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${meta.tone} opacity-60`} />
                    <div className="relative">
                      <div className="flex items-center justify-between">
                        <div className="grid h-10 w-10 place-items-center rounded-xl bg-background/80 shadow-sm">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary opacity-0 transition group-hover:opacity-100">
                          <Eye className="h-3 w-3" /> Peržiūrėti
                        </span>
                      </div>
                      <p className="mt-4 font-display text-3xl font-bold tabular-nums">{count.toLocaleString("lt-LT")}</p>
                      <p className="text-xs font-semibold text-muted-foreground">{meta.label}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/70">{tableName}</p>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border/50">
                        <div
                          className="h-full rounded-full bg-gradient-primary transition-[width] duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {deep && (
        <div className="rounded-3xl border border-border bg-gradient-card p-6 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 font-display text-xl font-bold">
                <Zap className="h-5 w-5 text-amber-400" /> Giluminis skenavimas
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(deep.generated_at).toLocaleString("lt-LT")} · 24h kritinių: <b className={deep.recent_critical_24h > 0 ? "text-destructive" : "text-success"}>{deep.recent_critical_24h}</b>
              </p>
            </div>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${deep.tables.every(t => t.ok) ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
              {deep.tables.every(t => t.ok) ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
              {deep.tables.filter(t => t.ok).length}/{deep.tables.length} OK
            </span>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2">Lentelė</th>
                  <th className="px-3 py-2 text-right">Įrašai</th>
                  <th className="px-3 py-2 text-right">Delsa</th>
                  <th className="px-3 py-2 text-right">Būklė</th>
                  <th className="px-3 py-2 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {deep.tables.map((t) => (
                  <tr key={t.table} className="border-b border-border/60 hover:bg-accent/30">
                    <td className="px-3 py-2 font-mono text-xs">{t.table}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">{t.count.toLocaleString("lt-LT")}</td>
                    <td className={`px-3 py-2 text-right tabular-nums text-xs ${t.ms > 500 ? "text-destructive" : t.ms > 200 ? "text-amber-400" : "text-success"}`}>{t.ms}ms</td>
                    <td className="px-3 py-2 text-right">
                      {t.ok ? <span className="text-success">✓ OK</span> : <span className="text-destructive" title={t.error ?? ""}>✗ ERR</span>}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => openInspector(t.table)} className="rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20">
                        Peržiūrėti
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AnimatePresence>
        {inspect && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur"
            onClick={() => setInspect(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
              className="relative flex max-h-[85vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-border p-4">
                <div>
                  <h3 className="flex items-center gap-2 font-display text-lg font-bold">
                    <Database className="h-4 w-4 text-primary" />
                    <span className="font-mono">{inspect.table}</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {inspect.loading ? "Kraunama…" : `${inspect.rows.length} / ${inspect.total.toLocaleString("lt-LT")} įrašų (naujausi pirmi, max 100)`}
                  </p>
                </div>
                <button onClick={() => setInspect(null)} className="rounded-full p-2 hover:bg-accent">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                {inspect.loading ? (
                  <div className="flex h-40 items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : inspect.rows.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">Lentelė tuščia.</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-xs">
                      <thead className="bg-background/60">
                        <tr className="border-b border-border">
                          {Object.keys(inspect.rows[0]).map((col) => (
                            <th key={col} className="px-3 py-2 text-left font-mono font-semibold uppercase tracking-wider text-[10px] text-muted-foreground whitespace-nowrap">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {inspect.rows.map((row, i) => (
                          <tr key={i} className="border-b border-border/50 hover:bg-accent/30">
                            {Object.entries(row).map(([col, val]) => (
                              <td key={col} className="max-w-xs truncate px-3 py-2 font-mono text-[11px]" title={String(val ?? "")}>
                                {val === null ? <span className="text-muted-foreground/60">null</span>
                                  : typeof val === "object" ? <span className="text-primary">{JSON.stringify(val).slice(0, 60)}</span>
                                  : typeof val === "boolean" ? <span className={val ? "text-success" : "text-muted-foreground"}>{String(val)}</span>
                                  : String(val).length > 80 ? String(val).slice(0, 80) + "…"
                                  : String(val)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
