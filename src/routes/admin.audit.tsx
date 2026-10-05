import { csvCell } from "@/lib/csv-safe";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { ACTION_LABELS } from "@/lib/activity-log";
import { Search, Download, Terminal, Circle, Play, Pause } from "lucide-react";

export const Route = createFileRoute("/admin/audit")({ component: AuditPage });

type Row = {
  id: string;
  user_id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  meta: Record<string, unknown>;
  created_at: string;
};
type ProfileLite = { id: string; full_name: string | null; email: string | null; role: string | null; organization_name: string | null };

// Terminal / syslog aesthetic — mono type, LED status, tail -f feel.
function AuditPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [q, setQ] = useState("");
  const [action, setAction] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [tick, setTick] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const { data } = await supabase
      .from("activity_log").select("*").order("created_at", { ascending: false }).limit(500);
    const list = (data as Row[]) ?? [];
    setRows(list);
    const ids = Array.from(new Set(list.map((r) => r.user_id).filter((v): v is string => !!v)));
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("id, full_name, email, role, organization_name").in("id", ids);
      const m: Record<string, ProfileLite> = {};
      (ps as ProfileLite[] | null)?.forEach((p) => (m[p.id] = p));
      setProfiles(m);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => { load(); setTick((n) => n + 1); }, 8000);
    return () => clearInterval(t);
  }, [paused]);

  const actions = useMemo(() => Array.from(new Set(rows.map((r) => r.action))).sort(), [rows]);

  const shown = rows.filter((r) => {
    if (action !== "all" && r.action !== action) return false;
    if (!q.trim()) return true;
    const term = q.toLowerCase();
    const p = profiles[r.user_id];
    return (
      r.action.toLowerCase().includes(term) ||
      p?.full_name?.toLowerCase().includes(term) ||
      p?.email?.toLowerCase().includes(term) ||
      p?.organization_name?.toLowerCase().includes(term) ||
      JSON.stringify(r.meta).toLowerCase().includes(term)
    );
  });

  const exportCsv = () => {
    const header = ["ts", "user", "email", "role", "action", "entity", "meta"];
    const lines = shown.map((r) => {
      const p = profiles[r.user_id];
      return [new Date(r.created_at).toISOString(), p?.full_name ?? p?.organization_name ?? "", p?.email ?? "", p?.role ?? "", r.action, r.entity_type ?? "", JSON.stringify(r.meta)]
        .map(csvCell).join(",");
    });
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `audit-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const toneColor = (tone?: string) =>
    tone === "ok" ? "text-emerald-400" : tone === "warn" ? "text-amber-400" : tone === "bad" ? "text-rose-400" : "text-cyan-300";
  const toneDot = (tone?: string) =>
    tone === "ok" ? "bg-emerald-400" : tone === "warn" ? "bg-amber-400" : tone === "bad" ? "bg-rose-400" : "bg-cyan-400";

  const now = Date.now();
  const last1m = rows.filter((r) => now - new Date(r.created_at).getTime() < 60_000).length;
  const last1h = rows.filter((r) => now - new Date(r.created_at).getTime() < 3_600_000).length;
  const errs = rows.filter((r) => ACTION_LABELS[r.action]?.tone === "bad").length;

  return (
    <div className="space-y-4 font-mono">
      {/* Terminal header bar */}
      <div className="overflow-hidden rounded-xl border border-emerald-500/30 bg-black/70 shadow-[0_0_60px_-20px_rgba(16,185,129,0.4)] backdrop-blur-xl">
        <div className="flex items-center gap-2 border-b border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-[11px] text-emerald-300/80">
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
          </span>
          <Terminal className="ml-2 h-3.5 w-3.5" />
          <span className="font-semibold tracking-wider">root@svalandos:/var/log/activity$ tail -f</span>
          <span className="ml-auto tabular-nums">{new Date().toLocaleTimeString("lt-LT")} · tick #{tick}</span>
        </div>
        <div className="grid gap-0 sm:grid-cols-4 sm:divide-x sm:divide-emerald-500/10">
          <LedStat label="ĮRAŠAI" value={rows.length} accent="emerald" />
          <LedStat label="1 MIN" value={last1m} accent="cyan" pulse={last1m > 0} />
          <LedStat label="1 VAL" value={last1h} accent="amber" />
          <LedStat label="ERR" value={errs} accent={errs > 0 ? "rose" : "muted"} />
        </div>
      </div>

      {/* Command bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-500/25 bg-black/60 p-2 text-xs backdrop-blur-xl">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-emerald-500/20 bg-black/50 px-2">
          <span className="text-emerald-400">grep</span>
          <Search className="h-3.5 w-3.5 text-emerald-400/60" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="pattern..."
            className="h-9 flex-1 bg-transparent text-emerald-100 caret-emerald-400 outline-none placeholder:text-emerald-500/40" />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-emerald-500/20 bg-black/50 px-2">
          <span className="text-emerald-400">--action=</span>
          <select value={action} onChange={(e) => setAction(e.target.value)} className="h-9 bg-transparent text-emerald-100 outline-none">
            <option value="all" className="bg-black">*</option>
            {actions.map((a) => <option key={a} value={a} className="bg-black">{a}</option>)}
          </select>
        </div>
        <button onClick={() => setPaused((p) => !p)}
          className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 font-semibold ${paused ? "border-amber-500/40 bg-amber-500/10 text-amber-300" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"}`}>
          {paused ? <><Play className="h-3 w-3" /> RESUME</> : <><Pause className="h-3 w-3" /> PAUSE</>}
        </button>
        <button onClick={exportCsv} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 font-semibold text-emerald-300 hover:bg-emerald-500/20">
          <Download className="h-3 w-3" /> DUMP
        </button>
        <span className="rounded-lg border border-emerald-500/20 bg-black/50 px-2 py-1 tabular-nums text-emerald-400/70">
          [{shown.length}/{rows.length}]
        </span>
      </div>

      {/* Log stream */}
      <div ref={scrollerRef} className="max-h-[70vh] overflow-y-auto rounded-xl border border-emerald-500/25 bg-black/70 p-3 text-[12.5px] leading-relaxed backdrop-blur-xl">
        {loading && <p className="py-6 text-center text-emerald-500/60">connecting to stream...</p>}
        {!loading && shown.length === 0 && <p className="py-6 text-center text-emerald-500/50">-- no matching lines --</p>}
        <div className="space-y-0.5">
          {shown.slice(0, 200).map((r, i) => {
            const p = profiles[r.user_id];
            const info = ACTION_LABELS[r.action];
            const ts = new Date(r.created_at);
            const timeStr = ts.toLocaleTimeString("lt-LT", { hour12: false });
            const dateStr = ts.toLocaleDateString("lt-LT");
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.005, 0.3), duration: 0.15 }}
                className="group grid grid-cols-[auto_auto_1fr] items-start gap-2 rounded px-1.5 py-1 hover:bg-emerald-500/5"
              >
                <span className="tabular-nums text-emerald-500/50">
                  {dateStr} <span className="text-emerald-300">{timeStr}</span>
                </span>
                <span className={`inline-flex items-center gap-1 whitespace-nowrap ${toneColor(info?.tone)}`}>
                  <Circle className={`h-1.5 w-1.5 fill-current`} />
                  <span className={`h-1.5 w-1.5 rounded-full ${toneDot(info?.tone)} shadow-[0_0_6px_currentColor]`} />
                  [{(info?.label ?? r.action).toUpperCase().slice(0, 18).padEnd(18, " ")}]
                </span>
                <span className="min-w-0 break-words text-emerald-100/90">
                  user=<span className="text-cyan-300">{p?.full_name ?? p?.organization_name ?? p?.email ?? "anon"}</span>
                  {p?.role && <> role=<span className="text-fuchsia-300">{p.role}</span></>}
                  {r.entity_type && <> entity=<span className="text-amber-300">{r.entity_type}</span></>}
                  {Object.keys(r.meta ?? {}).length > 0 && (
                    <> meta=<span className="text-emerald-300/70">{JSON.stringify(r.meta)}</span></>
                  )}
                </span>
              </motion.div>
            );
          })}
          {!loading && shown.length > 0 && (
            <div className="flex items-center gap-2 px-1.5 pt-2 text-emerald-400/70">
              <span className="text-emerald-400">$</span>
              <span className="inline-block h-3 w-1.5 animate-pulse bg-emerald-400" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LedStat({ label, value, accent, pulse }: { label: string; value: number; accent: "emerald" | "cyan" | "amber" | "rose" | "muted"; pulse?: boolean }) {
  const colors: Record<string, string> = {
    emerald: "text-emerald-300",
    cyan: "text-cyan-300",
    amber: "text-amber-300",
    rose: "text-rose-300",
    muted: "text-muted-foreground",
  };
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div>
        <p className="text-[10px] font-semibold tracking-[0.25em] text-emerald-500/70">{label}</p>
        <p className={`font-display text-2xl font-bold tabular-nums ${colors[accent]} ${pulse ? "animate-pulse" : ""}`}>
          {String(value).padStart(4, "0")}
        </p>
      </div>
      <div className={`h-6 w-1.5 rounded-full ${accent === "muted" ? "bg-muted-foreground/30" : `bg-current ${colors[accent]}`} shadow-[0_0_10px_currentColor]`} />
    </div>
  );
}
