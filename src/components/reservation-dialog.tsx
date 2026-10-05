import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, Clock, MapPin, Star, Check, Info, Sparkles, Loader2 } from "lucide-react";
import { LeafletMap } from "@/components/leaflet-map";

export type ReservationSubmit = {
  date: string;
  start_time: string;
  end_time: string;
  hours: number;
  note: string;
};

export type ReserveTarget = {
  id: string;
  name: string;
  emoji?: string;
  town?: string | null;
  category?: string | null;
  rating?: number | null;
  presetDate?: string;
  presetStart?: string;
  presetEnd?: string;
  tags?: string[];
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type Props = {
  target: ReserveTarget | null;
  onClose: () => void;
  onConfirm: (details: ReservationSubmit) => Promise<void> | void;
};

function todayISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function calcHours(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins <= 0) return 0;
  return Math.round(mins / 60);
}

export function ReservationDialog({ target, onClose, onConfirm }: Props) {
  const [date, setDate] = useState(todayISO());
  const [start, setStart] = useState("14:00");
  const [end, setEnd] = useState("17:00");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!target) return;
    if (target.presetDate) setDate(target.presetDate);
    if (target.presetStart) setStart(target.presetStart);
    if (target.presetEnd) setEnd(target.presetEnd);
  }, [target?.id]);

  const hours = useMemo(() => calcHours(start, end), [start, end]);
  const valid = hours > 0 && !!date;

  const handleSubmit = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      await onConfirm({ date, start_time: start, end_time: end, hours, note });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {target && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-end p-0 sm:place-items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-md"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-h-[95vh] overflow-hidden rounded-t-3xl border border-border/60 bg-card shadow-2xl ring-1 ring-black/5 sm:max-w-xl sm:rounded-3xl"
            initial={{ opacity: 0, y: 32, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
          >
            {/* Header */}
            <div className="relative overflow-hidden bg-gradient-hero p-5 sm:p-7 text-white">
              <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/15 blur-3xl" />
              <div className="absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
              <button
                onClick={onClose}
                className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
                aria-label="Uždaryti"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="relative flex items-center gap-4">
                <div className="grid h-12 w-12 sm:h-16 sm:w-16 shrink-0 place-items-center rounded-2xl bg-white/20 text-2xl sm:text-3xl shadow-inner backdrop-blur">
                  {target.emoji ?? "🤝"}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Nauja rezervacija</p>
                  <h2 className="mt-0.5 truncate text-lg sm:text-[22px] font-bold leading-tight">{target.name}</h2>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/85">
                    {target.town && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {target.town}</span>}
                    {target.rating != null && <span className="inline-flex items-center gap-1"><Star className="h-3 w-3" fill="currentColor" /> {target.rating}</span>}
                    {target.category && <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-medium">{target.category}</span>}
                  </div>
                  {target.tags && target.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {target.tags.map((t) => (
                        <span key={t} className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white">#{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="max-h-[55vh] sm:max-h-[60vh] overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
              {/* Date */}
              <Field icon={<Calendar className="h-4 w-4" />} label="Data">
                <input
                  type="date"
                  value={date}
                  min={todayISO()}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm font-medium outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
              </Field>

              {/* Times */}
              <div className="mt-5 grid grid-cols-2 gap-4">
                <Field icon={<Clock className="h-4 w-4" />} label="Pradžios laikas">
                  <input
                    type="time"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm font-medium outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                </Field>
                <Field icon={<Clock className="h-4 w-4" />} label="Pabaigos laikas">
                  <input
                    type="time"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm font-medium outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                </Field>
              </div>

              {/* Live duration calculator */}
              <motion.div
                layout
                className={`mt-5 overflow-hidden rounded-2xl border p-4 transition ${
                  hours > 0
                    ? "border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent"
                    : "border-destructive/30 bg-destructive/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`grid h-11 w-11 place-items-center rounded-xl ${hours > 0 ? "bg-gradient-primary text-primary-foreground shadow-glow" : "bg-destructive/20 text-destructive"}`}>
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tu uždirbsi</p>
                    <AnimatePresence mode="wait">
                      <motion.p
                        key={`${start}-${end}`}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.2 }}
                        className="font-display text-lg font-bold leading-tight"
                      >
                        {hours > 0 ? (
                          <>
                            {start} → {end}{" "}
                            <span className="text-gradient">= {hours} {hours === 1 ? "valandą" : hours < 10 && hours % 1 === 0 ? "valandas" : "val."}</span>
                          </>
                        ) : (
                          "Pabaigos laikas turi būti vėlesnis nei pradžios"
                        )}
                      </motion.p>
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>

              {/* Note */}
              <div className="mt-5">
                <label className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-primary">
                    <Info className="h-4 w-4" />
                  </span>
                  Žinutė organizacijai
                  <span className="text-xs font-normal text-muted-foreground">(nebūtina)</span>
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="Pvz., turiu patirties su gyvūnais..."
                  className="w-full resize-none rounded-xl border border-border bg-background p-3.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
              </div>

              {target.latitude != null && target.longitude != null && (
                <div className="mt-5">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-primary">
                      <MapPin className="h-4 w-4" />
                    </span>
                    Vieta žemėlapyje
                  </div>
                  {target.address && (
                    <p className="mb-2 text-xs text-muted-foreground">{target.address}</p>
                  )}
                  <LeafletMap lat={target.latitude} lng={target.longitude} height={200} interactive={false} />
                </div>
              )}

              {/* Helper text */}
              <div className="mt-5 flex items-start gap-3 rounded-2xl bg-accent/50 p-4 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="leading-relaxed">
                  Tavo užklausa bus išsiųsta organizacijai patvirtinimui. Patvirtinus, valandos bus automatiškai pridėtos prie tavo profilio.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 border-t border-border bg-background/60 px-5 py-3 sm:px-7 sm:py-4 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
              <button
                onClick={onClose}
                disabled={submitting}
                className="rounded-full px-5 py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-accent disabled:opacity-50"
              >
                Atšaukti
              </button>
              <motion.button
                whileHover={valid && !submitting ? { scale: 1.03 } : undefined}
                whileTap={valid && !submitting ? { scale: 0.97 } : undefined}
                onClick={handleSubmit}
                disabled={!valid || submitting}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {submitting ? "Siunčiama..." : "Siųsti užklausą"}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-primary">{icon}</span>
        {label}
      </label>
      {children}
    </div>
  );
}
