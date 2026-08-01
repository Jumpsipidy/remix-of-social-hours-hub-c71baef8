import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Snowflake, Sparkles, Check } from "lucide-react";

type Props = {
  streak: number;
  longest: number;
  freezeUsedAt: string | null;
  activated: boolean;
  loading?: boolean;
  onActivate: () => Promise<void> | void;
};

const MILESTONES = [3, 7, 14, 30];

/** Small burst of embers when the streak is claimed. */
function Embers({ fire }: { fire: number }) {
  const seeds = useMemo(
    () => Array.from({ length: 14 }, (_, i) => ({ i, x: (Math.random() - 0.5) * 180, d: 0.5 + Math.random() * 0.6, s: 0.5 + Math.random() })),
    [fire],
  );
  if (!fire) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {seeds.map((p) => (
        <motion.span
          key={`${fire}-${p.i}`}
          className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-warning"
          initial={{ opacity: 1, x: 0, y: 0, scale: p.s }}
          animate={{ opacity: 0, x: p.x, y: -140 - Math.random() * 80, scale: 0 }}
          transition={{ duration: p.d + 0.5, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

export function StreakCard({ streak, longest, freezeUsedAt, activated, loading, onActivate }: Props) {
  const [burst, setBurst] = useState(0);
  const [busy, setBusy] = useState(false);
  const [display, setDisplay] = useState(streak);
  const prev = useRef(streak);

  // Count-up animation whenever the streak grows.
  useEffect(() => {
    if (streak === prev.current) { setDisplay(streak); return; }
    const from = prev.current;
    prev.current = streak;
    const steps = Math.max(1, Math.min(20, Math.abs(streak - from)));
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      setDisplay(Math.round(from + ((streak - from) * n) / steps));
      if (n >= steps) clearInterval(id);
    }, 45);
    return () => clearInterval(id);
  }, [streak]);

  const claim = async () => {
    if (busy || activated) return;
    setBusy(true);
    try {
      await onActivate();
      setBurst((b) => b + 1);
    } finally {
      setBusy(false);
    }
  };

  const nextMilestone = MILESTONES.find((m) => streak < m) ?? null;
  const pct = nextMilestone ? Math.round((streak / nextMilestone) * 100) : 100;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-warning/30 bg-gradient-to-br from-warning/10 via-background to-primary/5 p-6 shadow-md">
      <motion.div
        className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-warning/20 blur-3xl"
        animate={{ opacity: activated ? [0.5, 0.9, 0.5] : 0.3, scale: activated ? [1, 1.12, 1] : 1 }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <Embers fire={burst} />

      <div className="relative flex items-center gap-4">
        <motion.button
          type="button"
          onClick={claim}
          disabled={activated || busy || loading}
          aria-label={activated ? "Serija jau aktyvuota" : "Aktyvuoti šiandienos seriją"}
          className={`relative grid h-20 w-20 shrink-0 place-items-center rounded-3xl text-white shadow-lg transition ${
            activated
              ? "bg-gradient-to-br from-orange-500 to-red-600"
              : "bg-gradient-to-br from-muted to-muted/60 text-muted-foreground grayscale"
          } ${activated ? "" : "cursor-pointer hover:grayscale-0"}`}
          whileTap={{ scale: 0.9 }}
          animate={
            activated
              ? { scale: [1, 1.06, 1], rotate: [0, -3, 3, 0] }
              : { scale: [1, 1.04, 1] }
          }
          transition={{ duration: activated ? 2.2 : 1.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <AnimatePresence mode="wait">
            {busy ? (
              <motion.span key="busy" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                <Sparkles className="h-9 w-9 animate-pulse" />
              </motion.span>
            ) : (
              <motion.span
                key={activated ? "on" : "off"}
                initial={{ opacity: 0, scale: 0.5, rotate: -25 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ type: "spring", stiffness: 320, damping: 18 }}
              >
                <Flame className="h-10 w-10" fill={activated ? "currentColor" : "none"} />
              </motion.span>
            )}
          </AnimatePresence>
          {activated && (
            <motion.span
              className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border-2 border-background bg-success text-success-foreground"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 14 }}
            >
              <Check className="h-4 w-4" />
            </motion.span>
          )}
        </motion.button>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-warning">Prisijungimo serija</p>
          <p className="mt-0.5 font-display text-4xl font-bold">
            {display} <span className="text-lg font-medium text-muted-foreground">d. iš eilės</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Rekordas: <span className="font-semibold text-foreground">{longest} d.</span>
            {freezeUsedAt && (
              <> · <span className="inline-flex items-center gap-1 text-primary"><Snowflake className="h-3 w-3" /> šaldiklis panaudotas</span></>
            )}
          </p>
        </div>
      </div>

      {!activated && (
        <motion.button
          type="button"
          onClick={claim}
          disabled={busy || loading}
          className="relative mt-5 w-full rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 px-4 py-3 text-sm font-bold text-white shadow-glow disabled:opacity-60"
          whileTap={{ scale: 0.97 }}
          animate={{ boxShadow: ["0 0 0 0 rgba(249,115,22,0.5)", "0 0 0 14px rgba(249,115,22,0)"] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        >
          {busy ? "Aktyvuojama…" : "🔥 Aktyvuoti šiandienos seriją"}
        </motion.button>
      )}

      <div className="relative mt-5 grid grid-cols-4 gap-1.5">
        {MILESTONES.map((m, i) => {
          const reached = streak >= m;
          return (
            <motion.div
              key={m}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              className={`rounded-xl border p-2 text-center transition ${
                reached ? "border-warning/50 bg-warning/10" : "border-dashed border-border bg-background/40 opacity-60"
              }`}
            >
              <motion.p
                className={`font-display text-lg font-bold ${reached ? "text-warning" : "text-muted-foreground"}`}
                animate={reached ? { scale: [1, 1.12, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
              >
                {m}
              </motion.p>
              <p className="text-[10px] text-muted-foreground">d.</p>
            </motion.div>
          );
        })}
      </div>

      {nextMilestone && (
        <div className="relative mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-red-600"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ type: "spring", stiffness: 60, damping: 18 }}
            />
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Dar {nextMilestone - streak} d. iki {nextMilestone} dienų ženklelio.
          </p>
        </div>
      )}
    </div>
  );
}
