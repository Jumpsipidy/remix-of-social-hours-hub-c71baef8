import { motion, useInView, useMotionValue, useSpring, useReducedMotion, type Variants } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Shared motion primitives for Socialinės Valandos.
 * Palette leans on the Lithuanian tricolour (geltona / žalia / raudona)
 * used as kinetic accents rather than flat flag blocks.
 */
export const LT_YELLOW = "#F5C542";
export const LT_GREEN = "#1E9E63";
export const LT_RED = "#C8452A";

/**
 * True when the device is a phone / low-power machine.
 * Detected after hydration so SSR markup stays stable.
 */
export function useLowPowerDevice() {
  const [low, setLow] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const nav = navigator as Navigator & { deviceMemory?: number };
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const small = window.matchMedia("(max-width: 900px)").matches;
    const weak =
      (nav.deviceMemory !== undefined && nav.deviceMemory <= 4) ||
      (navigator.hardwareConcurrency !== undefined && navigator.hardwareConcurrency <= 4) ||
      coarse; // Always assume low power if touch-based (phone/tablet) to maximize scroll performance
    setLow(weak || (small && coarse));
  }, []);
  return low;
}

/**
 * Respect the OS "reduce motion" setting everywhere — and treat phones the
 * same way. Continuous transforms, blurs and marquees are the main source of
 * jank on mobile, so every consumer of this hook goes static there.
 */
export function useCalmMotion() {
  const reduced = useReducedMotion() === true;
  const low = useLowPowerDevice();
  return reduced || low;
}


/* ── Kinetic headline ─────────────────────────────────────────────────── */

type KineticProps = {
  text: string;
  className?: string;
  /** words rendered with the accent gradient */
  accentWords?: string[];
  delay?: number;
  as?: "h1" | "h2" | "h3" | "p";
};

const wordVariants: Variants = {
  hidden: { y: "110%", rotateX: -55, opacity: 0 },
  show: (i: number) => ({
    y: "0%",
    rotateX: 0,
    opacity: 1,
    transition: { delay: i * 0.055, duration: 0.85, ease: [0.16, 1, 0.3, 1] },
  }),
};

/** Words rise out of a clipping mask with a slight 3D tilt — classic motion-graphics reveal. */
export function KineticHeadline({ text, className = "", accentWords = [], delay = 0, as = "h2" }: KineticProps) {
  const calm = useCalmMotion();
  const ref = useRef<HTMLHeadingElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const Tag = motion[as];
  const words = text.split(" ");
  const accents = new Set(accentWords.map((w) => w.toLowerCase()));

  if (calm) {
    return <Tag className={className}>{text}</Tag>;
  }

  return (
    <Tag ref={ref} className={className} style={{ perspective: 900 }}>
      {words.map((w, i) => {
        const clean = w.replace(/[.,—?!]/g, "").toLowerCase();
        const accent = accents.has(clean);
        return (
          <span key={`${w}-${i}`} className="inline-block overflow-hidden align-bottom pb-[0.12em] pr-[0.26em]">
            <motion.span
              className="inline-block"
              variants={wordVariants}
              custom={i + delay * 10}
              initial="hidden"
              animate={inView ? "show" : "hidden"}

              style={
                accent
                  ? {
                      backgroundImage: `linear-gradient(105deg, ${LT_YELLOW}, ${LT_RED} 45%, ${LT_YELLOW})`,
                      backgroundSize: "220% 100%",
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                      color: "transparent",
                      animation: "sv-shine 6s linear infinite",
                      fontStyle: "italic",
                    }
                  : undefined
              }
            >
              {w}
            </motion.span>
          </span>
        );
      })}
    </Tag>
  );
}

/* ── Magnetic button wrapper ──────────────────────────────────────────── */

export function Magnetic({ children, strength = 14, className = "" }: { children: ReactNode; strength?: number; className?: string }) {
  const calm = useCalmMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const x = useSpring(useMotionValue(0), { stiffness: 220, damping: 18, mass: 0.4 });
  const y = useSpring(useMotionValue(0), { stiffness: 220, damping: 18, mass: 0.4 });

  if (calm) return <span className={className}>{children}</span>;

  return (
    <motion.span
      ref={ref}
      className={`inline-block ${className}`}
      style={{ x, y }}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse" || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        x.set(((e.clientX - r.left) / r.width - 0.5) * strength * 2);
        y.set(((e.clientY - r.top) / r.height - 0.5) * strength * 2);
      }}
      onPointerLeave={() => { x.set(0); y.set(0); }}
      whileTap={{ scale: 0.97 }}
    >
      {children}
    </motion.span>
  );
}

/* ── Section reveal ───────────────────────────────────────────────────── */

export function Reveal({
  children,
  delay = 0,
  y = 26,
  className = "",
}: { children: ReactNode; delay?: number; y?: number; className?: string }) {
  const calm = useCalmMotion();
  if (calm) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-70px" }}
      transition={{ duration: 0.75, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ── Tricolour scroll rail (top of page) ──────────────────────────────── */

export function TricolorRail({ progress }: { progress: import("framer-motion").MotionValue<number> }) {
  return (
    <motion.div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left"
      style={{
        scaleX: progress,
        background: `linear-gradient(90deg, ${LT_YELLOW}, ${LT_GREEN} 50%, ${LT_RED})`,
      }}
    />
  );
}

/* ── Count-up with odometer feel ──────────────────────────────────────── */

const fmt = (n: number) => new Intl.NumberFormat("lt-LT").format(n);

export function CountUp({ value, className, duration = 1700 }: { value: number; className?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const calm = useCalmMotion();
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (calm) { setN(value); return; }
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 4);
      setN(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, calm, duration]);

  return <span ref={ref} className={className}>{fmt(n)}</span>;
}

/* ── Ambient tricolour ribbons (decorative background motion) ─────────── */

export function TricolorRibbons({ className = "" }: { className?: string }) {
  const calm = useCalmMotion();
  const bands = [
    { c: LT_YELLOW, d: 26, o: 0.16, top: "6%" },
    { c: LT_GREEN, d: 34, o: 0.13, top: "38%" },
    { c: LT_RED, d: 30, o: 0.15, top: "68%" },
  ];
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {bands.map((b, i) => (
        <motion.div
          key={b.c}
          className="absolute left-[-25%] h-[38vh] w-[150%] blur-3xl"
          style={{
            top: b.top,
            opacity: b.o,
            background: `radial-gradient(60% 60% at 50% 50%, ${b.c}, transparent 70%)`,
          }}
          animate={calm ? undefined : { x: ["-6%", "6%", "-6%"], y: ["0%", i % 2 ? "4%" : "-4%", "0%"] }}
          transition={{ duration: b.d, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}
