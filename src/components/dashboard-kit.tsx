import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { useRef, type ReactNode } from "react";
import { CountUp, useCalmMotion } from "@/components/motion-kit";

/** Shared accents — same palette as the marketing homepage. */
export const DASH_EMBER = "#C8452A";
export const DASH_GOLD = "#E9B44C";
export const DASH_GREEN = "#1E9E63";

/**
 * Glass card with cursor spotlight, subtle tilt and a sheen sweep.
 * Mirrors the homepage SpotlightCard so dashboards feel like the same product.
 */
export function GlassCard({
  children,
  className = "",
  accent = DASH_EMBER,
  tilt = true,
}: {
  children: ReactNode;
  className?: string;
  accent?: string;
  tilt?: boolean;
}) {
  const calm = useCalmMotion();
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(50);
  const my = useMotionValue(50);
  const rx = useSpring(useTransform(my, [0, 100], [5, -5]), { stiffness: 140, damping: 16 });
  const ry = useSpring(useTransform(mx, [0, 100], [-5, 5]), { stiffness: 140, damping: 16 });
  const glow = useTransform(
    [mx, my] as never,
    ([x, y]: number[]) => `radial-gradient(420px circle at ${x}% ${y}%, ${accent}22, transparent 62%)`,
  );

  return (
    <motion.div
      ref={ref}
      onPointerMove={(e) => {
        if (calm || e.pointerType !== "mouse" || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        mx.set(((e.clientX - r.left) / r.width) * 100);
        my.set(((e.clientY - r.top) / r.height) * 100);
      }}
      onPointerLeave={() => {
        mx.set(50);
        my.set(50);
      }}
      whileHover={calm ? undefined : { y: -4 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      style={calm || !tilt ? undefined : { rotateX: rx, rotateY: ry, transformPerspective: 1000 }}
      className={`group relative overflow-hidden rounded-3xl border border-border/70 bg-card/60 shadow-elegant backdrop-blur-xl transition-colors hover:border-primary/35 ${className}`}
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: glow }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/[0.07] to-transparent transition-transform duration-[900ms] ease-out group-hover:translate-x-full motion-reduce:hidden"
      />
      {children}
    </motion.div>
  );
}

/**
 * Big, friendly stat tile. Numbers count up, labels stay plain-Lithuanian so
 * both younger students and adults read them at a glance.
 */
export function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  accent = DASH_EMBER,
  loading = false,
  delay = 0,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  sub?: string;
  accent?: string;
  loading?: boolean;
  delay?: number;
}) {
  const numeric = typeof value === "number" ? value : Number(String(value).replace(/[^\d.-]/g, ""));
  const isNumber = typeof value === "number" || (!Number.isNaN(numeric) && /^\d+$/.test(String(value)));
  const suffix = typeof value === "string" && value.trim().endsWith("%") ? "%" : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <GlassCard accent={accent} className="h-full">
        <div className="relative p-5 sm:p-6">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px"
            style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
          />
          <div className="flex items-start justify-between gap-3">
            <div
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border text-foreground"
              style={{ borderColor: `${accent}55`, background: `${accent}1f`, color: accent }}
            >
              <Icon className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-5 font-display text-3xl font-black tabular-nums tracking-tight sm:text-4xl">
            {loading ? (
              <span className="text-muted-foreground">…</span>
            ) : isNumber ? (
              <>
                <CountUp value={numeric} />
                {suffix}
              </>
            ) : (
              value
            )}
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground/90">{label}</p>
          {sub && <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{sub}</p>}
        </div>
      </GlassCard>
    </motion.div>
  );
}

/**
 * Dashboard hero header: eyebrow + big title + human explanation + actions.
 * Same visual language as the marketing homepage hero.
 */
export function DashHero({
  eyebrow,
  title,
  subtitle,
  actions,
  aside,
  icon: Icon,
  accent = DASH_EMBER,
}: {
  eyebrow: string;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  aside?: ReactNode;
  icon?: LucideIcon;
  accent?: string;
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-card/50 p-5 shadow-elegant backdrop-blur-xl sm:p-8"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(760px 300px at 8% -10%, ${accent}26, transparent 62%)`,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1 opacity-80"
        style={{ background: `linear-gradient(90deg, ${DASH_GOLD}, ${DASH_GREEN}, ${DASH_EMBER})` }}
      />
      <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <span
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em]"
            style={{ borderColor: `${accent}55`, background: `${accent}1a`, color: accent }}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {eyebrow}
          </span>
          <h1 className="mt-4 font-display text-3xl font-black tracking-tight sm:text-5xl">{title}</h1>
          {subtitle && (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">{subtitle}</p>
          )}
          {actions && <div className="mt-5 flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
        {aside && <div className="min-w-0 lg:w-[380px]">{aside}</div>}
      </div>
    </motion.header>
  );
}

/** Section heading used between dashboard blocks. */
export function SectionTitle({
  icon: Icon,
  title,
  hint,
  right,
}: {
  icon?: LucideIcon;
  title: string;
  hint?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 className="flex items-center gap-2 font-display text-lg font-bold tracking-tight sm:text-xl">
          {Icon && <Icon className="h-5 w-5 text-primary" />}
          {title}
        </h2>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {right}
    </div>
  );
}
