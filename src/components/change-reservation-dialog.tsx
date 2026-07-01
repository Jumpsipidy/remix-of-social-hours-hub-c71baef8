import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  open: boolean;
  reservation: {
    id: string;
    reservation_date: string;
    start_time: string;
    end_time: string;
    hours_to_earn: number;
  } | null;
  onClose: () => void;
  onSaved: (updated: {
    reservation_date: string;
    start_time: string;
    end_time: string;
    hours_to_earn: number;
  }) => void;
};

function calcHours(start: string, end: string) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const diff = eh * 60 + em - (sh * 60 + sm);
  return Math.max(0, Math.round((diff / 60) * 10) / 10);
}

export function ChangeReservationDialog({ open, reservation, onClose, onSaved }: Props) {
  const [date, setDate] = useState(reservation?.reservation_date ?? "");
  const [start, setStart] = useState(reservation?.start_time?.slice(0, 5) ?? "");
  const [end, setEnd] = useState(reservation?.end_time?.slice(0, 5) ?? "");
  const [hours, setHours] = useState<number>(Number(reservation?.hours_to_earn ?? 0));
  const [manualHours, setManualHours] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reset when opening with a new reservation
  useState(() => {
    if (reservation) {
      setDate(reservation.reservation_date);
      setStart(reservation.start_time.slice(0, 5));
      setEnd(reservation.end_time.slice(0, 5));
      setHours(Number(reservation.hours_to_earn));
    }
  });

  const autoHours = calcHours(start, end);
  const effHours = manualHours ? hours : autoHours;

  const submit = async () => {
    if (!reservation || !date || !start || !end || effHours <= 0) {
      toast.error("Užpildyk visus laukus");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("reservations")
      .update({
        reservation_date: date,
        start_time: start,
        end_time: end,
        hours_to_earn: effHours,
      })
      .eq("id", reservation.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    onSaved({ reservation_date: date, start_time: start, end_time: end, hours_to_earn: effHours });
  };

  return (
    <AnimatePresence>
      {open && reservation && (
        <motion.div
          className="fixed inset-0 z-[60] grid place-items-center bg-foreground/50 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-background shadow-elegant"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-border bg-gradient-card p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Užsakymo pakeitimas</p>
                <h3 className="mt-1 font-display text-xl font-bold">Pakeisti užsakymo laiką</h3>
                <p className="mt-1 text-xs text-muted-foreground">Pakeitimai bus automatiškai išsiųsti į pokalbį.</p>
              </div>
              <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full border border-border hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nauja data</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pradžia</label>
                  <input type="time" value={start} onChange={(e) => setStart(e.target.value)}
                    className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pabaiga</label>
                  <input type="time" value={end} onChange={(e) => setEnd(e.target.value)}
                    className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
              </div>
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-1.5 text-primary"><Clock className="h-4 w-4" /> Numatytos valandos</span>
                  <span className="font-display text-xl font-bold">{effHours} val.</span>
                </div>
                <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={manualHours} onChange={(e) => setManualHours(e.target.checked)} className="h-3.5 w-3.5 accent-primary" />
                  Nustatyti valandas rankiniu būdu
                </label>
                {manualHours && (
                  <input type="number" min={0} step={0.5} value={hours} onChange={(e) => setHours(Number(e.target.value))}
                    className="mt-2 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border bg-card/60 p-4">
              <button onClick={onClose} className="rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-accent">Atšaukti</button>
              <button onClick={submit} disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-50">
                <Save className="h-4 w-4" />
                {saving ? "Išsaugoma…" : "Išsaugoti pakeitimus"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
