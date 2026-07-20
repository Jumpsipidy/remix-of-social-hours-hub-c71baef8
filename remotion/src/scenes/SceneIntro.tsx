import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig } from "remotion";
import { Heart, COLORS, AmbientBg, interp } from "../ui/primitives";

export const SceneIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const heartScale = spring({ frame, fps, config: { damping: 12, stiffness: 140 } });
  const wordSocialines = spring({ frame: frame - 20, fps, config: { damping: 18 } });
  const wordValandos = spring({ frame: frame - 30, fps, config: { damping: 18 } });
  const outO = interp(frame, [70, 90], [1, 0]);
  const outY = interp(frame, [70, 90], [0, -30]);
  return (
    <AbsoluteFill style={{ opacity: outO, transform: `translateY(${outY}px)` }}>
      <AmbientBg />
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 999,
              background: "linear-gradient(135deg, #67e8f9, #22b8d4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: `scale(${heartScale})`,
              boxShadow: "0 20px 60px rgba(103,232,249,0.45)",
            }}
          >
            <Heart size={52} />
          </div>
          <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 800, fontSize: 68, letterSpacing: -1.5 }}>
            <span
              style={{
                display: "inline-block",
                opacity: wordSocialines,
                transform: `translateY(${(1 - wordSocialines) * 20}px)`,
                color: "#ffffff",
              }}
            >
              Socialinės{" "}
            </span>
            <span
              style={{
                display: "inline-block",
                opacity: wordValandos,
                transform: `translateY(${(1 - wordValandos) * 20}px)`,
                color: COLORS.cyan,
              }}
            >
              Valandos
            </span>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
