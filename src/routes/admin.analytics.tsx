import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminAnalytics } from "@/lib/admin-super.functions";
import { BarChart3, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/analytics")({ component: Page });

type Data = Awaited<ReturnType<typeof adminAnalytics>>;

function Page() {
  const fn = useServerFn(adminAnalytics);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = async () => {
    setLoading(true);
    try { setData(await fn()); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Klaida"); }
    finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, []);

  const chart = useMemo(() => {
    if (!data) return null;
    const days: { label: string; res: number; msg: number; users: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 3600 * 1000);
      const key = d.toISOString().slice(0, 10);
      days.push({
        label: key.slice(5),
        res: data.reservations.filter((r) => r.created_at.slice(0, 10) === key).length,
        msg: data.messages.filter((m) => m.created_at.slice(0, 10) === key).length,
        users: data.profiles.filter((p) => p.created_at.slice(0, 10) === key).length,
      });
    }
    const max = Math.max(1, ...days.map((d) => Math.max(d.res, d.msg, d.users)));
    return { days, max };
  }, [data]);

  const totalHours = data?.reservations.reduce((s, r) => s + (r.status === "completed" ? r.hours_to_earn ?? 0 : 0), 0) ?? 0;
  const completedRate = data?.reservations.length
    ? Math.round((data.reservations.filter((r) => r.status === "completed").length / data.reservations.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            <BarChart3 className="h-6 w-6 shrink-0 text-primary" />
            <span className="truncate">Analitika · 30 dienų</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Trendai per pastarąjį mėnesį.</p>
        </div>
        <button onClick={refresh} className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-2 text-xs font-semibold backdrop-blur hover:bg-accent">
          <RefreshCw className="h-3 w-3" />
        </button>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Naujos rezervacijos" value={data?.reservations.length ?? 0} />
        <Stat label="Įvykdyta" value={`${completedRate}%`} />
        <Stat label="Suteikta valandų" value={totalHours} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Nauji vartotojai" value={data?.profiles.length ?? 0} />
        <Stat label="Žinutės" value={data?.messages.length ?? 0} />
        <Stat label="Vidut. per dieną" value={Math.round((data?.reservations.length ?? 0) / 30)} />
      </div>

      <div className="rounded-2xl border border-border bg-card/70 p-4 shadow-md backdrop-blur">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rezervacijos (mėlyna) · Žinutės (violet.) · Vartotojai (žalia)</p>
        {loading || !chart ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Kraunama…</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex min-w-[600px] items-end gap-1 h-40">
              {chart.days.map((d) => (
                <div key={d.label} className="group relative flex flex-1 flex-col items-center justify-end gap-0.5" title={`${d.label}: R${d.res} · M${d.msg} · U${d.users}`}>
                  <div className="w-full flex gap-0.5 items-end h-full">
                    <div className="flex-1 rounded-t bg-primary/70" style={{ height: `${(d.res / chart.max) * 100}%` }} />
                    <div className="flex-1 rounded-t bg-purple-500/70" style={{ height: `${(d.msg / chart.max) * 100}%` }} />
                    <div className="flex-1 rounded-t bg-green-500/70" style={{ height: `${(d.users / chart.max) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-1 flex min-w-[600px] justify-between text-[9px] text-muted-foreground">
              <span>{chart.days[0]?.label}</span>
              <span>{chart.days[Math.floor(chart.days.length / 2)]?.label}</span>
              <span>{chart.days[chart.days.length - 1]?.label}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border bg-card/70 p-4 shadow-sm backdrop-blur">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold">{value}</p>
    </div>
  );
}
