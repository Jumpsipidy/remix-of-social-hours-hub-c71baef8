import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { COLORS } from "../ui/primitives";

export const SceneProgress: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleOp = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  const ringProg = interpolate(frame - 30, [0, 90], [0, 0.75], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const hours = Math.round(interpolate(frame - 30, [0, 90], [0, 15], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));

  const R = 180;
  const C = 2 * Math.PI * R;
  const dash = C * ringProg;

  const barsIn = (i: number) => spring({ frame: frame - 60 - i * 5, fps, config: { damping: 18 } });
  const bars = [0.45, 0.7, 0.35, 0.9, 0.6, 0.8, 0.55];

  const achievements = [
    { label: "Pirma valanda", delay: 100 },
    { label: "5 valandos", delay: 130 },
    { label: "10 valandų", delay: 160 },
  ];

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 70, left: 0, right: 0, textAlign: "center", opacity: titleOp }}>
        <div style={{ fontSize: 14, color: COLORS.orange, letterSpacing: 4, fontWeight: 700 }}>◆ SEK PAŽANGĄ</div>
        <div style={{ fontSize: 72, fontFamily: "'Instrument Serif', serif", color: "#fff", marginTop: 8, letterSpacing: -1.5 }}>
          Tavo <span style={{ fontStyle: "italic", color: COLORS.cyan }}>kelionė</span> realiu laiku
        </div>
      </div>

      {/* Progress ring left */}
      <div style={{ position: "absolute", left: 260, top: 320, width: 460, height: 460 }}>
        <svg width="460" height="460" viewBox="0 0 460 460">
          <defs>
            <linearGradient id="ringG" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="100%" stopColor="#e8734a" />
            </linearGradient>
          </defs>
          <circle cx="230" cy="230" r={R} fill="none" stroke={COLORS.border} strokeWidth="18" />
          <circle cx="230" cy="230" r={R} fill="none" stroke="url(#ringG)" strokeWidth="18"
            strokeDasharray={`${dash} ${C}`} strokeLinecap="round"
            transform="rotate(-90 230 230)" />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontSize: 130, fontWeight: 800, color: "#fff", letterSpacing: -3, lineHeight: 1 }}>
            {hours}<span style={{ fontSize: 60, color: COLORS.muted }}>h</span>
          </div>
          <div style={{ fontSize: 16, color: COLORS.muted, letterSpacing: 2, marginTop: 8 }}>IŠ 20 VALANDŲ</div>
        </div>
      </div>

      {/* Right panel: weekly bars + achievements */}
      <div style={{ position: "absolute", right: 200, top: 340, width: 560 }}>
        <div style={{
          background: COLORS.panel, borderRadius: 22, padding: 30,
          border: `1px solid ${COLORS.borderStrong}`,
          boxShadow: "0 30px 60px rgba(0,0,0,0.4)",
        }}>
          <div style={{ fontSize: 14, color: COLORS.muted, letterSpacing: 2, fontWeight: 700 }}>SAVAITĖS AKTYVUMAS</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 16, height: 160, marginTop: 24 }}>
            {bars.map((b, i) => {
              const h = 150 * b * barsIn(i);
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: "100%", height: h, borderRadius: "6px 6px 2px 2px",
                    background: i === 3 ? "linear-gradient(180deg,#67e8f9,#22b8d4)" : "linear-gradient(180deg,#e8734a,#c44a20)",
                  }} />
                  <div style={{ fontSize: 12, color: COLORS.muted }}>{["P","A","T","K","P","Š","S"][i]}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
          {achievements.map((a, i) => {
            const s = spring({ frame: frame - a.delay, fps, config: { damping: 12, stiffness: 130 } });
            return (
              <div key={i} style={{
                flex: 1, padding: 16, borderRadius: 16,
                background: "linear-gradient(135deg, rgba(103,232,249,0.15), rgba(232,115,74,0.15))",
                border: `1px solid ${COLORS.cyan}44`,
                transform: `scale(${s})`, transformOrigin: "center",
                textAlign: "center",
              }}>
                <div style={{ fontSize: 28 }}>✓</div>
                <div style={{ fontSize: 12, color: "#fff", fontWeight: 700, marginTop: 4 }}>{a.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
