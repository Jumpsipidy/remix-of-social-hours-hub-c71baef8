import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, RefreshCw, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/notfound")({
  ssr: false,
  head: () => ({ meta: [{ title: "404 diagnostika — Admin" }] }),
  component: NotFoundDiagnostics,
});

type Row = {
  id: string;
  created_at: string;
  user_id: string | null;
  meta: { path?: string; referrer?: string | null; user_agent?: string } | null;
};

function NotFoundDiagnostics() {
  const { role } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [since, setSince] = useState<"24h" | "7d" | "30d">("7d");

  async function load() {
    setLoading(true);
    const hours = since === "24h" ? 24 : since === "7d" ? 24 * 7 : 24 * 30;
    const cutoff = new Date(Date.now() - hours * 3600_000).toISOString();
    const { data } = await supabase
      .from("activity_log")
      .select("id, created_at, user_id, meta")
      .eq("action", "route.404")
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(500);
    setRows((data as unknown as Row[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [since]);

  const grouped = useMemo(() => {
    const m = new Map<string, { path: string; count: number; last: string; referrers: Set<string> }>();
    for (const r of rows) {
      const path = r.meta?.path ?? "(unknown)";
      const cur = m.get(path) ?? { path, count: 0, last: r.created_at, referrers: new Set<string>() };
      cur.count += 1;
      if (r.created_at > cur.last) cur.last = r.created_at;
      if (r.meta?.referrer) cur.referrers.add(r.meta.referrer);
      m.set(path, cur);
    }
    return Array.from(m.values()).sort((a, b) => b.count - a.count);
  }, [rows]);

  if (role !== "admin") {
    return <div className="p-6 text-sm text-muted-foreground">Reikia super admin teisių.</div>;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-amber-500/30 to-rose-500/30 ring-1 ring-amber-500/40">
            <AlertTriangle className="h-5 w-5 text-amber-200" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">404 diagnostika</h1>
            <p className="text-xs text-muted-foreground">Sulaužytos nuorodos ir dingę puslapiai — iš `activity_log` (`route.404`)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-border/50 bg-background/60 p-1 text-xs">
            {(["24h", "7d", "30d"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setSince(k)}
                className={`rounded-md px-3 py-1.5 transition ${since === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >{k}</button>
            ))}
          </div>
          <button onClick={() => void load()} className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-background/60 px-3 py-1.5 text-xs hover:bg-background">
            <RefreshCw className="h-3.5 w-3.5" /> Atnaujinti
          </button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Iš viso 404" value={rows.length} />
        <StatCard label="Unikalūs URL" value={grouped.length} />
        <StatCard label="Su referreriu" value={rows.filter((r) => r.meta?.referrer).length} />
        <StatCard label="Autentifikuoti" value={rows.filter((r) => r.user_id).length} />
      </section>

      <section className="overflow-hidden rounded-2xl border border-border/50 bg-background/40 backdrop-blur">
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
          <h2 className="text-sm font-semibold">Top sulaužyti puslapiai</h2>
          {loading && <span className="text-xs text-muted-foreground">Kraunama…</span>}
        </div>
        {grouped.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {loading ? "…" : "Nėra 404 klaidų per pasirinktą laikotarpį 🎉"}
          </div>
        ) : (
          <ul className="divide-y divide-border/40">
            {grouped.map((g) => (
              <li key={g.path} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-white/5">
                <span className="grid h-8 min-w-[2.5rem] place-items-center rounded-md bg-rose-500/20 px-2 text-sm font-bold text-rose-200">
                  {g.count}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-mono text-sm">{g.path}</div>
                  <div className="text-[11px] text-muted-foreground">
                    Paskutinį kartą: {new Date(g.last).toLocaleString("lt-LT")}
                    {g.referrers.size > 0 && ` · ${g.referrers.size} referrer(-ių)`}
                  </div>
                </div>
                <a
                  href={g.path}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-border/50 bg-background/60 px-2 py-1 text-[11px] hover:bg-background"
                >
                  Atidaryti <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-border/50 bg-background/40 backdrop-blur">
        <div className="border-b border-border/50 px-4 py-3">
          <h2 className="text-sm font-semibold">Paskutinės 404 (raw)</h2>
        </div>
        <ul className="max-h-[420px] divide-y divide-border/40 overflow-y-auto">
          {rows.slice(0, 100).map((r) => (
            <li key={r.id} className="grid grid-cols-[auto_1fr] gap-3 px-4 py-2 text-xs">
              <span className="tabular-nums text-muted-foreground">
                {new Date(r.created_at).toLocaleTimeString("lt-LT")}
              </span>
              <div className="min-w-0">
                <div className="truncate font-mono">{r.meta?.path ?? "(unknown)"}</div>
                {r.meta?.referrer && (
                  <div className="truncate text-[10px] text-muted-foreground">← {r.meta.referrer}</div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-background/40 p-4 backdrop-blur">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}
