import { useCallback, useEffect, useState } from "react";
import { Check, X, Award, CalendarDays, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";

type Ev = { id: string; title: string; task_date: string; location: string; spots_total: number; available_hours: number };
type Res = { id: string; task_id: string | null; student_id: string; status: string; reservation_date: string; hours_to_earn: number; note: string | null };

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Laukia", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-300" },
  approved: { label: "Patvirtinta", cls: "bg-sky-500/15 text-sky-600 dark:text-sky-300" },
  confirmed: { label: "Patvirtinta", cls: "bg-sky-500/15 text-sky-600 dark:text-sky-300" },
  completed: { label: "Valandos suteiktos", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" },
  declined: { label: "Atmesta", cls: "bg-rose-500/15 text-rose-600 dark:text-rose-300" },
};

/** School admin: own one-time events + the students who signed up, with accept / decline / award hours. */
export function SchoolEventsManager({ refreshKey = 0 }: { refreshKey?: number }) {
  const { user } = useAuth();
  const [events, setEvents] = useState<Ev[] | null>(null);
  const [res, setRes] = useState<Res[]>([]);
  const [names, setNames] = useState<Record<string, { full_name: string | null; class_year: string | null }>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data: ev } = await supabase.from("tasks")
      .select("id, title, task_date, location, spots_total, available_hours")
      .eq("is_event", true).eq("created_by", user.id).order("task_date", { ascending: false }).limit(50);
    const list = (ev as Ev[]) ?? [];
    setEvents(list);
    if (!list.length) { setRes([]); return; }
    const { data: rs } = await supabase.from("reservations")
      .select("id, task_id, student_id, status, reservation_date, hours_to_earn, note")
      .in("task_id", list.map((e) => e.id)).order("created_at", { ascending: true });
    const rows = (rs as Res[]) ?? [];
    setRes(rows);
    const ids = [...new Set(rows.map((r) => r.student_id))];
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("id, full_name, class_year").in("id", ids);
      setNames(Object.fromEntries(((ps as { id: string; full_name: string | null; class_year: string | null }[]) ?? []).map((p) => [p.id, p])));
    }
  }, [user]);

  useEffect(() => { void load(); }, [load, refreshKey]);

  const setStatus = async (r: Res, status: "approved" | "declined") => {
    setBusy(r.id);
    const { error } = await supabase.from("reservations").update({ status }).eq("id", r.id).eq("status", "pending");
    setBusy(null);
    if (error) return toast.error("Nepavyko: " + error.message);
    toast.success(status === "approved" ? "Mokinys priimtas" : "Užklausa atmesta");
    void load();
  };
  const award = async (r: Res) => {
    setBusy(r.id);
    const { error } = await supabase.rpc("award_reservation_hours", { _reservation_id: r.id });
    setBusy(null);
    if (error) return toast.error("Nepavyko: " + error.message);
    toast.success(`Suteikta ${Number(r.hours_to_earn)} val.`);
    void load();
  };

  if (events === null) return <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}</div>;
  if (!events.length) return <p className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">Dar nesukūrei renginių. Kai mokiniai užsiregistruos, jų užklausos atsiras čia.</p>;

  return (
    <div className="space-y-3">
      {events.map((e) => {
        const rows = res.filter((r) => r.task_id === e.id);
        const pending = rows.filter((r) => r.status === "pending").length;
        return (
          <div key={e.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-bold">{e.title}</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="h-3 w-3" /> {e.task_date} · {e.location}</p>
              </div>
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">
                <Users className="h-3 w-3" /> {rows.filter((r) => r.status !== "declined").length}/{e.spots_total}
                {pending > 0 && <span className="ml-1 rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">{pending} nauji</span>}
              </span>
            </div>
            {rows.length === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">Dar niekas neužsiregistravo.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {rows.map((r) => {
                  const p = names[r.student_id]; const st = STATUS[r.status] ?? STATUS.pending;
                  return (
                    <li key={r.id} className="flex flex-wrap items-center gap-2 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{p?.full_name ?? "Mokinys"} {p?.class_year && <span className="text-xs font-normal text-muted-foreground">· {p.class_year}</span>}</p>
                        {r.note && <p className="truncate text-xs text-muted-foreground">„{r.note}"</p>}
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${st.cls}`}>{st.label}</span>
                      {r.status === "pending" && (
                        <div className="flex gap-1.5">
                          <button disabled={busy === r.id} onClick={() => setStatus(r, "approved")} className="inline-flex h-9 items-center gap-1 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground active:scale-95 disabled:opacity-50"><Check className="h-3.5 w-3.5" /> Priimti</button>
                          <button disabled={busy === r.id} onClick={() => setStatus(r, "declined")} className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-xs font-bold active:scale-95 disabled:opacity-50"><X className="h-3.5 w-3.5" /> Atmesti</button>
                        </div>
                      )}
                      {(r.status === "approved" || r.status === "confirmed") && (
                        <button disabled={busy === r.id} onClick={() => award(r)} className="inline-flex h-9 items-center gap-1 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white active:scale-95 disabled:opacity-50"><Award className="h-3.5 w-3.5" /> Patvirtinti valandas</button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
