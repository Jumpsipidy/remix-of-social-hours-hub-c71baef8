import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, random } from "remotion";
import type { BadgeSpec } from "../../badges";
import { Backdrop, BG, body, clampIn, Confetti, display, Flash, lucide, REVEAL, RevealCard, Shockwave, Vignette } from "./kit";

const SPOTS = [
  { x: 0.24, y: 0.3, label: "Prieglauda" },
  { x: 0.7, y: 0.24, label: "Biblioteka" },
  { x: 0.5, y: 0.52, label: "Senelių namai" },
  { x: 0.78, y: 0.66, label: "Maisto bankas" },
  { x: 0.26, y: 0.7, label: "Parko talka" },
];

/**
 * ORGS — a stylised city map where a pin drops on each organisation the
 * student volunteered at, stitched together by a travelling dashed route.
 */
export const OrgStory: React.FC<{ badge: BadgeSpec }> = ({ badge }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const Pin = lucide("MapPin");

  const n = Math.min(badge.count ?? 3, SPOTS.length);
  const spots = SPOTS.slice(0, n);
  const START = 16;
  const GAP = Math.floor(76 / n);

  const mapIn = spring({ frame, fps, config: { damping: 18, stiffness: 120 } });
  const storyOut = 1 - clampIn(frame, 100, 118);

  const W = 860;
  const H = 700;
  const px = (s: { x: number; y: number }) => ({ x: s.x * W, y: s.y * H });

  return (
    <AbsoluteFill style={{ background: BG }}>
      <Backdrop badge={badge} mood="dots" />

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: storyOut }}>
        <div
          style={{
            position: "relative",
            width: W,
            height: H,
            borderRadius: 44,
            overflow: "hidden",
            background: "linear-gradient(160deg, #10141F, #0A0C13)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: `0 60px 160px #000000cc, 0 0 0 1px ${badge.to}18`,
            transform: `scale(${interpolate(mapIn, [0, 1], [0.85, 1])}) rotate(${interpolate(mapIn, [0, 1], [-2, 0])}deg)`,
            opacity: mapIn,
          }}
        >
          {/* roads */}
          <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
            {new Array(7).fill(0).map((_, i) => (
              <line
                key={`h${i}`}
                x1={0}
                y1={(i + 0.5) * (H / 7)}
                x2={W}
                y2={(i + 0.5) * (H / 7) + (random(`r${i}`) - 0.5) * 60}
                stroke="#FFFFFF0E"
                strokeWidth={random(`w${i}`) > 0.7 ? 12 : 5}
              />
            ))}
            {new Array(8).fill(0).map((_, i) => (
              <line
                key={`v${i}`}
                x1={(i + 0.5) * (W / 8)}
                y1={0}
                x2={(i + 0.5) * (W / 8) + (random(`c${i}`) - 0.5) * 50}
                y2={H}
                stroke="#FFFFFF0C"
                strokeWidth={random(`vw${i}`) > 0.75 ? 11 : 4}
              />
            ))}

            {/* route between pins */}
            {spots.slice(1).map((s, i) => {
              const a = px(spots[i]!);
              const b = px(s);
              const at = START + (i + 1) * GAP - GAP * 0.4;
              const t = clampIn(frame, at, at + GAP);
              const len = Math.hypot(b.x - a.x, b.y - a.y);
              return (
                <line
                  key={i}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={badge.to}
                  strokeWidth={4}
                  strokeDasharray={`14 12`}
                  strokeDashoffset={len * (1 - t) - frame * 1.6}
                  opacity={t * 0.85}
                  style={{ filter: `drop-shadow(0 0 10px ${badge.to}aa)` }}
                />
              );
            })}
          </svg>

          {/* pins */}
          {spots.map((s, i) => {
            const at = START + i * GAP;
            const drop = spring({ frame: frame - at, fps, config: { damping: 11, stiffness: 210 } });
            const p = px(s);
            if (frame < at - 4) return null;
            const ripple = clampIn(frame, at + 4, at + 30);
            return (
              <div key={s.label} style={{ position: "absolute", left: p.x, top: p.y }}>
                <div
                  style={{
                    position: "absolute",
                    left: -70,
                    top: -70,
                    width: 140,
                    height: 140,
                    borderRadius: "50%",
                    border: `3px solid ${badge.to}`,
                    opacity: (1 - ripple) * 0.7,
                    transform: `scale(${0.3 + ripple * 1.6})`,
                  }}
                />
                <div
                  style={{
                    transform: `translate(-50%, ${interpolate(drop, [0, 1], [-260, -100])}%) scale(${interpolate(drop, [0, 1], [0.5, 1])})`,
                    opacity: drop,
                    filter: `drop-shadow(0 10px 24px ${badge.from}88)`,
                  }}
                >
                  <Pin size={92} color={badge.to} strokeWidth={2.2} />
                </div>
                <div
                  style={{
                    position: "absolute",
                    left: 56,
                    top: -26,
                    padding: "8px 18px",
                    borderRadius: 999,
                    background: "#12161FEE",
                    border: `1px solid ${badge.to}44`,
                    fontFamily: body,
                    fontWeight: 700,
                    fontSize: 22,
                    color: "#E6EAF4",
                    whiteSpace: "nowrap",
                    opacity: clampIn(frame, at + 8, at + 20),
                    transform: `translateX(${(1 - clampIn(frame, at + 8, at + 20)) * -14}px)`,
                  }}
                >
                  {s.label}
                </div>
              </div>
            );
          })}

          {/* counter chip */}
          <div
            style={{
              position: "absolute",
              left: 34,
              bottom: 30,
              display: "flex",
              alignItems: "baseline",
              gap: 14,
              padding: "16px 30px",
              borderRadius: 26,
              background: "#0B0E15CC",
              border: `1px solid ${badge.to}33`,
            }}
          >
            <span style={{ fontFamily: display, fontSize: 78, color: "#F5F7FF", lineHeight: 1 }}>
              {Math.min(n, Math.max(0, Math.floor((frame - START) / GAP) + 1))}
            </span>
            <span style={{ fontFamily: body, fontWeight: 700, fontSize: 26, color: badge.to, letterSpacing: 4 }}>
              ORGANIZACIJOS
            </span>
          </div>
        </div>
      </AbsoluteFill>

      <Shockwave color={badge.from} at={100} size={380} />
      <Confetti from={badge.from} to={badge.to} at={102} originY={0.45} />
      <Flash at={100} strength={0.45} />
      <RevealCard badge={badge} start={REVEAL} />
      <Vignette />
    </AbsoluteFill>
  );
};
