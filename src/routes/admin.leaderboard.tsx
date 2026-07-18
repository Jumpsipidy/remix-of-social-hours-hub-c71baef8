import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminLeaderboard } from "@/lib/admin-super.functions";
import { Trophy, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/leaderboard")({ component: Page });

type Row = Awaited<ReturnType<typeof adminLeaderboard>>["students"][number];

function Page() {
  const fn = useServerFn(adminLeaderboard);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = async () => {
    setLoading(true);
    try { const r = await fn(); setRows(r.students); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Klaida"); }
    finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, []);

  return (
    <div className="space-y-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            <Trophy className="h-6 w-6 shrink-0 text-primary" />
            <span className="truncate">Mokinių reitingas</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Top mokiniai pagal surinktas valandas.</p>
        </div>
        <button onClick={refresh} className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-2 text-xs font-semibold backdrop-blur hover:bg-accent">
          <RefreshCw className="h-3 w-3" />
        </button>
      </header>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card/70 backdrop-blur">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Mokinys</th>
              <th className="px-4 py-3">Mokykla</th>
              <th className="px-4 py-3 text-right">Valandos</th>
              <th className="px-4 py-3 text-right">Progresas</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Kraunama…</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Tuščia.</td></tr>}
            {rows.map((r, i) => {
              const earned = r.hours_earned ?? 0;
              const needed = r.hours_needed ?? 0;
              const pct = needed > 0 ? Math.min(100, Math.round((earned / needed) * 100)) : 0;
              return (
                <tr key={r.id} className="border-b border-border/40 last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-3">
                    <p className="truncate font-semibold">{r.full_name ?? "—"}</p>
                    <p className="truncate text-xs text-muted-foreground">{r.email}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.school_name ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold">{earned}<span className="text-muted-foreground">/{needed}</span></td>
                  <td className="px-4 py-3 text-right">
                    <div className="ml-auto flex w-32 items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-gradient-primary" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-8 text-right text-[11px] font-semibold">{pct}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
