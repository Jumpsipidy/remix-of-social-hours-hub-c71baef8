import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, Clock, Users, MapPin, Star, Check, Info } from "lucide-react";
import type { Organization } from "@/lib/mock-data";

type Props = {
  org: Organization | null;
  onClose: () => void;
  onConfirm: (details: { date: string; time: string; spots: number; note: string }) => void;
};

const dateOptions = [
  { id: "d1", label: "Birželio 28 d.", sub: "Šeštadienis" },
  { id: "d2", label: "Birželio 30 d.", sub: "Pirmadienis" },
  { id: "d3", label: "Liepos 2 d.", sub: "Trečiadienis" },
  { id: "d4", label: "Liepos 5 d.", sub: "Šeštadienis" },
];

const timeOptions = ["09:00", "11:00", "13:00", "15:00", "17:00"];

export function ReservationDialog({ org, onClose, onConfirm }: Props) {
  const [date, setDate] = useState(dateOptions[0].label);
  const [time, setTime] = useState(timeOptions[0]);
  const [spots, setSpots] = useState(1);
  const [note, setNote] = useState("");

  return (
    <AnimatePresence>
      {org && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-border bg-card shadow-elegant"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
          >
            {/* Header */}
            <div className="relative overflow-hidden bg-gradient-hero p-6 text-white">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
              <button
                onClick={onClose}
                className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                aria-label="Uždaryti"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="relative flex items-center gap-4">
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/15 text-3xl backdrop-blur">
                  {org.emoji}
                </div>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wider text-white/70">Rezervacija</p>
                  <h2 className="truncate text-xl font-bold">{org.name}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/80">
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {org.town}</span>
                    <span className="inline-flex items-center gap-1"><Star className="h-3 w-3" fill="currentColor" /> {org.rating}</span>
                    <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {org.spotsLeft} laisvų vietų</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-6">
              {/* Date */}
              <Section icon={<Calendar className="h-4 w-4" />} title="Pasirink datą">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {dateOptions.map((d) => (
                    <OptionChip key={d.id} active={date === d.label} onClick={() => setDate(d.label)}>
                      <span className="block text-sm font-semibold">{d.label}</span>
                      <span className="block text-[11px] text-muted-foreground">{d.sub}</span>
                    </OptionChip>
                  ))}
                </div>
              </Section>

              {/* Time */}
              <Section icon={<Clock className="h-4 w-4" />} title="Pasirink laiką">
                <div className="flex flex-wrap gap-2">
                  {timeOptions.map((t) => (
                    <OptionChip key={t} active={time === t} onClick={() => setTime(t)} compact>
                      {t}
                    </OptionChip>
                  ))}
                </div>
              </Section>

              {/* Spots */}
              <Section icon={<Users className="h-4 w-4" />} title="Savanorių skaičius">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSpots((s) => Math.max(1, s - 1))}
                    className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-background transition hover:bg-accent"
                  >
                    −
                  </button>
                  <motion.span
                    key={spots}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="min-w-[3rem] text-center font-display text-2xl font-bold"
                  >
                    {spots}
                  </motion.span>
                  <button
                    onClick={() => setSpots((s) => Math.min(org.spotsLeft, s + 1))}
                    className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-background transition hover:bg-accent"
                  >
                    +
                  </button>
                  <span className="ml-2 text-xs text-muted-foreground">iš {org.spotsLeft} laisvų</span>
                </div>
              </Section>

              {/* Note */}
              <Section icon={<Info className="h-4 w-4" />} title="Žinutė organizacijai (nebūtina)">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="Pvz., turiu patirties su gyvūnais..."
                  className="w-full resize-none rounded-xl border border-border bg-background p-3 text-sm outline-none transition focus:border-primary"
                />
              </Section>

              {/* Summary */}
              <div className="mt-2 rounded-2xl border border-border bg-accent/40 p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Santrauka</p>
                <div className="mt-2 grid grid-cols-3 gap-3 text-center text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Data</p>
                    <p className="font-semibold">{date}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Laikas</p>
                    <p className="font-semibold">{time}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Valandos</p>
                    <p className="font-semibold">{org.hoursOffered} val.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-border bg-background/50 p-4">
              <button
                onClick={onClose}
                className="rounded-full px-5 py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-accent"
              >
                Atšaukti
              </button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onConfirm({ date, time, spots, note })}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
              >
                <Check className="h-4 w-4" /> Patvirtinti rezervaciją
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-primary">{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}

function OptionChip({
  active,
  onClick,
  children,
  compact,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={`relative rounded-xl border px-3 ${compact ? "py-2" : "py-2.5"} text-left transition ${
        active
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border bg-background text-foreground hover:border-primary/40"
      }`}
    >
      {children}
      {active && (
        <motion.span
          layoutId="chip-indicator"
          className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-primary text-primary-foreground"
        >
          <Check className="h-2.5 w-2.5" />
        </motion.span>
      )}
    </motion.button>
  );
}
