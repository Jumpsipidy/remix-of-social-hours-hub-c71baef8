import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListReservations, adminUpdateReservationStatus, adminDeleteReservation } from "@/lib/admin-super.functions";
import { toast } from "sonner";
import { CalendarClock, RefreshCw, Trash2, CheckCircle2, XCircle, Clock, AlarmClock, PlayCircle } from "lucide-react";
import { motion } from "framer-motion";
import { AdminAurora, SectionHeader, SaaSKpi, SaaSPanel, LivePill } from "@/components/admin/admin-ui";
import { ListSkeleton } from "@/components/skeleton-loader";

export const Route = createFileRoute("/admin/reservations")({ component: ReservationsPage });

type Item = Awaited<ReturnType<typeof adminListReservations>>["reservations"][number];
const STATUS = ["all", "pending", "confirmed", "approved", "completed", "declined"] as const;
const STATUS_LABEL: Record<string, string> = { all: "Visos", pending: "Laukia", confirmed: "Patvirtinta", approved: "Vykdoma", completed: "Baigta", declined: "Atmesta" };

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
    try { const r = await list({ data: { status: f } }); setRows(r.reservations); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Klaida"); }
    finally { setLoading(false); }
  };
  useEffect(() => { refresh(filter); /* eslint-disable-next-line */ }, [filter]);

  const setStatus = async (id: string, status: Item["status"]) => {
    setBusy(id);
    try { await upd({ data: { id, status } }); toast.success("Statusas atnaujintas"); await refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Klaida"); } finally { setBusy(null); }
  };
  const remove = async (id: string) => {
    if (!confirm("Ištrinti rezervaciją?")) return;
    setBusy(id);
    try { await del({ data: { id } }); setRows((r) => r.filter((x) => x.id !== id)); toast.success("Ištrinta"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Klaida"); } finally { setBusy(null); }
  };

  const kpi = useMemo(() => {
    const c = { pending: 0, approved: 0, completed: 0, hours: 0 };
    rows.forEach((r) => {
      if (r.status === "pending") c.pending++;
      if (r.status === "approved") c.approved++;
      if (r.status === "completed" || r.status === "confirmed") { c.completed++; c.hours += Number(r.hours_to_earn) || 0; }
    });
    return c;
  }, [rows]);

  return (
    <div className="space-y-6">
      <AdminAurora />
      <SectionHeader
        eyebrow="Rezervacijos"
        title="Rezervacijų valdymas"
        description="Peržiūrėk, keisk statusą arba trink rezervacijas."
        icon={CalendarClock}
        action={
          <div className="flex items-center gap-2">
            <LivePill />
            <button onClick={() => refresh()} className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-2 text-xs font-semibold backdrop-blur hover:bg-accent">
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <SaaSKpi icon={AlarmClock} label="Laukia" value={kpi.pending} accent="warn" />
        <SaaSKpi icon={PlayCircle} label="Vykdoma" value={kpi.approved} accent="info" />
        <SaaSKpi icon={CheckCircle2} label="Baigta" value={kpi.completed} accent="success" />
        <SaaSKpi icon={Clock} label="Suteikta val." value={kpi.hours} accent="primary" />
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {STATUS.map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${filter === s ? "border-primary bg-gradient-primary text-primary-foreground shadow-glow" : "border-border bg-card/60 text-muted-foreground hover:bg-accent"}`}>
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {loading && <ListSkeleton rows={6} className="py-4" />}
        {!loading && rows.length === 0 && (
          <SaaSPanel>
            <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
              <CalendarClock className="h-8 w-8 opacity-40" />
              Nėra rezervacijų šiame filtre.
            </div>
          </SaaSPanel>
        )}
        {rows.map((r, i) => (
          <motion.div key={r.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 15) * 0.015 }}>
            <SaaSPanel>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">{r.status}</span>
                    <span className="text-xs text-muted-foreground">{r.reservation_date} {r.start_time?.slice(0, 5)}–{r.end_time?.slice(0, 5)}</span>
                    <span className="rounded-full bg-accent/60 px-2 py-0.5 text-[10px] font-bold">{r.hours_to_earn}h</span>
                  </div>
                  <p className="truncate text-sm font-semibold">
                    {r.student?.full_name ?? "—"} <span className="text-muted-foreground">→</span> {r.organization?.organization_name ?? r.organization?.full_name ?? "—"}
                  </p>
                  {r.note && <p className="truncate text-xs text-muted-foreground">{r.note}</p>}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button disabled={busy === r.id} onClick={() => setStatus(r.id, "approved")} className="inline-flex items-center gap-1 rounded-lg bg-blue-500/15 px-2 py-1 text-[11px] font-semibold text-blue-500 hover:bg-blue-500/25 disabled:opacity-40"><Clock className="h-3 w-3" />Vykdoma</button>
                  <button disabled={busy === r.id} onClick={() => setStatus(r.id, "completed")} className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2 py-1 text-[11px] font-semibold text-emerald-500 hover:bg-emerald-500/25 disabled:opacity-40"><CheckCircle2 className="h-3 w-3" />Baigta</button>
                  <button disabled={busy === r.id} onClick={() => setStatus(r.id, "declined")} className="inline-flex items-center gap-1 rounded-lg bg-orange-500/15 px-2 py-1 text-[11px] font-semibold text-orange-500 hover:bg-orange-500/25 disabled:opacity-40"><XCircle className="h-3 w-3" />Atmesti</button>
                  <button disabled={busy === r.id} onClick={() => remove(r.id)} className="inline-flex items-center gap-1 rounded-lg bg-destructive/15 px-2 py-1 text-[11px] font-semibold text-destructive hover:bg-destructive/25 disabled:opacity-40"><Trash2 className="h-3 w-3" /></button>
                </div>
              </div>
            </SaaSPanel>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
