import { reservationTimeLabel } from "@/lib/reservation-time";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, Check, X, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { listMyGroupInvites, respondToInvite, type GroupInvite } from "@/lib/friends";

/** Laukiantys grupinių rezervacijų kvietimai: kas pakvietė, kur, kada ir kiek draugų jau eina. */
export function GroupInvitesInbox({ userId, onChanged }: { userId: string; onChanged?: () => void }) {
  const [invites, setInvites] = useState<GroupInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const changedRef = useRef(onChanged);
  changedRef.current = onChanged;

  const reload = async () => {
    try { setInvites(await listMyGroupInvites()); }
    catch { /* lieka paskutinis sąrašas */ }
    finally { setLoading(false); }
  };

  useEffect(() => { void reload(); }, [userId]);

  useEffect(() => {
    const ch = supabase
      .channel(`invites-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "reservation_participants", filter: `student_id=eq.${userId}` }, () => { void reload(); changedRef.current?.(); })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [userId]);

  const respond = async (inv: GroupInvite, accept: boolean) => {
    setBusy(inv.participant_id);
    try {
      await respondToInvite(inv.participant_id, accept);
      setInvites((list) => list.filter((i) => i.participant_id !== inv.participant_id));
      toast.success(accept ? "Prisijungei prie grupės" : "Kvietimas atmestas", accept ? { description: "Rezervacija atsirado tavo sąraše, o kodas ir QR — skiltyje „QR kodas“." } : undefined);
      changedRef.current?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nepavyko atsakyti į kvietimą");
    } finally {
      setBusy(null);
    }
  };

  if (loading || invites.length === 0) return null;

  return (
    <section className="rounded-3xl border border-primary/30 bg-primary/5 p-5" aria-label="Grupinių rezervacijų kvietimai">
      <div className="mb-3 flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold">Draugai kviečia kartu ({invites.length})</p>
      </div>
      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {invites.map((inv) => (
            <motion.div
              key={inv.participant_id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="rounded-2xl border border-border bg-card p-3"
            >
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">{inv.inviter_name}</span> kviečia eiti kartu</p>
                  <p className="truncate text-sm font-semibold">{inv.task_title ? `${inv.task_title} · ${inv.org_name}` : inv.org_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {inv.reservation_date} · {reservationTimeLabel(inv.start_time, inv.end_time)} · {Number(inv.hours_to_earn)} val. · eina {inv.going}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button type="button" disabled={busy === inv.participant_id} onClick={() => respond(inv, false)} className="inline-flex h-9 items-center gap-1 rounded-full border border-border bg-background px-3 text-xs font-semibold text-muted-foreground transition hover:bg-accent disabled:opacity-50">
                  <X className="h-3.5 w-3.5" /> Atmesti
                </button>
                <button type="button" disabled={busy === inv.participant_id} onClick={() => respond(inv, true)} className="inline-flex h-9 items-center gap-1 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50">
                  {busy === inv.participant_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Eisiu kartu
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
