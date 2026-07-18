import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  adminPurgeOldMessages,
  adminWipeAllReservations,
  adminWipeAllTasks,
  adminPlatformHealth,
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
} from "lucide-react";

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
};

export const Route = createFileRoute("/admin/tools")({
  component: ToolsPage,
});

function ToolsPage() {
  const purge = useServerFn(adminPurgeOldMessages);
  const wipeRes = useServerFn(adminWipeAllReservations);
  const wipeTasks = useServerFn(adminWipeAllTasks);
  const health = useServerFn(adminPlatformHealth);
  const [busy, setBusy] = useState<string | null>(null);
  const [snap, setSnap] = useState<Record<string, unknown> | null>(null);

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
                return (
                  <div key={k} className="group relative overflow-hidden rounded-2xl border border-border bg-background/60 p-4 transition hover:border-primary/40 hover:shadow-glow">
                    <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${meta.tone} opacity-60`} />
                    <div className="relative">
                      <div className="flex items-center justify-between">
                        <div className="grid h-10 w-10 place-items-center rounded-xl bg-background/80 shadow-sm">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <span className="rounded-full bg-background/80 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">{k}</span>
                      </div>
                      <p className="mt-4 font-display text-3xl font-bold tabular-nums">{count.toLocaleString("lt-LT")}</p>
                      <p className="text-xs font-semibold text-muted-foreground">{meta.label}</p>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border/50">
                        <div
                          className="h-full rounded-full bg-gradient-primary transition-[width] duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
