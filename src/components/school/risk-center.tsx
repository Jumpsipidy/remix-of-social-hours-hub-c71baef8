import { useMemo, useState } from "react";
import { AlertTriangle, ShieldAlert, TrendingDown, CalendarX, Search, FileSearch } from "lucide-react";
import { highestSeverity, type FraudFlag } from "@/lib/fraud-flags";

type Row = {
  student: { id: string; full_name: string | null; class_year: string | null };
  flags: FraudFlag[];
  reservations: unknown[];
  progress: number;
  score: number;
};

type Kind = "all" | "fraud" | "slow" | "none";

const SEV = {
  high: { label: "Aukšta", cls: "bg-destructive/12 text-destructive border-destructive/30" },
  medium: { label: "Vidutinė", cls: "bg-warning/15 text-warning border-warning/30" },
  low: { label: "Žema", cls: "bg-muted text-muted-foreground border-border" },
  none: { label: "Progresas", cls: "bg-primary/10 text-primary border-primary/25" },
} as const;

export function RiskCenter({ rows, onAudit }: { rows: Row[]; onAudit: (s: any) => void }) {
  const [kind, setKind] = useState<Kind>("all");
  const [q, setQ] = useState("");
  const [cls, setCls] = useState<string | null>(null);

  const stats = useMemo(() => ({
    fraud: rows.filter((r) => r.flags.length > 0).length,
    high: rows.filter((r) => highestSeverity(r.flags) === "high").length,
    slow: rows.filter((r) => r.progress < 35).length,
    none: rows.filter((r) => r.reservations.length === 0).length,
  }), [rows]);

  const classes = useMemo(() => Array.from(new Set(rows.map((r) => r.student.class_year).filter(Boolean))).sort() as string[], [rows]);

  const shown = rows.filter((r) => {
    if (kind === "fraud" && r.flags.length === 0) return false;
    if (kind === "slow" && r.progress >= 35) return false;
    if (kind === "none" && r.reservations.length !== 0) return false;
    if (cls && r.student.class_year !== cls) return false;
    return !q || (r.student.full_name ?? "").toLowerCase().includes(q.toLowerCase());
  });

  const tiles: { k: Kind; label: string; value: number; icon: any; hint: string }[] = [
    { k: "fraud", label: "Įtartini signalai", value: stats.fraud, icon: ShieldAlert, hint: `${stats.high} aukštos rizikos` },
    { k: "slow", label: "Atsilieka", value: stats.slow, icon: TrendingDown, hint: "mažiau nei 35 % valandų" },
    { k: "none", label: "Be rezervacijų", value: stats.none, icon: CalendarX, hint: "dar nepradėjo" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {tiles.map((t) => (
          <button
            key={t.k}
            type="button"
            onClick={() => setKind(kind === t.k ? "all" : t.k)}
            className={`rounded-2xl border p-4 text-left transition active:scale-[0.99] ${kind === t.k ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">{t.label}</span>
              <t.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 font-display text-3xl font-bold tabular-nums">{t.value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{t.hint}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="flex h-10 flex-1 items-center gap-2 rounded-xl border border-border bg-background px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ieškoti mokinio…" className="w-full bg-transparent text-sm outline-none" />
        </label>
        {classes.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto">
            <button type="button" onClick={() => setCls(null)} className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold ${!cls ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>Visos</button>
            {classes.map((c) => (
              <button key={c} type="button" onClick={() => setCls(c)} className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold ${cls === c ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{c}</button>
            ))}
          </div>
        )}
      </div>

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium">Šiame filtre rizikos nėra</p>
          <p className="text-xs text-muted-foreground">Mokiniai juda pagal planą.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="hidden grid-cols-[minmax(0,1.6fr)_90px_minmax(0,1fr)_minmax(0,1.6fr)_96px] gap-4 border-b border-border px-4 py-2.5 text-xs font-semibold text-muted-foreground md:grid">
            <span>Mokinys</span><span>Lygis</span><span>Progresas</span><span>Signalai</span><span />
          </div>
          <ul className="divide-y divide-border">
            {shown.map(({ student, flags, reservations, progress }) => {
              const sev = highestSeverity(flags);
              const s = SEV[sev];
              return (
                <li key={student.id} className="grid gap-3 px-4 py-3.5 md:grid-cols-[minmax(0,1.6fr)_90px_minmax(0,1fr)_minmax(0,1.6fr)_96px] md:items-center md:gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{student.full_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{student.class_year ?? "—"} kl. · {reservations.length} rezerv.</p>
                  </div>
                  <span className={`w-fit rounded-md border px-2 py-0.5 text-[11px] font-semibold ${s.cls}`}>{s.label}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className={`h-full ${progress < 35 ? "bg-warning" : "bg-primary"}`} style={{ width: `${progress}%` }} />
                    </div>
                    <span className="w-10 text-right text-xs font-semibold tabular-nums">{progress}%</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {flags.slice(0, 3).map((f, i) => (
                      <span key={f.code + i} className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-foreground">{f.label}</span>
                    ))}
                    {flags.length > 3 && <span className="text-[11px] text-muted-foreground">+{flags.length - 3}</span>}
                    {flags.length === 0 && <span className="text-xs text-muted-foreground">{reservations.length === 0 ? "Nėra rezervacijų" : "Lėtas progresas"}</span>}
                  </div>
                  <button type="button" onClick={() => onAudit(student)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold hover:bg-muted">
                    <FileSearch className="h-3.5 w-3.5" /> Peržiūrėti
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
