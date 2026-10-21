import { reservationTimeLabel } from "@/lib/reservation-time";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, Check, X, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { listMyInvites, respondToInvite, type ParticipantRow } from "@/lib/friends";

type ReservationLite = {
  id: string;
  reservation_date: string;
  start_time: string;
  end_time: string;
  hours_to_earn: number;
  organization_id: string;
  student_id: string;
};

export function GroupInvitesInbox({ userId }: { userId: string }) {
  const [invites, setInvites] = useState<ParticipantRow[]>([]);
  const [resMap, setResMap] = useState<Record<string, ReservationLite>>({});
  const [orgMap, setOrgMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    try {
      const rows = (await listMyInvites(userId)).filter((r) => r.status === "pending");
      setInvites(rows);
      const ids = Array.from(new Set(rows.map((r) => r.reservation_id)));
      if (ids.length) {
        const { data: rs } = await supabase.from("reservations").select("id, reservation_date, start_time, end_time, hours_to_earn, organization_id, student_id").in("id", ids);
        const rm: Record<string, ReservationLite> = {};
        (rs as ReservationLite[] | null)?.forEach((r) => (rm[r.id] = r));
        setResMap(rm);
        const orgIds = Array.from(new Set(Object.values(rm).map((r) => r.organization_id)));
        if (orgIds.length) {
          const { data: ps } = await supabase.from("profiles").select("id, organization_name, full_name").in("id", orgIds);
          const om: Record<string, string> = {};
          (ps as any[] | null)?.forEach((p) => (om[p.id] = p.organization_name ?? p.full_name ?? "Organizacija"));
          setOrgMap(om);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [userId]);

  useEffect(() => {
    const ch = supabase
      .channel(`invites-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "reservation_participants", filter: `student_id=eq.${userId}` }, () => reload())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [userId]);

  const respond = async (id: string, accept: boolean) => {
    try {
      await respondToInvite(id, accept);
      toast.success(accept ? "Prisijungei prie grupės" : "Kvietimas atmestas", accept ? { description: "Tavo įsiregistravimo kodas ir QR — skiltyje „QR kodas“." } : undefined);
      reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Klaida");
    }
  };

  if (loading) return null;
  if (invites.length === 0) return null;

  return (
    <section className="rounded-3xl border border-primary/30 bg-primary/5 p-5">
      <div className="mb-3 flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold">Grupinių rezervacijų kvietimai ({invites.length})</p>
      </div>
      <div className="space-y-2">
        <AnimatePresence>
          {invites.map((inv) => {
            const r = resMap[inv.reservation_id];
            const orgName = r ? orgMap[r.organization_id] ?? "Organizacija" : "…";
            return (
              <motion.div
                key={inv.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <CalendarDays className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{orgName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {r ? `${r.reservation_date} · ${reservationTimeLabel(r.start_time, r.end_time)} · ${Number(r.hours_to_earn)} val.` : "…"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => respond(inv.id, true)} className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600">
                    <Check className="h-3 w-3" /> Priimti
                  </button>
                  <button onClick={() => respond(inv.id, false)} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent">
                    <X className="h-3 w-3" /> Atmesti
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </section>
  );
}
