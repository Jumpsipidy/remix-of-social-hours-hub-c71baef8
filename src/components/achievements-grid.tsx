import { useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Award, Lock, X } from "lucide-react";
import { ACHIEVEMENTS, type Achievement } from "@/lib/achievements";

/** Each achievement gets its own motion signature. */
type MotionKind = "pulse" | "spin" | "bounce" | "flicker" | "orbit" | "shimmer" | "beat" | "pop";

const KIND: Record<string, MotionKind> = {
  first_hour: "pop",
  five_hours: "shimmer",
  ten_hours: "bounce",
  half_way: "orbit",
  goal_reached: "spin",
  overachiever: "pulse",
  three_orgs: "bounce",
  five_orgs: "orbit",
  streak_2: "flicker",
  streak_4: "flicker",
  social_starter: "beat",
  squad: "beat",
  team_player: "pop",
  ten_tasks: "shimmer",
  login_streak_3: "flicker",
  login_streak_7: "flicker",
  login_streak_14: "pulse",
  login_streak_30: "spin",
};

const iconMotion: Record<MotionKind, Variants> = {
  pulse: { idle: { scale: [1, 1.14, 1], transition: { duration: 1.8, repeat: Infinity } } },
  spin: { idle: { rotate: [0, 360], transition: { duration: 6, repeat: Infinity, ease: "linear" } } },
  bounce: { idle: { y: [0, -6, 0], transition: { duration: 1.4, repeat: Infinity, ease: "easeInOut" } } },
  flicker: { idle: { opacity: [1, 0.55, 1], scale: [1, 1.1, 1], transition: { duration: 0.9, repeat: Infinity } } },
  orbit: { idle: { rotate: [-12, 12, -12], transition: { duration: 2.6, repeat: Infinity, ease: "easeInOut" } } },
  shimmer: { idle: { scale: [1, 1.06, 1], rotate: [0, 6, -6, 0], transition: { duration: 3, repeat: Infinity } } },
  beat: { idle: { scale: [1, 1.22, 0.96, 1], transition: { duration: 1.1, repeat: Infinity } } },
  pop: { idle: { scale: [1, 1.18, 1], transition: { duration: 1.6, repeat: Infinity, ease: "backOut" } } },
};

function Rays({ kind }: { kind: MotionKind }) {
  return (
    <motion.span
      className="pointer-events-none absolute inset-0 rounded-2xl"
      style={{ background: "radial-gradient(circle at 30% 20%, color-mix(in oklab, var(--primary) 30%, transparent), transparent 65%)" }}
      animate={{ opacity: kind === "flicker" ? [0.3, 0.8, 0.3] : [0.25, 0.55, 0.25] }}
      transition={{ duration: 2.4, repeat: Infinity }}
    />
  );
}

export function AchievementsGrid({ unlocked }: { unlocked: Set<string> }) {
  const [open, setOpen] = useState<Achievement | null>(null);
  const count = ACHIEVEMENTS.filter((a) => unlocked.has(a.key)).length;
  const pct = Math.round((count / ACHIEVEMENTS.length) * 100);

  return (
    <div className="rounded-3xl border border-border bg-gradient-card p-6 shadow-md">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <Award className="h-5 w-5 text-primary" /> Pasiekimai
      </h2>
      <p className="text-xs text-muted-foreground">
        Atrakinta {count} iš {ACHIEVEMENTS.length}
      </p>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-gradient-primary"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 60, damping: 18 }}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ACHIEVEMENTS.map((a, i) => {
          const got = unlocked.has(a.key);
          const kind = KIND[a.key] ?? "pulse";
          return (
            <motion.button
              key={a.key}
              type="button"
              onClick={() => setOpen(a)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.95 }}
              className={`relative overflow-hidden rounded-2xl border p-3 text-left text-xs transition ${
                got ? "border-primary/40 bg-primary/5" : "border-dashed border-border bg-background/40"
              }`}
            >
              {got && <Rays kind={kind} />}
              <motion.span
                className={`relative grid h-9 w-9 place-items-center rounded-xl ${
                  got ? "bg-gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
                variants={got ? iconMotion[kind] : undefined}
                animate={got ? "idle" : undefined}
              >
                {got ? <a.icon className="h-4 w-4" /> : <Lock className="h-3.5 w-3.5" />}
              </motion.span>
              <p className={`relative mt-2 font-semibold leading-tight ${got ? "" : "text-muted-foreground"}`}>{a.label}</p>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-foreground/50 backdrop-blur-md" onClick={() => setOpen(null)} />
            <motion.div
              role="dialog"
              aria-modal="true"
              className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-border/60 bg-card p-8 text-center shadow-2xl"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 280, damping: 24 }}
            >
              <button
                onClick={() => setOpen(null)}
                aria-label="Uždaryti"
                className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-muted text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="relative mx-auto grid h-28 w-28 place-items-center">
                {unlocked.has(open.key) &&
                  [0, 1, 2].map((r) => (
                    <motion.span
                      key={r}
                      className="absolute inset-0 rounded-full border border-primary/40"
                      initial={{ scale: 0.6, opacity: 0.8 }}
                      animate={{ scale: 1.4, opacity: 0 }}
                      transition={{ duration: 2, repeat: Infinity, delay: r * 0.6 }}
                    />
                  ))}
                <motion.div
                  className={`grid h-20 w-20 place-items-center rounded-3xl ${
                    unlocked.has(open.key) ? "bg-gradient-primary text-primary-foreground shadow-glow" : "bg-muted text-muted-foreground"
                  }`}
                  variants={unlocked.has(open.key) ? iconMotion[KIND[open.key] ?? "pulse"] : undefined}
                  animate={unlocked.has(open.key) ? "idle" : undefined}
                >
                  {unlocked.has(open.key) ? <open.icon className="h-9 w-9" /> : <Lock className="h-7 w-7" />}
                </motion.div>
              </div>

              <h3 className="mt-5 font-display text-xl font-bold">{open.label}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{open.description}</p>
              <p className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                unlocked.has(open.key) ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
              }`}>
                {unlocked.has(open.key) ? "Atrakinta" : "Dar neatrakinta"}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
