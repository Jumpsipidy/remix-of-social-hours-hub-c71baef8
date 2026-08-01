import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, random } from "remotion";
import { loadFont as loadDisplay } from "@remotion/google-fonts/Sora";
import { loadFont as loadBody } from "@remotion/google-fonts/Manrope";
import * as Icons from "lucide-react";
import { LT_GREEN, LT_RED, LT_YELLOW, type BadgeSpec } from "../badges";

const display = loadDisplay("normal", { weights: ["800"], subsets: ["latin", "latin-ext"] }).fontFamily;
const body = loadBody("normal", { weights: ["500", "700"], subsets: ["latin", "latin-ext"] }).fontFamily;

const BG = "#0B0D12";

/** Tricolour bands that wipe across at the open. */
const Bands: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      {[LT_YELLOW, LT_GREEN, LT_RED].map((c, i) => {
        const p = interpolate(frame, [i * 2, 10 + i * 2, 20 + i * 2], [0, 1, 0], { extrapolateRight: "clamp" });
        return (
          <div
            key={c}
            style={{
              position: "absolute",
              top: `${i * 33.34}%`,
              left: 0,
              height: "33.34%",
              width: "100%",
              background: c,
              transform: `scaleX(${p})`,
              transformOrigin: i % 2 ? "right" : "left",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const Confetti: React.FC<{ from: string; to: string }> = ({ from, to }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  return (
    <AbsoluteFill>
      {new Array(54).fill(0).map((_, i) => {
        const seed = `c${i}`;
        const dx = (random(seed + "x") - 0.5) * width * 1.1;
        const dy = -height * (0.28 + random(seed + "y") * 0.5);
        const delay = 8 + random(seed + "d") * 16;
        const p = spring({ frame: frame - delay, fps, config: { damping: 200 }, durationInFrames: 55 });
        const fall = interpolate(frame - delay, [0, 90], [0, height * 0.9], { extrapolateLeft: "clamp" });
        const op = interpolate(frame - delay, [0, 6, 60, 92], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const c = [from, to, LT_GREEN][i % 3];
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: width / 2,
              top: height / 2,
              width: 8 + random(seed + "w") * 8,
              height: 14 + random(seed + "h") * 14,
              borderRadius: 3,
              background: c,
              opacity: op,
              transform: `translate(${dx * p}px, ${dy * p + fall}px) rotate(${(frame - delay) * (4 + random(seed + "r") * 8)}deg)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

export const BadgeClip: React.FC<{ badge: BadgeSpec }> = ({ badge }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const Icon = ((Icons as unknown as Record<string, React.FC<{ size?: number; color?: string; strokeWidth?: number }>>)[badge.icon]) ?? Icons.Trophy;

  const pop = spring({ frame: frame - 12, fps, config: { damping: 11, stiffness: 220 } });
  const iconScale = interpolate(pop, [0, 1], [0.2, 1]);
  const iconRot = interpolate(pop, [0, 1], [-40, 0]);
  const breathe = 1 + Math.sin(frame / 12) * 0.03;

  const titleIn = spring({ frame: frame - 26, fps, config: { damping: 200 }, durationInFrames: 22 });
  const subIn = spring({ frame: frame - 36, fps, config: { damping: 200 }, durationInFrames: 22 });
  const kicker = spring({ frame: frame - 20, fps, config: { damping: 200 }, durationInFrames: 18 });
  const outro = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill style={{ background: BG, opacity: outro }}>
      {/* ambient glow */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(48% 44% at 50% 42%, ${badge.from}44, transparent 70%), radial-gradient(60% 50% at 50% 100%, ${badge.to}22, transparent 70%)`,
          transform: `scale(${1 + Math.sin(frame / 30) * 0.05})`,
        }}
      />
      <Bands />
      <Confetti from={badge.from} to={badge.to} />

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 90, textAlign: "center" }}>
        {/* pulse rings */}
        {[0, 1, 2].map((r) => {
          const t = ((frame - 12 - r * 14) % 60) / 60;
          if (frame < 12 + r * 14) return null;
          return (
            <div
              key={r}
              style={{
                position: "absolute",
                width: 300,
                height: 300,
                marginBottom: 120,
                borderRadius: "50%",
                border: `3px solid ${[badge.from, badge.to, LT_GREEN][r]}`,
                opacity: (1 - t) * 0.55,
                transform: `scale(${0.7 + t * 1.5})`,
              }}
            />
          );
        })}

        <div
          style={{
            width: 260,
            height: 260,
            borderRadius: 72,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `linear-gradient(140deg, ${badge.from}, ${badge.to})`,
            boxShadow: `0 40px 120px ${badge.from}66`,
            transform: `scale(${iconScale * breathe}) rotate(${iconRot}deg)`,
          }}
        >
          {badge.big ? (
            <span style={{ fontFamily: display, fontSize: badge.big.length > 1 ? 130 : 160, color: "#0B0D12", lineHeight: 1 }}>{badge.big}</span>
          ) : (
            <Icon size={128} color="#0B0D12" strokeWidth={2.2} />
          )}
        </div>

        <p
          style={{
            fontFamily: body,
            fontWeight: 700,
            letterSpacing: 10,
            textTransform: "uppercase",
            fontSize: 26,
            color: "#8B93A7",
            marginTop: 64,
            opacity: kicker,
            transform: `translateY(${(1 - kicker) * 20}px)`,
          }}
        >
          {badge.kind === "streak" ? "Serija tęsiasi" : "Naujas pasiekimas"}
        </p>

        <h1
          style={{
            fontFamily: display,
            fontSize: badge.title.length > 18 ? 84 : 104,
            lineHeight: 1.05,
            margin: "14px 0 0",
            backgroundImage: `linear-gradient(100deg, ${badge.from}, ${badge.to} 60%, ${badge.from})`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            opacity: titleIn,
            transform: `translateY(${(1 - titleIn) * 34}px)`,
          }}
        >
          {badge.title}
        </h1>

        <p
          style={{
            fontFamily: body,
            fontWeight: 500,
            fontSize: 38,
            color: "#C7CDDA",
            marginTop: 18,
            maxWidth: 900,
            opacity: subIn,
            transform: `translateY(${(1 - subIn) * 22}px)`,
          }}
        >
          {badge.subtitle}
        </p>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
