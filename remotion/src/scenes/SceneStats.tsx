import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { COLORS } from "../ui/primitives";

const StatCard: React.FC<{
  delay: number; x: number; y: number; label: string; end: number; suffix?: string; accent: string; icon: string;
}> = ({ delay, x, y, label, end, suffix = "", accent, icon }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 110 } });
  const count = interpolate(frame - delay - 6, [0, 60], [0, end], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const float = Math.sin((frame - delay) / 22) * 4;
  const val = Math.round(count).toLocaleString("lt-LT");
  // sparkline
  const points = Array.from({ length: 16 }, (_, i) => {
    const yy = 40 - (Math.sin(i * 0.6 + delay) * 8 + i * 1.6);
    return `${i * 20},${yy + 30}`;
  }).join(" ");
  return (
    <div style={{
      position: "absolute", left: x, top: y + float,
      transform: `scale(${s})`, transformOrigin: "center",
      width: 340, height: 220,
      borderRadius: 24,
      background: `linear-gradient(180deg, ${COLORS.panel} 0%, ${COLORS.panel2} 100%)`,
      border: `1px solid ${COLORS.borderStrong}`,
      boxShadow: `0 30px 70px rgba(0,0,0,0.4), 0 0 40px ${accent}22`,
      padding: 28,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14, background: `${accent}22`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 26, color: accent,
        }}>{icon}</div>
        <div style={{ color: COLORS.green, fontSize: 13, fontWeight: 700, background: "rgba(52,211,153,0.12)", padding: "4px 10px", borderRadius: 99 }}>+12%</div>
      </div>
      <div style={{ fontSize: 13, color: COLORS.muted, letterSpacing: 1.5, marginTop: 20, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 46, fontWeight: 800, color: "#fff", letterSpacing: -1, marginTop: 4 }}>
        {val}{suffix}
      </div>
      <svg width="320" height="40" style={{ position: "absolute", left: 10, bottom: 12 }}>
        <polyline points={points} fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
};

export const SceneStats: React.FC = () => {
  const frame = useCurrentFrame();
  const titleOp = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [0, 20], [20, 0], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 110, left: 0, right: 0, textAlign: "center", opacity: titleOp, transform: `translateY(${titleY}px)` }}>
        <div style={{ fontSize: 15, color: COLORS.cyan, letterSpacing: 4, fontWeight: 700 }}>REALŪS SKAIČIAI</div>
        <div style={{ fontSize: 82, fontFamily: "'Instrument Serif', serif", color: "#fff", marginTop: 12, letterSpacing: -2 }}>
          Auganti bendruomenė
        </div>
      </div>

      <StatCard delay={20} x={220}  y={420} label="MOKINIŲ"       end={2847}  accent={COLORS.cyan}   icon="◆" />
      <StatCard delay={30} x={600}  y={420} label="ORGANIZACIJŲ"  end={156}   accent={COLORS.orange} icon="◈" />
      <StatCard delay={40} x={980}  y={420} label="VALANDŲ"       end={48320} accent={COLORS.violet} icon="◷" />
      <StatCard delay={50} x={1360} y={420} label="UŽDUOČIŲ"      end={1240}  accent={COLORS.green}  icon="✓" />
    </AbsoluteFill>
  );
};
