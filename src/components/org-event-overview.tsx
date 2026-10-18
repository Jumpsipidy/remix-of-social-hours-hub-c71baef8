import { useMemo } from "react";

/**
 * "Renginių apžvalga": three headline counters and a smooth cumulative hours curve
 * for the last 30 days. Pure SVG so it renders instantly without the chart bundle.
 */
export function OrgEventOverview({ participants, hours, events, daily }: { participants: number; hours: number; events: number; daily: number[] }) {
  const { line, area } = useMemo(() => {
    const W = 600, H = 160, pad = 8;
    let acc = 0;
    const cum = daily.map((v) => (acc += v));
    const max = Math.max(1, cum[cum.length - 1] ?? 0);
    const pts = cum.map((v, i) => [pad + (i / Math.max(1, cum.length - 1)) * (W - pad * 2), H - pad - (v / max) * (H - pad * 2 - 16)] as const);
    if (!pts.length) return { line: "", area: "" };
    // Catmull-Rom to cubic Bézier for a soft curve.
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
      d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
    }
    const last = pts[pts.length - 1];
    return { line: d, area: `${d} L${last[0]},${H} L${pts[0][0]},${H} Z` };
  }, [daily]);

  const stats = [
    { value: participants, label: "dalyviai" },
    { value: hours, label: "valandų" },
    { value: events, label: "renginiai" },
  ];

  return (
    <div className="dash-card overflow-hidden p-5 sm:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Organizacijoms</p>
      <h2 className="mt-1 font-display text-2xl font-bold">Renginių apžvalga</h2>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl bg-accent/60 p-3 sm:p-4">
            <p className="font-display text-2xl font-bold tabular-nums sm:text-3xl">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
      <svg viewBox="0 0 600 160" preserveAspectRatio="none" className="mt-4 h-32 w-full sm:h-40" role="img" aria-label="Suteiktų valandų augimas per 30 dienų">
        <defs>
          <linearGradient id="org-overview-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {area && <path d={area} fill="url(#org-overview-fill)" />}
        {line && <path d={line} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" className="org-overview-line" pathLength={1} />}
      </svg>
      <p className="mt-1 text-xs text-muted-foreground">Suteiktos valandos per paskutines 30 dienų</p>
    </div>
  );
}
