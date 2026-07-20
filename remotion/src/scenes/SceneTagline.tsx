import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS } from "../ui/primitives";

// Kinetic typography: "Socialinės valandos" / "be chaoso"
export const SceneTagline: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const line1Reveal = interpolate(frame, [0, 25], [0, 100], { extrapolateRight: "clamp" });
  const line2S = spring({ frame: frame - 30, fps, config: { damping: 16 } });
  const chaosoIn = spring({ frame: frame - 55, fps, config: { damping: 12, stiffness: 120 } });
  const underline = interpolate(frame, [70, 100], [0, 1], { extrapolateRight: "clamp" });

  // Bar strip
  const barIn = spring({ frame: frame - 10, fps, config: { damping: 20 } });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      {/* horizontal accent bars */}
      <div style={{
        position: "absolute", left: 0, top: 340, height: 2,
        width: `${barIn * 100}%`,
        background: "linear-gradient(90deg, transparent, rgba(103,232,249,0.6), transparent)"
      }}/>
      <div style={{
        position: "absolute", left: 0, top: 740, height: 2,
        width: `${barIn * 100}%`,
        background: "linear-gradient(90deg, transparent, rgba(232,115,74,0.5), transparent)"
      }}/>

      <div style={{ textAlign: "center", fontFamily: "'Instrument Serif', serif" }}>
        <div style={{
          fontSize: 140, lineHeight: 1.05, color: "#fff", fontWeight: 400,
          clipPath: `inset(0 ${100 - line1Reveal}% 0 0)`,
          letterSpacing: -2,
        }}>
          Socialinės valandos
        </div>
        <div style={{
          fontSize: 140, lineHeight: 1.05, color: COLORS.muted, fontWeight: 400,
          opacity: line2S, transform: `translateY(${(1 - line2S) * 30}px)`,
          letterSpacing: -2, marginTop: 8,
        }}>
          <span>be </span>
          <span style={{
            fontStyle: "italic",
            background: "linear-gradient(135deg,#f5a67a,#e8734a,#c44a20)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            display: "inline-block",
            transform: `scale(${0.6 + chaosoIn * 0.4})`,
          }}>chaoso</span>
        </div>

        <div style={{ marginTop: 40, height: 4, width: 260, margin: "40px auto 0",
          background: "linear-gradient(90deg,#67e8f9,#e8734a)", borderRadius: 99,
          transform: `scaleX(${underline})`, transformOrigin: "left center" }}/>

        <div style={{
          marginTop: 26, fontFamily: "Inter, sans-serif", fontSize: 22, color: COLORS.muted,
          opacity: interpolate(frame, [90, 120], [0, 1], { extrapolateRight: "clamp" }),
          letterSpacing: 4, fontWeight: 500,
        }}>
          PLATFORMA MOKSLEIVIAMS
        </div>
      </div>
    </AbsoluteFill>
  );
};
