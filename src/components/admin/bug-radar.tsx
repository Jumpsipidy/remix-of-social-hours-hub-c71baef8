// Bug Radar — a one-glance "what is broken right now" panel for /admin/errors.
// Answers 4 questions instantly: ar blogėja? kur? kam? ką daryti pirma?
import { useMemo } from "react";
import { Activity, ArrowDownRight, ArrowUpRight, Minus, MapPin, UserRound, Wifi, Timer, ShieldAlert } from "lucide-react";

export type RadarRow = {
  id: string;
  created_at: string;
  action: string;
  user_id: string | null;
  meta: any;
};

const CRITICAL_ACTIONS = new Set(["client.error", "app.critical"]);

const SOURCE_LABEL: Record<string, string> = {
  "fetch.4xx": "API atmetė užklausą",
  "fetch.5xx": "Serverio klaida",
  "fetch.slow": "Lėtas API",
  "fetch.network": "Tinklo lūžis",
  "ui.freeze": "UI užšalo",
  "net.offline": "Dingo internetas",
  "rage-click": "Rage click",
  "console.error": "Console klaida",
  "resource.error": "Neįsikėlė failas",
};

function minutesAgo(iso: string) {
  return (Date.now() - new Date(iso).getTime()) / 60_000;
}

function topOf(map: Map<string, number>) {
  let best: [string, number] | null = null;
  for (const e of map) if (!best || e[1] > best[1]) best = e;
  return best;
}

export function BugRadar({ rows, onFocusRoute }: { rows: RadarRow[]; onFocusRoute?: (path: string) => void }) {
  const r = useMemo(() => {
    const recent = rows.filter((x) => minutesAgo(x.created_at) <= 15);
    const prev = rows.filter((x) => {
      const m = minutesAgo(x.created_at);
      return m > 15 && m <= 30;
    });

    const routes = new Map<string, number>();
    const users = new Map<string, number>();
    const sources = new Map<string, number>();
    for (const x of recent) {
      const p = String(x.meta?.path ?? "—");
      routes.set(p, (routes.get(p) ?? 0) + 1);
      if (x.user_id) users.set(x.user_id, (users.get(x.user_id) ?? 0) + 1);
      const s = String(x.meta?.source ?? "runtime");
      sources.set(s, (sources.get(s) ?? 0) + 1);
    }

    const delta = recent.length - prev.length;
    const trend: "up" | "down" | "flat" = delta > 1 ? "up" : delta < -1 ? "down" : "flat";
    const affected = new Set(recent.filter((x) => x.user_id).map((x) => x.user_id)).size;
    const critical = recent.filter((x) => CRITICAL_ACTIONS.has(x.action)).length;

    const verdict =
      critical >= 3 || affected >= 3
        ? { tone: "rose" as const, text: "Gedimas vyksta DABAR", hint: "Keli vartotojai paliesti per 15 min." }
        : recent.length > 0
          ? { tone: "amber" as const, text: "Yra aktyvių klaidų", hint: "Ne krizė, bet kažkas lūžta." }
          : { tone: "emerald" as const, text: "Švaru", hint: "Jokių klaidų per 15 min." };

    return {
      recent: recent.length,
      prev: prev.length,
      trend,
      delta,
      affected,
      critical,
      verdict,
      topRoute: topOf(routes),
      topUser: topOf(users),
      topSource: topOf(sources),
      slow: recent.filter((x) => x.meta?.source === "fetch.slow").length,
      freeze: recent.filter((x) => x.meta?.source === "ui.freeze").length,
      offline: recent.filter((x) => x.meta?.source === "net.offline").length,
      api4xx: recent.filter((x) => x.meta?.source === "fetch.4xx").length,
    };
  }, [rows]);

  const toneRing =
    r.verdict.tone === "rose"
      ? "border-rose-500/40 bg-rose-500/[0.07]"
      : r.verdict.tone === "amber"
        ? "border-amber-400/40 bg-amber-400/[0.06]"
        : "border-emerald-400/35 bg-emerald-400/[0.05]";
  const toneText =
    r.verdict.tone === "rose" ? "text-rose-300" : r.verdict.tone === "amber" ? "text-amber-300" : "text-emerald-300";

  const TrendIcon = r.trend === "up" ? ArrowUpRight : r.trend === "down" ? ArrowDownRight : Minus;
  const trendTone = r.trend === "up" ? "text-rose-300" : r.trend === "down" ? "text-emerald-300" : "text-muted-foreground";

  return (
    <div className={`rounded-2xl border p-4 backdrop-blur ${toneRing}`}>
      <div className="flex flex-wrap items-center gap-3">
        <span className={`relative flex h-2.5 w-2.5 ${r.verdict.tone === "rose" ? "" : ""}`}>
          <span className={`absolute inline-flex h-full w-full rounded-full ${toneText.replace("text-", "bg-")} ${r.verdict.tone === "rose" ? "animate-ping opacity-75" : "opacity-40"}`} />
          <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${toneText.replace("text-", "bg-")}`} />
        </span>
        <div className="min-w-0">
          <div className={`text-sm font-black tracking-tight ${toneText}`}>{r.verdict.text}</div>
          <div className="text-[11px] text-muted-foreground">{r.verdict.hint}</div>
        </div>

        <div className="ml-auto flex items-center gap-4">
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">15 min</div>
            <div className="flex items-center gap-1 text-lg font-black tabular-nums">
              {r.recent}
              <TrendIcon className={`h-4 w-4 ${trendTone}`} />
              <span className={`text-xs font-bold ${trendTone}`}>
                {r.delta > 0 ? `+${r.delta}` : r.delta}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Vartotojų</div>
            <div className="text-lg font-black tabular-nums">{r.affected}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Kritinių</div>
            <div className={`text-lg font-black tabular-nums ${r.critical ? "text-rose-300" : ""}`}>{r.critical}</div>
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <RadarFact
          icon={MapPin}
          label="Labiausiai kenčia"
          value={r.topRoute ? `${r.topRoute[0]} · ${r.topRoute[1]}×` : "—"}
          onClick={r.topRoute && onFocusRoute ? () => onFocusRoute(r.topRoute![0]) : undefined}
        />
        <RadarFact
          icon={UserRound}
          label="Daugiausiai gauna"
          value={r.topUser ? `${r.topUser[0].slice(0, 8)}… · ${r.topUser[1]}×` : "—"}
        />
        <RadarFact
          icon={Activity}
          label="Pagrindinis šaltinis"
          value={r.topSource ? `${SOURCE_LABEL[r.topSource[0]] ?? r.topSource[0]} · ${r.topSource[1]}×` : "—"}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
        <Signal icon={ShieldAlert} n={r.api4xx} label="API atmetimai" tone="rose" />
        <Signal icon={Timer} n={r.slow} label="lėti API (>9s)" tone="amber" />
        <Signal icon={Activity} n={r.freeze} label="UI užšalimai" tone="fuchsia" />
        <Signal icon={Wifi} n={r.offline} label="ryšio dingimai" tone="cyan" />
      </div>
    </div>
  );
}

function RadarFact({
  icon: Icon,
  label,
  value,
  onClick,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  onClick?: () => void;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-left ${onClick ? "transition hover:border-primary/50 hover:bg-primary/5" : ""}`}
    >
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
        <div className="truncate text-xs font-semibold">{value}</div>
      </div>
    </Comp>
  );
}

function Signal({
  icon: Icon,
  n,
  label,
  tone,
}: {
  icon: typeof Activity;
  n: number;
  label: string;
  tone: "rose" | "amber" | "fuchsia" | "cyan";
}) {
  const cls = n
    ? {
        rose: "border-rose-500/40 bg-rose-500/10 text-rose-300",
        amber: "border-amber-400/40 bg-amber-400/10 text-amber-300",
        fuchsia: "border-fuchsia-400/40 bg-fuchsia-400/10 text-fuchsia-300",
        cyan: "border-cyan-400/40 bg-cyan-400/10 text-cyan-300",
      }[tone]
    : "border-border/60 bg-background/40 text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold ${cls}`}>
      <Icon className="h-3 w-3" /> {n} {label}
    </span>
  );
}
