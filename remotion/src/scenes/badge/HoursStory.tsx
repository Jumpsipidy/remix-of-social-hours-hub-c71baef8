import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { BadgeSpec } from "../../badges";
import { AppWindow, Backdrop, BG, body, clampIn, Confetti, display, Flash, Pointer, REVEAL, RevealCard, Shockwave, Vignette } from "./kit";

/**
 * HOURS — the student confirms a visit in the app, then the yearly goal ring
 * winds up and the hour counter races to the milestone.
 */
export const HoursStory: React.FC<{ badge: BadgeSpec }> = ({ badge }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const CLICK = 30;
  const target = badge.progress ?? 1;
  const count = badge.count ?? 1;

  const winIn = spring({ frame, fps, config: { damping: 18, stiffness: 130 } });
  const winOut = clampIn(frame, CLICK + 6, CLICK + 22);
  const ringIn = spring({ frame: frame - CLICK - 8, fps, config: { damping: 16, stiffness: 130 } });

  const fill = interpolate(frame, [CLICK + 12, 104], [0, target], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const shown = Math.round(interpolate(fill, [0, target], [0, count]));
  const storyOut = 1 - clampIn(frame, 104, 120);

  const R = 210;
  const C = 2 * Math.PI * R;
  const lap = Math.min(fill, 1);
  const over = Math.max(0, fill - 1);

  return (
    <AbsoluteFill style={{ background: BG }}>
      <Backdrop badge={badge} mood="rings" />

      <AbsoluteFill style={{ opacity: storyOut }}>
        {/* app confirmation card */}
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: 1 - winOut }}>
          <div style={{ transform: `scale(${interpolate(winIn, [0, 1], [0.82, 1]) * (1 - winOut * 0.14)})` }}>
            <AppWindow badge={badge} title="socialinesvalandos.dev / mokinys" width={720}>
              <p style={{ fontFamily: body, fontWeight: 700, fontSize: 26, color: "#8B94A8", margin: 0 }}>
                Organizacija patvirtino tavo vizitą
              </p>
              <p style={{ fontFamily: display, fontSize: 62, color: "#F2F5FB", margin: "10px 0 24px" }}>
                +{count > 20 ? 4 : count} val.
              </p>
              <div
                style={{
                  height: 76,
                  borderRadius: 22,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: body,
                  fontWeight: 700,
                  fontSize: 28,
                  color: BG,
                  background: `linear-gradient(120deg, ${badge.from}, ${badge.to})`,
                  transform: `scale(${frame >= CLICK && frame < CLICK + 6 ? 0.96 : 1})`,
                }}
              >
                Įskaityti valandas
              </div>
            </AppWindow>
          </div>
        </AbsoluteFill>

        <Pointer
          path={[
            { frame: 8, x: 760, y: 880 },
            { frame: CLICK, x: 540, y: 700, click: true },
            { frame: CLICK + 16, x: 540, y: 700 },
          ]}
          hideAt={CLICK + 18}
        />

        {/* goal ring */}
        <AbsoluteFill
          style={{
            alignItems: "center",
            justifyContent: "center",
            opacity: ringIn,
            transform: `scale(${interpolate(ringIn, [0, 1], [0.7, 1])})`,
          }}
        >
          <svg width={560} height={560} style={{ transform: "rotate(-90deg)" }}>
            <circle cx={280} cy={280} r={R} stroke="#FFFFFF12" strokeWidth={30} fill="none" />
            <circle
              cx={280}
              cy={280}
              r={R}
              stroke={badge.to}
              strokeWidth={30}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - lap)}
              style={{ filter: `drop-shadow(0 0 26px ${badge.to})` }}
            />
            {over > 0 && (
              <circle
                cx={280}
                cy={280}
                r={R - 44}
                stroke={badge.from}
                strokeWidth={16}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={2 * Math.PI * (R - 44)}
                strokeDashoffset={2 * Math.PI * (R - 44) * (1 - Math.min(1, over))}
                style={{ filter: `drop-shadow(0 0 20px ${badge.from})` }}
              />
            )}
          </svg>
          <div style={{ position: "absolute", textAlign: "center" }}>
            <p
              style={{
                fontFamily: display,
                fontSize: 190,
                lineHeight: 1,
                margin: 0,
                color: "#F5F7FF",
                fontVariantNumeric: "tabular-nums",
                textShadow: `0 0 60px ${badge.to}88`,
              }}
            >
              {shown}
            </p>
            <p
              style={{
                fontFamily: body,
                fontWeight: 700,
                fontSize: 30,
                letterSpacing: 8,
                textTransform: "uppercase",
                color: badge.to,
                margin: 0,
              }}
            >
              {badge.unit ?? "val."}
            </p>
          </div>
        </AbsoluteFill>
      </AbsoluteFill>

      <Shockwave color={badge.to} at={104} size={420} />
      <Confetti from={badge.from} to={badge.to} at={106} originY={0.45} />
      <Flash at={104} strength={0.5} />
      <RevealCard badge={badge} start={REVEAL} />
      <Vignette />
    </AbsoluteFill>
  );
};
