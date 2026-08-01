import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { BadgeSpec } from "../../badges";
import { Backdrop, BG, body, clampIn, Confetti, display, Flash, lucide, REVEAL, RevealCard, Shockwave, Vignette } from "./kit";

const NAMES = ["Ugnė", "Matas", "Gabija", "Jonas", "Rūta"];

/**
 * SOCIAL — friend avatars fly in around the student and light up a network
 * of connections, one handshake at a time.
 */
export const SocialStory: React.FC<{ badge: BadgeSpec }> = ({ badge }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const Heart = lucide("Heart");
  const You = lucide("User");

  const n = Math.min(badge.count ?? 3, NAMES.length);
  const START = 20;
  const GAP = Math.floor(66 / n);
  const R = 300;
  const CX = 540;
  const CY = 500;

  const meIn = spring({ frame: frame - 4, fps, config: { damping: 12, stiffness: 200 } });
  const storyOut = 1 - clampIn(frame, 100, 118);

  const nodes = new Array(n).fill(0).map((_, i) => {
    const ang = -Math.PI / 2 + (i / n) * Math.PI * 2 + (n === 1 ? Math.PI / 2 : 0);
    return { x: CX + Math.cos(ang) * R, y: CY + Math.sin(ang) * R, name: NAMES[i]!, at: START + i * GAP };
  });

  return (
    <AbsoluteFill style={{ background: BG }}>
      <Backdrop badge={badge} mood="dots" />

      <AbsoluteFill style={{ opacity: storyOut }}>
        <svg width={1080} height={1080} style={{ position: "absolute", inset: 0 }}>
          {nodes.map((nd, i) => {
            const t = clampIn(frame, nd.at + 6, nd.at + 24);
            return (
              <line
                key={i}
                x1={CX}
                y1={CY}
                x2={CX + (nd.x - CX) * t}
                y2={CY + (nd.y - CY) * t}
                stroke={badge.to}
                strokeWidth={5}
                opacity={0.75}
                style={{ filter: `drop-shadow(0 0 12px ${badge.to})` }}
              />
            );
          })}
          {/* travelling pulse dots */}
          {nodes.map((nd, i) => {
            const t = clampIn(frame, nd.at + 24, nd.at + 24 + 40);
            if (t <= 0 || t >= 1) return null;
            return (
              <circle
                key={`p${i}`}
                cx={CX + (nd.x - CX) * t}
                cy={CY + (nd.y - CY) * t}
                r={10}
                fill="#FFFFFF"
                opacity={1 - t}
              />
            );
          })}
        </svg>

        {/* me */}
        <div
          style={{
            position: "absolute",
            left: CX,
            top: CY,
            transform: `translate(-50%, -50%) scale(${meIn})`,
          }}
        >
          <div
            style={{
              width: 210,
              height: 210,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              background: `linear-gradient(150deg, ${badge.from}, ${badge.to})`,
              boxShadow: `0 0 90px ${badge.from}88`,
            }}
          >
            <You size={104} color={BG} strokeWidth={2.2} />
          </div>
          <div
            style={{
              position: "absolute",
              inset: -18,
              borderRadius: "50%",
              border: `3px solid ${badge.to}55`,
              transform: `scale(${1 + Math.sin(frame / 12) * 0.05})`,
            }}
          />
        </div>

        {/* friends */}
        {nodes.map((nd, i) => {
          const s = spring({ frame: frame - nd.at, fps, config: { damping: 11, stiffness: 220 } });
          if (frame < nd.at - 3) return null;
          const heart = clampIn(frame, nd.at + 20, nd.at + 60);
          return (
            <div key={i} style={{ position: "absolute", left: nd.x, top: nd.y, transform: "translate(-50%, -50%)" }}>
              <div
                style={{
                  width: 150,
                  height: 150,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  background: "#151A26",
                  border: `3px solid ${badge.to}`,
                  transform: `scale(${s})`,
                  opacity: s,
                  boxShadow: `0 0 50px ${badge.to}55`,
                  fontFamily: display,
                  fontSize: 62,
                  color: "#F2F5FB",
                }}
              >
                {nd.name[0]}
              </div>
              <p
                style={{
                  fontFamily: body,
                  fontWeight: 700,
                  fontSize: 26,
                  color: "#C7CDDA",
                  textAlign: "center",
                  marginTop: 12,
                  opacity: s,
                }}
              >
                {nd.name}
              </p>
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: -30,
                  transform: `translate(-50%, ${-heart * 70}px) scale(${heart > 0 ? 1 : 0})`,
                  opacity: Math.sin(heart * Math.PI),
                }}
              >
                <Heart size={54} color={badge.to} strokeWidth={2.6} />
              </div>
            </div>
          );
        })}

        {/* counter */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 96,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "baseline",
              gap: 14,
              padding: "14px 34px",
              borderRadius: 999,
              background: "#0B0E15CC",
              border: `1px solid ${badge.to}33`,
              opacity: interpolate(frame, [START, START + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            }}
          >
            <span style={{ fontFamily: display, fontSize: 72, color: "#F5F7FF", lineHeight: 1 }}>
              {Math.max(0, Math.min(n, Math.floor((frame - START) / GAP) + 1))}
            </span>
            <span style={{ fontFamily: body, fontWeight: 700, fontSize: 26, color: badge.to, letterSpacing: 5 }}>
              {(badge.unit ?? "draugai").toUpperCase()}
            </span>
          </div>
        </div>
      </AbsoluteFill>

      <Shockwave color={badge.from} at={100} size={400} />
      <Confetti from={badge.from} to={badge.to} at={102} originY={0.45} />
      <Flash at={100} strength={0.45} />
      <RevealCard badge={badge} start={REVEAL} />
      <Vignette />
    </AbsoluteFill>
  );
};
