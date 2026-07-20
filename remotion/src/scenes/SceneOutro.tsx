import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { COLORS, Heart } from "../ui/primitives";

export const SceneOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoS = spring({ frame: frame - 5, fps, config: { damping: 14, stiffness: 100 } });
  const l1 = interpolate(frame, [30, 65], [0, 100], { extrapolateRight: "clamp" });
  const l2S = spring({ frame: frame - 70, fps, config: { damping: 14 } });
  const btnS = spring({ frame: frame - 120, fps, config: { damping: 15 } });
  const urlOp = interpolate(frame, [150, 180], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ transform: `scale(${logoS})`, marginBottom: 22 }}>
        <div style={{
          width: 120, height: 120, borderRadius: 999,
          background: "linear-gradient(135deg,#67e8f9,#22b8d4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 40px 100px rgba(103,232,249,0.5)",
        }}><Heart size={58}/></div>
      </div>

      <div style={{ textAlign: "center" }}>
        <div style={{
          fontSize: 112, lineHeight: 1.05, fontFamily: "'Instrument Serif', serif",
          color: "#fff", letterSpacing: -2,
          clipPath: `inset(0 ${100 - l1}% 0 0)`,
        }}>Socialinės valandos</div>
        <div style={{
          fontSize: 112, lineHeight: 1.05, fontFamily: "'Instrument Serif', serif",
          color: COLORS.muted, letterSpacing: -2, opacity: l2S,
          transform: `translateY(${(1 - l2S) * 30}px)`,
        }}>
          <span style={{
            fontStyle: "italic",
            background: "linear-gradient(135deg,#f5a67a,#e8734a,#c44a20)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>paprasčiau.</span>
        </div>
      </div>

      <div style={{
        marginTop: 54, display: "flex", gap: 16,
        transform: `scale(${btnS})`, opacity: btnS,
      }}>
        <div style={{
          padding: "18px 38px", borderRadius: 999,
          background: "linear-gradient(135deg,#e8734a,#c44a20)",
          color: "#fff", fontWeight: 700, fontSize: 20,
          boxShadow: "0 20px 60px rgba(196,74,32,0.5)",
        }}>Pradėti savanorystę →</div>
        <div style={{
          padding: "18px 38px", borderRadius: 999,
          border: `1px solid ${COLORS.borderStrong}`,
          color: "#fff", fontWeight: 600, fontSize: 20,
        }}>Naršyti užduotis</div>
      </div>

      <div style={{
        marginTop: 40, opacity: urlOp,
        fontSize: 17, color: COLORS.muted, letterSpacing: 3, fontWeight: 600,
      }}>
        SOCIALINESVALANDOS.LT
      </div>
    </AbsoluteFill>
  );
};
