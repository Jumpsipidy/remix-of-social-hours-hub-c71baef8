import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { BadgeSpec } from "../../badges";
import { Backdrop, BG, body, clampIn, Confetti, display, Flash, lucide, REVEAL, RevealCard, Shockwave, Vignette } from "./kit";

const DAYS = ["P", "A", "T", "K", "P", "Š", "S"];

/**
 * STREAK — a calendar grid ignites day by day while a flame comet races along
 * the chain and the day count slams in behind it.
 */
export const StreakStory: React.FC<{ badge: BadgeSpec }> = ({ badge }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const Flame = lucide("Flame");

  const total = badge.count ?? 7;
  const cells = Math.min(total, 28);
  const cols = cells <= 7 ? cells : 7;
  const rows = Math.ceil(cells / cols);
  const START = 14;
  const SPAN = 74;
  const GAP = SPAN / cells;

  const size = cols <= 3 ? 200 : cols <= 5 ? 150 : 118;
  const pad = 16;

  const gridIn = spring({ frame, fps, config: { damping: 18, stiffness: 130 } });
  const lit = Math.max(0, Math.min(cells, Math.floor((frame - START) / GAP) + 1));
  const storyOut = 1 - clampIn(frame, 100, 118);
  const bigIn = spring({ frame: frame - 84, fps, config: { damping: 12, stiffness: 180 } });

  return (
    <AbsoluteFill style={{ background: BG }}>
      <Backdrop badge={badge} mood="beams" />

      <AbsoluteFill style={{ opacity: storyOut }}>
        {/* ghost day number rising behind the grid */}
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <span
            style={{
              fontFamily: display,
              fontSize: 720,
              lineHeight: 1,
              color: "transparent",
              WebkitTextStroke: `4px ${badge.to}2E`,
              transform: `scale(${interpolate(bigIn, [0, 1], [1.35, 1])})`,
              opacity: bigIn * 0.95,
            }}
          >
            {badge.big ?? total}
          </span>
        </AbsoluteFill>

        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div
            style={{
              transform: `scale(${interpolate(gridIn, [0, 1], [0.8, 1])})`,
              opacity: gridIn,
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontFamily: body,
                fontWeight: 700,
                fontSize: 26,
                letterSpacing: 10,
                textTransform: "uppercase",
                color: badge.to,
                marginBottom: 26,
              }}
            >
              Prisijungimų serija
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${cols}, ${size}px)`,
                gap: pad,
                justifyContent: "center",
              }}
            >
              {new Array(cells).fill(0).map((_, i) => {
                const at = START + i * GAP;
                const on = i < lit;
                const pop = spring({ frame: frame - at, fps, config: { damping: 12, stiffness: 260 } });
                const glow = on ? Math.max(0, 1 - (frame - at) / 26) : 0;
                return (
                  <div
                    key={i}
                    style={{
                      width: size,
                      height: size,
                      borderRadius: size * 0.28,
                      display: "grid",
                      placeItems: "center",
                      background: on ? `linear-gradient(150deg, ${badge.from}, ${badge.to})` : "#FFFFFF0A",
                      border: on ? "none" : "1px solid #FFFFFF14",
                      transform: `scale(${on ? 0.86 + pop * 0.14 + glow * 0.14 : 0.86})`,
                      boxShadow: on ? `0 0 ${26 + glow * 50}px ${badge.to}${on ? "99" : "00"}` : "none",
                      transition: "none",
                    }}
                  >
                    {on ? (
                      <Flame size={size * 0.52} color={BG} strokeWidth={2.3} />
                    ) : (
                      <span
                        style={{
                          fontFamily: body,
                          fontWeight: 700,
                          fontSize: size * 0.28,
                          color: "#5C6478",
                        }}
                      >
                        {DAYS[i % 7]}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div
              style={{
                marginTop: 34,
                display: "inline-flex",
                alignItems: "baseline",
                gap: 14,
                padding: "14px 34px",
                borderRadius: 999,
                background: "#0B0E15CC",
                border: `1px solid ${badge.to}33`,
              }}
            >
              <span style={{ fontFamily: display, fontSize: 78, color: "#F5F7FF", lineHeight: 1 }}>{lit}</span>
              <span style={{ fontFamily: body, fontWeight: 700, fontSize: 26, color: badge.to, letterSpacing: 5 }}>
                DIENOS IŠ EILĖS
              </span>
            </div>
          </div>
        </AbsoluteFill>

        {/* heat haze rising */}
        <AbsoluteFill
          style={{
            background: `radial-gradient(60% 30% at 50% 100%, ${badge.to}33, transparent 70%)`,
            opacity: 0.6 + Math.sin(frame / 9) * 0.15,
          }}
        />
      </AbsoluteFill>

      <Shockwave color={badge.to} at={100} size={420} />
      <Confetti from={badge.from} to={badge.to} at={102} originY={0.45} />
      <Flash at={100} strength={0.55} />
      <RevealCard badge={badge} start={REVEAL} />
      <Vignette />
    </AbsoluteFill>
  );
};
