import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, random, Easing } from "remotion";
import { loadFont as loadDisplay } from "@remotion/google-fonts/Sora";
import { loadFont as loadBody } from "@remotion/google-fonts/Manrope";
import * as Icons from "lucide-react";
import { LT_GREEN, LT_RED, LT_YELLOW, type BadgeSpec } from "../badges";

const display = loadDisplay("normal", { weights: ["800"], subsets: ["latin", "latin-ext"] }).fontFamily;
const body = loadBody("normal", { weights: ["500", "700"], subsets: ["latin", "latin-ext"] }).fontFamily;

const BG = "#07080C";

/* ── layer: slow parallax grid ─────────────────────────────────────────── */
const Grid: React.FC<{ tint: string }> = ({ tint }) => {
  const frame = useCurrentFrame();
  const y = (frame * 0.6) % 60;
  return (
    <AbsoluteFill
      style={{
        opacity: 0.18,
        backgroundImage: `linear-gradient(${tint}55 1px, transparent 1px), linear-gradient(90deg, ${tint}55 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
        transform: `translateY(${y}px) scale(1.2)`,
        maskImage: "radial-gradient(70% 60% at 50% 45%, #000 20%, transparent 80%)",
        WebkitMaskImage: "radial-gradient(70% 60% at 50% 45%, #000 20%, transparent 80%)",
      }}
    />
  );
};

/* ── layer: rotating light rays behind the medal ───────────────────────── */
const Rays: React.FC<{ from: string; to: string }> = ({ from, to }) => {
  const frame = useCurrentFrame();
  const inn = interpolate(frame, [10, 34], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          position: "absolute",
          top: 300,
          width: 1500,
          height: 1500,
          opacity: 0.4 * inn,
          transform: `rotate(${frame * 0.35}deg) scale(${0.6 + inn * 0.4})`,
          background: `repeating-conic-gradient(from 0deg, ${from}00 0deg 7deg, ${to}55 7deg 10deg)`,
          borderRadius: "50%",
          maskImage: "radial-gradient(closest-side, #000 25%, transparent 72%)",
          WebkitMaskImage: "radial-gradient(closest-side, #000 25%, transparent 72%)",
        }}
      />
    </AbsoluteFill>
  );
};

/* ── layer: shockwave ring on impact ───────────────────────────────────── */
const Shockwave: React.FC<{ color: string; at: number }> = ({ color, at }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [at, at + 26], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (frame < at) return null;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          position: "absolute",
          top: 300,
          width: 340,
          height: 340,
          borderRadius: "50%",
          border: `${14 * (1 - t)}px solid ${color}`,
          opacity: (1 - t) * 0.9,
          transform: `scale(${0.5 + t * 3.4})`,
        }}
      />
    </AbsoluteFill>
  );
};

/* ── layer: sparkle glints + slim confetti ─────────────────────────────── */
const Particles: React.FC<{ from: string; to: string }> = ({ from, to }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  return (
    <AbsoluteFill>
      {new Array(70).fill(0).map((_, i) => {
        const s = `p${i}`;
        const ang = random(s + "a") * Math.PI * 2;
        const dist = (0.32 + random(s + "r") * 0.62) * width * 0.62;
        const delay = 14 + random(s + "d") * 20;
        const p = spring({ frame: frame - delay, fps, config: { damping: 200 }, durationInFrames: 60 });
        const fall = interpolate(frame - delay, [0, 100], [0, height * 0.85], { extrapolateLeft: "clamp" });
        const op = interpolate(frame - delay, [0, 6, 66, 100], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const isGlint = i % 3 === 0;
        const c = [from, to, "#FFFFFF", LT_GREEN][i % 4];
        const size = isGlint ? 6 + random(s + "w") * 8 : 5 + random(s + "w") * 5;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: width / 2,
              top: height * 0.36,
              width: size,
              height: isGlint ? size : size * 3.4,
              borderRadius: isGlint ? "50%" : 2,
              background: c,
              boxShadow: isGlint ? `0 0 ${size * 2.5}px ${c}` : "none",
              opacity: op,
              transform: `translate(${Math.cos(ang) * dist * p}px, ${Math.sin(ang) * dist * p * 0.8 + fall}px) rotate(${(frame - delay) * (3 + random(s + "rr") * 9)}deg)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/* ── word-by-word kinetic title ────────────────────────────────────────── */
const KineticTitle: React.FC<{ text: string; from: string; to: string; start: number; size: number }> = ({
  text, from, to, start, size,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0 22px", marginTop: 16 }}>
      {text.split(" ").map((w, i) => {
        const s = spring({ frame: frame - start - i * 4, fps, config: { damping: 18, stiffness: 160 }, durationInFrames: 30 });
        return (
          <span key={i} style={{ overflow: "hidden", display: "inline-block", paddingBottom: 8 }}>
            <span
              style={{
                display: "inline-block",
                fontFamily: display,
                fontSize: size,
                lineHeight: 1.04,
                backgroundImage: `linear-gradient(100deg, ${from}, ${to} 60%, ${from})`,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                transform: `translateY(${(1 - s) * 110}%) rotate(${(1 - s) * -4}deg)`,
                opacity: s,
              }}
            >
              {w}
            </span>
          </span>
        );
      })}
    </div>
  );
};

export const BadgeClip: React.FC<{ badge: BadgeSpec }> = ({ badge }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width } = useVideoConfig();
  const Icon =
    (Icons as unknown as Record<string, React.FC<{ size?: number; color?: string; strokeWidth?: number }>>)[badge.icon] ??
    Icons.Trophy;

  const IMPACT = 16;
  const pop = spring({ frame: frame - IMPACT, fps, config: { damping: 10, stiffness: 240 } });
  const iconScale = interpolate(pop, [0, 1], [0.15, 1]);
  const iconRot = interpolate(pop, [0, 1], [-55, 0]);
  const breathe = 1 + Math.sin(frame / 14) * 0.025;
  const float = Math.sin(frame / 22) * 10;

  // camera: slow push-in on the whole frame
  const push = interpolate(frame, [0, durationInFrames], [1.06, 1.0], { easing: Easing.out(Easing.cubic) });

  // white impact flash
  const flash = interpolate(frame, [IMPACT, IMPACT + 3, IMPACT + 14], [0, 0.55, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // shine sweep across the medal
  const shine = interpolate(frame, [IMPACT + 12, IMPACT + 40], [-140, 140], { extrapolateRight: "clamp" });

  const kicker = spring({ frame: frame - 24, fps, config: { damping: 200 }, durationInFrames: 18 });
  const subIn = spring({ frame: frame - 48, fps, config: { damping: 200 }, durationInFrames: 24 });
  const railIn = interpolate(frame, [54, 78], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const outro = interpolate(frame, [durationInFrames - 14, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });

  const ghost = badge.big ?? "";

  return (
    <AbsoluteFill style={{ background: BG, opacity: outro }}>
      <AbsoluteFill style={{ transform: `scale(${push})` }}>
        {/* ambient gradient */}
        <AbsoluteFill
          style={{
            background: `radial-gradient(46% 40% at 50% 36%, ${badge.from}3D, transparent 70%), radial-gradient(70% 46% at 50% 104%, ${badge.to}26, transparent 72%)`,
            transform: `scale(${1 + Math.sin(frame / 34) * 0.05})`,
          }}
        />
        <Grid tint={badge.to} />
        <Rays from={badge.from} to={badge.to} />
        <Shockwave color={badge.to} at={IMPACT} />
        <Shockwave color={badge.from} at={IMPACT + 8} />
        <Particles from={badge.from} to={badge.to} />

        {/* giant ghost number for streaks */}
        {ghost && (
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
            <span
              style={{
                fontFamily: display,
                fontSize: 760,
                lineHeight: 1,
                color: "transparent",
                WebkitTextStroke: `3px ${badge.to}22`,
                transform: `translateY(${-40 + float * 0.6}px) scale(${interpolate(pop, [0, 1], [1.25, 1])})`,
                opacity: 0.9,
              }}
            >
              {ghost}
            </span>
          </AbsoluteFill>
        )}

        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 80, textAlign: "center" }}>
          {/* medal */}
          <div
            style={{
              position: "relative",
              width: 300,
              height: 300,
              marginTop: -40,
              transform: `translateY(${float}px) scale(${iconScale * breathe}) rotate(${iconRot}deg)`,
            }}
          >
            {/* conic halo */}
            <div
              style={{
                position: "absolute",
                inset: -16,
                borderRadius: 96,
                background: `conic-gradient(from ${frame * 3}deg, ${badge.from}, ${badge.to}, ${LT_GREEN}, ${badge.from})`,
                filter: "blur(14px)",
                opacity: 0.85,
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 84,
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: `linear-gradient(150deg, ${badge.from}, ${badge.to})`,
                boxShadow: `0 50px 140px ${badge.from}55, inset 0 -10px 40px #00000033`,
              }}
            >
              {badge.big ? (
                <span style={{ fontFamily: display, fontSize: badge.big.length > 1 ? 150 : 185, color: BG, lineHeight: 1 }}>
                  {badge.big}
                </span>
              ) : (
                <Icon size={146} color={BG} strokeWidth={2.1} />
              )}
              {/* shine sweep */}
              <div
                style={{
                  position: "absolute",
                  top: -80,
                  left: shine,
                  width: 90,
                  height: 460,
                  background: "linear-gradient(90deg, transparent, #ffffff88, transparent)",
                  transform: "rotate(18deg)",
                }}
              />
            </div>
          </div>

          {/* kicker */}
          <p
            style={{
              fontFamily: body,
              fontWeight: 700,
              letterSpacing: 12,
              textTransform: "uppercase",
              fontSize: 24,
              color: badge.to,
              marginTop: 70,
              opacity: kicker,
              transform: `translateY(${(1 - kicker) * 18}px)`,
            }}
          >
            {badge.kind === "streak" ? "Serija tęsiasi" : "Naujas pasiekimas"}
          </p>

          <KineticTitle
            text={badge.title}
            from={badge.from}
            to={badge.to}
            start={30}
            size={badge.title.length > 18 ? 82 : 104}
          />

          <p
            style={{
              fontFamily: body,
              fontWeight: 500,
              fontSize: 36,
              color: "#C7CDDA",
              marginTop: 14,
              maxWidth: 880,
              opacity: subIn,
              transform: `translateY(${(1 - subIn) * 18}px)`,
            }}
          >
            {badge.subtitle}
          </p>

          {/* tricolour rail */}
          <div style={{ display: "flex", gap: 10, marginTop: 46 }}>
            {[LT_YELLOW, LT_GREEN, LT_RED].map((c, i) => {
              const w = interpolate(railIn, [0, 1], [0, [120, 80, 50][i]!]);
              return <div key={c} style={{ height: 8, width: w, borderRadius: 99, background: c, opacity: 0.9 }} />;
            })}
          </div>
        </AbsoluteFill>

        {/* vignette */}
        <AbsoluteFill
          style={{ boxShadow: `inset 0 0 ${width * 0.3}px ${width * 0.05}px #000000aa`, pointerEvents: "none" }}
        />
      </AbsoluteFill>

      {/* impact flash */}
      <AbsoluteFill style={{ background: "#FFFFFF", opacity: flash }} />
    </AbsoluteFill>
  );
};
