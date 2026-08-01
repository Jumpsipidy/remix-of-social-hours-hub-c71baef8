import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Flame, Trophy, Building2, Users, Clock } from "lucide-react";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { onCelebrate, type CelebrationEvent, type CelebrationStats } from "@/lib/celebrate";
import { CLIP_URLS, clipForStreak } from "@/assets/celebrations";
import { LT_YELLOW, LT_GREEN, LT_RED, useCalmMotion } from "@/components/motion-kit";

const HOLD_MS = 4600;
const CLIP_MS = 7400;

/* ── helpers ───────────────────────────────────────────────────────────── */

/** Animated number roll-up used across the HUD. */
function useCountUp(target: number, duration = 1100, enabled = true) {
  const [value, setValue] = useState(enabled ? 0 : target);
  useEffect(() => {
    if (!enabled) { setValue(target); return; }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, enabled]);
  return value;
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/* ── particles & backdrop ──────────────────────────────────────────────── */

function Confetti({ seed, count }: { seed: number; count: number }) {
  const bits = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        i,
        x: (Math.random() - 0.5) * 760,
        y: -200 - Math.random() * 420,
        r: Math.random() * 720 - 360,
        d: 1.4 + Math.random() * 1.4,
        delay: Math.random() * 0.6,
        c: [LT_YELLOW, LT_GREEN, LT_RED][i % 3],
        w: 4 + Math.random() * 7,
        h: 8 + Math.random() * 13,
      })),
    [seed, count],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {bits.map((b) => (
        <motion.span
          key={b.i}
          className="absolute left-1/2 top-1/2 rounded-[2px]"
          style={{ width: b.w, height: b.h, background: b.c }}
          initial={{ opacity: 0, x: 0, y: 0, rotate: 0, scale: 0.4 }}
          animate={{ opacity: [0, 1, 1, 0], x: b.x, y: [0, b.y, b.y + 620], rotate: b.r, scale: 1 }}
          transition={{ duration: b.d + 1.2, delay: b.delay, ease: [0.2, 0.7, 0.3, 1] }}
        />
      ))}
    </div>
  );
}

/** Rotating light rays behind the stage — classic motion-graphics sunburst. */
function Rays({ tint }: { tint: string }) {
  return (
    <motion.div
      className="pointer-events-none absolute left-1/2 top-1/2 h-[160vmax] w-[160vmax] -translate-x-1/2 -translate-y-1/2 opacity-[0.18]"
      style={{
        background: `repeating-conic-gradient(from 0deg, ${tint} 0deg 6deg, transparent 6deg 18deg)`,
        maskImage: "radial-gradient(closest-side, black 10%, transparent 72%)",
        WebkitMaskImage: "radial-gradient(closest-side, black 10%, transparent 72%)",
      }}
      initial={{ rotate: 0, scale: 0.7, opacity: 0 }}
      animate={{ rotate: 360, scale: 1, opacity: 0.18 }}
      transition={{ rotate: { duration: 28, repeat: Infinity, ease: "linear" }, scale: { duration: 1.2, ease: "easeOut" }, opacity: { duration: 0.8 } }}
    />
  );
}

/** Expanding shock ring at impact. */
function Shockwave({ tint }: { tint: string }) {
  return (
    <>
      {[0, 1, 2].map((r) => (
        <motion.span
          key={r}
          className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
          style={{ borderColor: tint }}
          initial={{ scale: 0.2, opacity: 0.8 }}
          animate={{ scale: 5.5, opacity: 0 }}
          transition={{ duration: 1.6, delay: 0.12 + r * 0.18, ease: "easeOut" }}
        />
      ))}
    </>
  );
}

function Bands() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {[LT_YELLOW, LT_GREEN, LT_RED].map((c, i) => (
        <motion.span
          key={c}
          className="absolute left-0 h-1/3 w-full"
          style={{ top: `${i * 33.34}%`, background: c, opacity: 0.9 }}
          initial={{ scaleX: 0, originX: i % 2 ? 1 : 0 }}
          animate={{ scaleX: [0, 1, 0] }}
          transition={{ duration: 1.05, delay: i * 0.07, ease: [0.83, 0, 0.17, 1] }}
        />
      ))}
    </div>
  );
}

/* ── real-data HUD ─────────────────────────────────────────────────────── */

function StatChip({
  icon: Icon,
  value,
  label,
  tint,
  delay,
}: {
  icon: typeof Clock;
  value: string;
  label: string;
  tint: string;
  delay: number;
}) {
  return (
    <motion.div
      className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-white/10 bg-black/45 px-2.5 py-2 backdrop-blur-md sm:px-3"
      initial={{ opacity: 0, y: 18, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 260, damping: 22 }}
    >
      <Icon className="h-4 w-4 shrink-0" style={{ color: tint }} />
      <span className="min-w-0">
        <span className="block truncate font-display text-sm font-black leading-tight text-white sm:text-base">{value}</span>
        <span className="block truncate text-[9px] font-semibold uppercase tracking-[0.16em] text-white/55">{label}</span>
      </span>
    </motion.div>
  );
}

/** Live stats strip built from the signed-in student's real numbers. */
function StatsHud({ stats, calm }: { stats: CelebrationStats; calm: boolean }) {
  const hours = Number(stats.hoursEarned ?? 0);
  const needed = Number(stats.hoursNeeded ?? 0);
  const hoursShown = useCountUp(hours, 1200, !calm);
  const pct = needed > 0 ? Math.min(100, (hours / needed) * 100) : 0;

  const chips = [
    { icon: Clock, value: needed > 0 ? `${fmt(hoursShown)}/${fmt(needed)}` : fmt(hoursShown), label: "valandos", tint: LT_GREEN },
    ...(stats.loginStreakDays ? [{ icon: Flame, value: `${stats.loginStreakDays} d.`, label: "serija", tint: LT_RED }] : []),
    ...(stats.uniqueOrgs ? [{ icon: Building2, value: String(stats.uniqueOrgs), label: "organizacijos", tint: LT_YELLOW }] : []),
    ...(stats.friendsCount ? [{ icon: Users, value: String(stats.friendsCount), label: "draugai", tint: LT_GREEN }] : []),
  ].slice(0, 3);

  return (
    <div className="w-full">
      {needed > 0 && (
        <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <motion.span
            className="block h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${LT_YELLOW}, ${LT_GREEN})` }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: calm ? 0 : 1.3, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      )}
      <div className="flex items-stretch gap-1.5 sm:gap-2">
        {chips.map((c, i) => (
          <StatChip key={c.label} {...c} delay={0.4 + i * 0.12} />
        ))}
      </div>
    </div>
  );
}

/* ── stage ─────────────────────────────────────────────────────────────── */

export function CelebrationStage() {
  const calm = useCalmMotion();
  const prefersReduced = useReducedMotion();
  const [queue, setQueue] = useState<CelebrationEvent[]>([]);
  const [failed, setFailed] = useState<string | null>(null);
  const [narrow, setNarrow] = useState(false);

  const current = queue[0] ?? null;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const off = onCelebrate((e) => setQueue((q) => (q.length > 4 ? q : [...q, e])));
    return () => { off(); };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const clipUrl =
    current?.kind === "achievement" ? CLIP_URLS[current.iconKey] : current ? clipForStreak(current.days) : undefined;
  const hasClip = !!clipUrl && failed !== clipUrl;

  const skip = useCallback(() => setQueue((q) => q.slice(1)), []);

  const holdMs = calm ? 1800 : hasClip ? CLIP_MS : HOLD_MS;

  useEffect(() => {
    if (!current) return;
    timer.current = setTimeout(skip, holdMs);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [current, holdMs, skip]);

  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" || e.key === " ") skip(); };
    window.addEventListener("keydown", onKey);
    // Stop the page behind from scrolling while the takeover plays (mobile).
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [current, skip]);

  const stats: CelebrationStats = current?.stats ?? {};
  const tint = current?.kind === "streak" ? LT_RED : LT_GREEN;
  const quiet = calm || prefersReduced === true;

  const Icon =
    current?.kind === "achievement"
      ? (ACHIEVEMENTS.find((a) => a.key === current.iconKey)?.icon ?? Trophy)
      : Flame;

  const firstName = (stats.name ?? "").trim().split(" ")[0] || null;

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key={`${current.kind}-${queue.length}-${"days" in current ? current.days : current.label}`}
          data-testid="celebration-stage"
          className="fixed inset-0 z-[120] flex flex-col items-center justify-center overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.4 } }}
          onClick={skip}
          drag={narrow ? "y" : false}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.25}
          onDragEnd={(_, info) => { if (Math.abs(info.offset.y) > 110) skip(); }}
          role="status"
          aria-live="polite"
        >
          {/* backdrop */}
          <motion.div
            className="absolute inset-0 bg-background/85 backdrop-blur-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          {!quiet && (
            <>
              <Rays tint={tint} />
              <motion.div
                className="absolute inset-0"
                style={{ background: `radial-gradient(55% 55% at 50% 45%, ${tint}33, transparent 72%)` }}
                animate={{ opacity: [0.4, 0.9, 0.4], scale: [1, 1.08, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
              <Bands />
              <Shockwave tint={tint} />
              <Confetti seed={queue.length} count={narrow ? 26 : 48} />
            </>
          )}

          {/* skip */}
          <button
            type="button"
            data-testid="celebration-skip"
            onClick={(e) => { e.stopPropagation(); skip(); }}
            className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-30 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-black/55 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/80 backdrop-blur transition active:scale-95 hover:bg-black/75 hover:text-white sm:right-6 sm:top-6"
          >
            Praleisti
            <span aria-hidden>›</span>
          </button>

          {/* auto-close progress rail */}
          <motion.span
            className="absolute left-0 top-0 z-30 h-[3px]"
            style={{ background: `linear-gradient(90deg, ${LT_YELLOW}, ${LT_GREEN}, ${LT_RED})` }}
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: holdMs / 1000, ease: "linear" }}
          />

          <motion.div
            className="relative z-10 flex w-full max-w-[560px] flex-col items-center px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-14 sm:px-6 sm:pt-0"
            initial={{ scale: 0.78, opacity: 0, y: 26 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
          >
            {firstName && (
              <motion.p
                className="mb-3 max-w-full truncate rounded-full border border-white/10 bg-black/40 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.28em] text-white/70 backdrop-blur"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {firstName}
                {stats.classYear ? ` · ${stats.classYear}` : ""}
              </motion.p>
            )}

            {hasClip && clipUrl ? (
              <div className="relative w-[min(94vw,min(64vh,520px))] overflow-hidden rounded-[1.5rem] border border-white/10 shadow-2xl sm:rounded-[2rem]">
                <video
                  src={clipUrl}
                  autoPlay
                  muted
                  playsInline
                  disablePictureInPicture
                  onEnded={skip}
                  onError={() => setFailed(clipUrl)}
                  className="block aspect-square h-auto w-full object-cover"
                />
                {/* real-data caption burned over the clip */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-3 pt-10 sm:p-4 sm:pt-14">
                  <motion.p
                    className="truncate font-display text-lg font-black text-white sm:text-2xl"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {current.kind === "streak" ? `${current.days} dienos iš eilės` : current.label}
                  </motion.p>
                  <div className="mt-2">
                    <StatsHud stats={stats} calm={quiet} />
                  </div>
                </div>
                <span
                  className="pointer-events-none absolute inset-0 rounded-[1.5rem] sm:rounded-[2rem]"
                  style={{ boxShadow: `inset 0 0 0 1px ${LT_YELLOW}33` }}
                />
              </div>
            ) : (
              <div className="flex w-full flex-col items-center text-center">
                <div className="relative grid h-32 w-32 place-items-center sm:h-40 sm:w-40">
                  <motion.div
                    className="grid h-24 w-24 place-items-center rounded-[1.75rem] text-white shadow-2xl sm:h-28 sm:w-28 sm:rounded-[2rem]"
                    style={{
                      background:
                        current.kind === "streak"
                          ? `linear-gradient(140deg, ${LT_YELLOW}, ${LT_RED})`
                          : `linear-gradient(140deg, ${LT_GREEN}, ${LT_YELLOW})`,
                    }}
                    initial={{ scale: 0.2, rotate: -35, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 220, damping: 12, delay: 0.2 }}
                  >
                    <motion.span
                      animate={quiet ? undefined : { scale: [1, 1.12, 1], rotate: [0, -6, 6, 0] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Icon className="h-12 w-12 sm:h-14 sm:w-14" />
                    </motion.span>
                  </motion.div>
                </div>

                {current.kind === "streak" ? (
                  <>
                    <motion.p
                      className="mt-6 text-[10px] font-bold uppercase tracking-[0.35em] text-muted-foreground sm:text-xs"
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.45 }}
                    >
                      Serija tęsiasi
                    </motion.p>
                    <motion.p
                      className="font-display text-[26vw] font-black leading-none sm:text-[9rem]"
                      style={{
                        backgroundImage: `linear-gradient(105deg, ${LT_YELLOW}, ${LT_RED} 55%, ${LT_YELLOW})`,
                        WebkitBackgroundClip: "text",
                        backgroundClip: "text",
                        color: "transparent",
                      }}
                      initial={{ scale: 0.5, opacity: 0, filter: "blur(14px)" }}
                      animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
                      transition={{ type: "spring", stiffness: 180, damping: 14, delay: 0.35 }}
                    >
                      {current.days}
                    </motion.p>
                    <motion.p
                      className="-mt-1 text-base font-semibold sm:text-lg"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                    >
                      dienos iš eilės 🔥
                    </motion.p>
                    {typeof (current.longest ?? stats.longestStreak) === "number" && (
                      <p className="mt-1.5 text-xs text-muted-foreground sm:text-sm">
                        Rekordas: {current.longest ?? stats.longestStreak} d.
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <motion.p
                      className="mt-6 text-[10px] font-bold uppercase tracking-[0.35em] text-muted-foreground sm:text-xs"
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.45 }}
                    >
                      Naujas pasiekimas
                    </motion.p>
                    <motion.h2
                      className="mt-2 font-display text-3xl font-black sm:text-6xl"
                      initial={{ opacity: 0, y: 26, filter: "blur(10px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      transition={{ duration: 0.7, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    >
                      {current.label}
                    </motion.h2>
                    <motion.p
                      className="mt-2.5 max-w-sm text-sm text-muted-foreground"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.65 }}
                    >
                      {current.description}
                    </motion.p>
                  </>
                )}

                <div className="mt-6 w-full max-w-[420px]">
                  <StatsHud stats={stats} calm={quiet} />
                </div>
              </div>
            )}

            <p className="mt-4 text-[10px] uppercase tracking-widest text-muted-foreground/70">
              {narrow ? "Bakstelėk arba braukite, kad uždarytum" : "Bakstelėk arba spausk Esc"}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
