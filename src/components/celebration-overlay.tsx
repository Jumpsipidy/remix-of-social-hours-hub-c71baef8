import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Trophy } from "lucide-react";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { onCelebrate, type CelebrationEvent } from "@/lib/celebrate";
import { LT_YELLOW, LT_GREEN, LT_RED, useCalmMotion } from "@/components/motion-kit";

const HOLD_MS = 4200;

/* ── particles ─────────────────────────────────────────────────────────── */

function Confetti({ seed }: { seed: number }) {
  const bits = useMemo(
    () =>
      Array.from({ length: 46 }, (_, i) => ({
        i,
        x: (Math.random() - 0.5) * 900,
        y: -220 - Math.random() * 420,
        r: Math.random() * 720 - 360,
        d: 1.4 + Math.random() * 1.4,
        delay: Math.random() * 0.5,
        c: [LT_YELLOW, LT_GREEN, LT_RED][i % 3],
        w: 5 + Math.random() * 7,
        h: 9 + Math.random() * 12,
      })),
    [seed],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {bits.map((b) => (
        <motion.span
          key={b.i}
          className="absolute left-1/2 top-1/2 rounded-[2px]"
          style={{ width: b.w, height: b.h, background: b.c }}
          initial={{ opacity: 0, x: 0, y: 0, rotate: 0, scale: 0.4 }}
          animate={{ opacity: [0, 1, 1, 0], x: b.x, y: [0, b.y, b.y + 520], rotate: b.r, scale: 1 }}
          transition={{ duration: b.d + 1.1, delay: b.delay, ease: [0.2, 0.7, 0.3, 1] }}
        />
      ))}
    </div>
  );
}

function Rings() {
  return (
    <>
      {[0, 1, 2, 3].map((r) => (
        <motion.span
          key={r}
          className="absolute inset-0 m-auto h-40 w-40 rounded-full border-2"
          style={{ borderColor: [LT_YELLOW, LT_GREEN, LT_RED, LT_YELLOW][r] }}
          initial={{ scale: 0.3, opacity: 0.9 }}
          animate={{ scale: 3.4, opacity: 0 }}
          transition={{ duration: 1.9, delay: r * 0.22, repeat: Infinity, repeatDelay: 0.6, ease: "easeOut" }}
        />
      ))}
    </>
  );
}

/** Tricolour bands that wipe across the screen at the start and end. */
function Bands({ out }: { out?: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {[LT_YELLOW, LT_GREEN, LT_RED].map((c, i) => (
        <motion.span
          key={c}
          className="absolute left-0 h-1/3 w-full"
          style={{ top: `${i * 33.34}%`, background: c, opacity: 0.9 }}
          initial={{ scaleX: 0, originX: i % 2 ? 1 : 0 }}
          animate={out ? { scaleX: [0, 1, 1, 0] } : { scaleX: [0, 1, 0] }}
          transition={{ duration: 1.05, delay: i * 0.07, ease: [0.83, 0, 0.17, 1] }}
        />
      ))}
    </div>
  );
}

/* ── stage ─────────────────────────────────────────────────────────────── */

export function CelebrationStage() {
  const calm = useCalmMotion();
  const [queue, setQueue] = useState<CelebrationEvent[]>([]);
  const current = queue[0] ?? null;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => onCelebrate((e) => setQueue((q) => (q.length > 4 ? q : [...q, e]))), []);

  useEffect(() => {
    if (!current) return;
    timer.current = setTimeout(() => setQueue((q) => q.slice(1)), calm ? 1800 : HOLD_MS);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [current, calm]);

  const skip = () => setQueue((q) => q.slice(1));

  const Icon =
    current?.kind === "achievement"
      ? (ACHIEVEMENTS.find((a) => a.key === current.iconKey)?.icon ?? Trophy)
      : Flame;

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key={`${current.kind}-${queue.length}-${"days" in current ? current.days : current.label}`}
          className="fixed inset-0 z-[120] grid place-items-center overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.45 } }}
          onClick={skip}
          role="status"
          aria-live="polite"
        >
          {/* backdrop */}
          <motion.div
            className="absolute inset-0 bg-background/80 backdrop-blur-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          {!calm && (
            <motion.div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(50% 50% at 50% 45%, ${
                  current.kind === "streak" ? LT_RED : LT_GREEN
                }33, transparent 70%)`,
              }}
              animate={{ opacity: [0.4, 0.9, 0.4], scale: [1, 1.08, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
          {!calm && <Bands />}
          {!calm && <Confetti seed={queue.length} />}

          <div className="relative flex flex-col items-center px-6 text-center">
            <div className="relative grid h-40 w-40 place-items-center">
              {!calm && <Rings />}
              <motion.div
                className="grid h-28 w-28 place-items-center rounded-[2rem] text-white shadow-2xl"
                style={{
                  background:
                    current.kind === "streak"
                      ? `linear-gradient(140deg, ${LT_YELLOW}, ${LT_RED})`
                      : `linear-gradient(140deg, ${LT_GREEN}, ${LT_YELLOW})`,
                }}
                initial={{ scale: 0.2, rotate: -35, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 220, damping: 12, delay: 0.25 }}
              >
                <motion.span
                  animate={calm ? undefined : { scale: [1, 1.12, 1], rotate: [0, -6, 6, 0] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Icon className="h-14 w-14" />
                </motion.span>
              </motion.div>
            </div>

            {current.kind === "streak" ? (
              <>
                <motion.p
                  className="mt-8 text-xs font-bold uppercase tracking-[0.35em] text-muted-foreground"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  Serija tęsiasi
                </motion.p>
                <motion.p
                  className="font-display text-[22vw] font-black leading-none sm:text-[9rem]"
                  style={{
                    backgroundImage: `linear-gradient(105deg, ${LT_YELLOW}, ${LT_RED} 55%, ${LT_YELLOW})`,
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                  }}
                  initial={{ scale: 0.5, opacity: 0, filter: "blur(14px)" }}
                  animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
                  transition={{ type: "spring", stiffness: 180, damping: 14, delay: 0.4 }}
                >
                  {current.days}
                </motion.p>
                <motion.p
                  className="-mt-2 text-lg font-semibold"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  dienos iš eilės 🔥
                </motion.p>
                {typeof current.longest === "number" && (
                  <motion.p
                    className="mt-2 text-sm text-muted-foreground"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9 }}
                  >
                    Rekordas: {current.longest} d.
                  </motion.p>
                )}
              </>
            ) : (
              <>
                <motion.p
                  className="mt-8 text-xs font-bold uppercase tracking-[0.35em] text-muted-foreground"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  Naujas pasiekimas
                </motion.p>
                <motion.h2
                  className="mt-2 font-display text-4xl font-black sm:text-6xl"
                  initial={{ opacity: 0, y: 26, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.7, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
                >
                  {current.label}
                </motion.h2>
                <motion.p
                  className="mt-3 max-w-sm text-sm text-muted-foreground"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.75 }}
                >
                  {current.description}
                </motion.p>
              </>
            )}

            <motion.p
              className="mt-8 text-[11px] uppercase tracking-widest text-muted-foreground/70"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4 }}
            >
              Bakstelėk, kad uždarytum
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
