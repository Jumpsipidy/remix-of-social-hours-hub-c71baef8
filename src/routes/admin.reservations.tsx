import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListReservations, adminUpdateReservationStatus, adminDeleteReservation } from "@/lib/admin-super.functions";
import { toast } from "sonner";
import { CalendarClock, RefreshCw, Trash2, CheckCircle2, XCircle, Clock } from "lucide-react";

export const Route = createFileRoute("/admin/reservations")({
  component: ReservationsPage,
});

type Item = Awaited<ReturnType<typeof adminListReservations>>["reservations"][number];
const STATUS = ["all", "pending", "confirmed", "approved", "completed", "declined"] as const;

function ReservationsPage() {
  const list = useServerFn(adminListReservations);
  const upd = useServerFn(adminUpdateReservationStatus);
  const del = useServerFn(adminDeleteReservation);
  const [rows, setRows] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof STATUS)[number]>("all");
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = async (f = filter) => {
    setLoading(true);
    try {
      const r = await list({ data: { status: f } });
      setRows(r.reservations);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Klaida");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { refresh(filter); /* eslint-disable-next-line */ }, [filter]);

  const setStatus = async (id: string, status: Item["status"]) => {
    setBusy(id);
    try {
      await upd({ data: { id, status } });
      toast.success("Statusas atnaujintas");
      await refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Klaida"); } finally { setBusy(null); }
  };
  const remove = async (id: string) => {
    if (!confirm("Ištrinti rezervaciją?")) return;
    setBusy(id);
    try {
      await del({ data: { id } });
      setRows((r) => r.filter((x) => x.id !== id));
      toast.success("Ištrinta");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Klaida"); } finally { setBusy(null); }
  };

  return (
    <div className="space-y-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            <CalendarClock className="h-6 w-6 shrink-0 text-primary" />
            <span className="truncate">Rezervacijos</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Peržiūrėk, keisk statusą arba trink.</p>
        </div>
        <button onClick={() => refresh()} className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-2 text-xs font-semibold backdrop-blur hover:bg-accent">
          <RefreshCw className="h-3 w-3" />
        </button>
      </header>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {STATUS.map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${filter === s ? "border-primary bg-gradient-primary text-primary-foreground shadow-glow" : "border-border bg-card/60 text-muted-foreground hover:bg-accent"}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {loading && <p className="py-10 text-center text-sm text-muted-foreground">Kraunama…</p>}
        {!loading && rows.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Nėra rezervacijų.</p>}
        {rows.map((r) => (
          <div key={r.id} className="rounded-2xl border border-border bg-card/70 p-4 shadow-sm backdrop-blur">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">{r.status}</span>
                  <span className="text-xs text-muted-foreground">{r.reservation_date} {r.start_time?.slice(0, 5)}–{r.end_time?.slice(0, 5)}</span>
                  <span className="text-xs font-semibold">{r.hours_to_earn}h</span>
                </div>
                <p className="truncate text-sm font-semibold">
                  {r.student?.full_name ?? "—"} <span className="text-muted-foreground">→</span> {r.organization?.organization_name ?? r.organization?.full_name ?? "—"}
                </p>
                {r.note && <p className="truncate text-xs text-muted-foreground">{r.note}</p>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button disabled={busy === r.id} onClick={() => setStatus(r.id, "approved")} className="inline-flex items-center gap-1 rounded-lg bg-blue-500/15 px-2 py-1 text-[11px] font-semibold text-blue-500 hover:bg-blue-500/25"><Clock className="h-3 w-3" />Vykdoma</button>
                <button disabled={busy === r.id} onClick={() => setStatus(r.id, "completed")} className="inline-flex items-center gap-1 rounded-lg bg-green-500/15 px-2 py-1 text-[11px] font-semibold text-green-500 hover:bg-green-500/25"><CheckCircle2 className="h-3 w-3" />Baigta</button>
                <button disabled={busy === r.id} onClick={() => setStatus(r.id, "declined")} className="inline-flex items-center gap-1 rounded-lg bg-orange-500/15 px-2 py-1 text-[11px] font-semibold text-orange-500 hover:bg-orange-500/25"><XCircle className="h-3 w-3" />Atmesti</button>
                <button disabled={busy === r.id} onClick={() => remove(r.id)} className="inline-flex items-center gap-1 rounded-lg bg-destructive/15 px-2 py-1 text-[11px] font-semibold text-destructive hover:bg-destructive/25"><Trash2 className="h-3 w-3" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
