import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, X, Check, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { listMyFriendships, fetchFriendProfiles, inviteFriendsToReservation, type FriendProfile } from "@/lib/friends";

type Props = {
  open: boolean;
  reservationId: string | null;
  inviterId: string;
  reservationLabel?: string;
  onClose: () => void;
};

export function InviteFriendsDialog({ open, reservationId, inviterId, reservationLabel, onClose }: Props) {
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    setLoading(true);
    (async () => {
      try {
        const rows = await listMyFriendships(inviterId);
        const accepted = rows.filter((r) => r.status === "accepted");
        const ids = accepted.map((r) => (r.requester_id === inviterId ? r.addressee_id : r.requester_id));
        const map = await fetchFriendProfiles(ids);
        setFriends(ids.map((id) => map[id]).filter(Boolean));
      } finally {
        setLoading(false);
      }
    })();
  }, [open, inviterId]);

  const toggle = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const submit = async () => {
    if (!reservationId || selected.size === 0) return;
    setSending(true);
    try {
      await inviteFriendsToReservation(reservationId, inviterId, Array.from(selected));
      toast.success(`Pakviesta draugų: ${selected.size}`);
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Nepavyko pakviesti");
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-end p-0 sm:place-items-center sm:p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <motion.div className="absolute inset-0 bg-foreground/40 backdrop-blur-md" onClick={onClose} />
          <motion.div
            className="relative w-full max-h-[90vh] overflow-hidden rounded-t-3xl border border-border bg-card shadow-2xl sm:max-w-lg sm:rounded-3xl"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
          >
            <div className="relative overflow-hidden bg-gradient-hero p-5 text-white">
              <button onClick={onClose} className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-white/15 hover:bg-white/25">
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/20"><Users className="h-5 w-5" /></div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Grupinė rezervacija</p>
                  <h2 className="text-lg font-bold">Pakviesk draugus</h2>
                  {reservationLabel && <p className="mt-0.5 text-xs text-white/85">{reservationLabel}</p>}
                </div>
              </div>
            </div>

            <div className="max-h-[55vh] overflow-y-auto p-5">
              <p className="mb-3 text-xs text-muted-foreground">
                Pakviesti draugai gaus tas pačias valandas, kai organizacija patvirtins užduotį. Kiekvienas privalo priimti kvietimą.
              </p>
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Kraunama...</div>
              ) : friends.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-6 text-center">
                  <UserPlus className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                  <p className="text-sm font-semibold">Kol kas neturi draugų</p>
                  <p className="mt-1 text-xs text-muted-foreground">Susirask klasiokų skiltyje „Draugai" ir vėl pakviesk.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {friends.map((f) => {
                    const on = selected.has(f.id);
                    return (
                      <button
                        key={f.id}
                        onClick={() => toggle(f.id)}
                        className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition ${
                          on ? "border-primary bg-primary/10" : "border-border bg-background/60 hover:bg-accent"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold ${on ? "bg-gradient-primary text-primary-foreground" : "bg-accent text-primary"}`}>
                            {(f.full_name ?? "?").trim().charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{f.full_name ?? "—"}</p>
                            <p className="truncate text-xs text-muted-foreground">{f.class_year ?? "—"} · {f.hours_earned ?? 0} val.</p>
                          </div>
                        </div>
                        <div className={`grid h-6 w-6 place-items-center rounded-full border-2 ${on ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                          {on && <Check className="h-3.5 w-3.5" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border bg-background/60 px-5 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
              <button onClick={onClose} className="rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-accent">
                Praleisti
              </button>
              <button
                onClick={submit}
                disabled={sending || selected.size === 0}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition disabled:opacity-50"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Pakviesti ({selected.size})
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
