import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef, type ReactNode, type MouseEvent } from "react";
import type { LucideIcon } from "lucide-react";

/** Ambient aurora background used by admin pages for the SaaS feel. */
export function AdminAurora() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -left-32 top-[-10%] h-[520px] w-[520px] rounded-full bg-primary/20 blur-[140px]" />
      <div className="absolute right-[-15%] top-[30%] h-[480px] w-[480px] rounded-full bg-fuchsia-500/10 blur-[140px]" />
      <div className="absolute bottom-[-20%] left-[20%] h-[420px] w-[420px] rounded-full bg-cyan-500/10 blur-[140px]" />
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(to right, hsl(var(--foreground) / 1) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground) / 1) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
        }}
      />
    </div>
  );
}

/** SaaS section header w/ eyebrow + title + optional description + action slot. */
export function SectionHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-primary">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-1 flex items-center gap-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {Icon && <Icon className="h-6 w-6 shrink-0 text-primary" />}
          <span className="truncate">{title}</span>
        </h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** Premium glass panel with subtle border glow. */
export function SaaSPanel({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border/70 bg-card/60 shadow-[0_1px_0_0_hsl(var(--foreground)/0.04)_inset,0_20px_60px_-30px_rgba(0,0,0,0.5)] backdrop-blur-xl ${padded ? "p-4 sm:p-5" : ""} ${className}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      {children}
    </div>
  );
}

/** Inline mini sparkline for KPI cards. */
export function Sparkline({
  values,
  className = "",
  stroke = "url(#spark-grad)",
}: {
  values: number[];
  className?: string;
  stroke?: string;
}) {
  const clean = (values ?? []).map((v) => (Number.isFinite(v) ? Number(v) : 0));
  const safe = clean.length ? clean : [0, 0];
  const w = 100;
  const h = 28;
  const min = Math.min(...safe);
  const max = Math.max(...safe);
  const span = max - min || 1;
  const step = safe.length > 1 ? w / (safe.length - 1) : w;
  const coords = safe.map((v, i) => {
    const x = safe.length > 1 ? i * step : w / 2;
    const y = h - ((v - min) / span) * (h - 4) - 2;
    return { x: Number.isFinite(x) ? x : 0, y: Number.isFinite(y) ? y : h - 2 };
  });
  const pts = coords.map((c) => `${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(" ");
  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(" ");
  const area = `M0,${h} ${linePath} L${w},${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={`h-7 w-full ${className}`}>
      <defs>
        <linearGradient id="spark-grad" x1="0" x2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(var(--primary) / 0.6)" />
        </linearGradient>
        <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary) / 0.35)" />
          <stop offset="100%" stopColor="hsl(var(--primary) / 0)" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark-fill)" />
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** 3D-tilt KPI tile with gradient glow, optional sparkline + trend chip. */
export function SaaSKpi({
  icon: Icon,
  label,
  value,
  trend,
  spark,
  accent = "primary",
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: { value: number; suffix?: string } | null;
  spark?: number[];
  accent?: "primary" | "success" | "warn" | "info";
  onClick?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-40, 40], [6, -6]), { stiffness: 300, damping: 20 });
  const ry = useSpring(useTransform(mx, [-40, 40], [-6, 6]), { stiffness: 300, damping: 20 });

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set(e.clientX - r.left - r.width / 2);
    my.set(e.clientY - r.top - r.height / 2);
  };
  const reset = () => {
    mx.set(0);
    my.set(0);
  };

  const accents: Record<string, string> = {
    primary: "from-primary/25 to-fuchsia-500/10",
    success: "from-emerald-500/25 to-teal-500/10",
    warn: "from-amber-500/25 to-rose-500/10",
    info: "from-cyan-500/25 to-primary/10",
  };
  const chip = accent === "warn" ? "bg-amber-500/15 text-amber-400" : accent === "success" ? "bg-emerald-500/15 text-emerald-400" : "bg-primary/15 text-primary";

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      onClick={onClick}
      style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
      whileHover={{ y: -3 }}
      className={`group relative overflow-hidden rounded-2xl border border-border/70 bg-card/70 p-4 shadow-[0_1px_0_0_hsl(var(--foreground)/0.04)_inset,0_20px_60px_-30px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:p-5 ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className={`absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br ${accents[accent]} opacity-70 blur-2xl transition group-hover:opacity-100`} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
            <Icon className="h-5 w-5" />
          </div>
          {trend != null && (
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${chip}`}>
              {trend.value >= 0 ? "▲" : "▼"} {Math.abs(trend.value)}
              {trend.suffix ?? "%"}
            </span>
          )}
        </div>
        <p className="mt-3 font-display text-3xl font-bold tabular-nums leading-none">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
        {spark && spark.length > 1 && (
          <div className="mt-3">
            <Sparkline values={spark} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

/** Small pill used in section headers. */
export function LivePill({ label = "LIVE" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
      </span>
      {label}
    </span>
  );
}
