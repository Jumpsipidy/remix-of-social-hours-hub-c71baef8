import React from "react";
import { AbsoluteFill, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { LT_GREEN, LT_RED, LT_YELLOW, type BadgeSpec } from "../../badges";
import { BG, body, clampIn, display, KineticTitle, lucide, REVEAL } from "./kit";

/** Shatter: the title assembles out of flying glass shards. */
export const RevealShatter: React.FC<{ badge: BadgeSpec; start?: number }> = ({ badge, start = REVEAL }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < start - 2) return null;
  const t = frame - start;
  const settle = spring({ frame: t, fps, config: { damping: 17, stiffness: 130 }, durationInFrames: 40 });
  const sub = spring({ frame: t - 28, fps, config: { damping: 200 }, durationInFrames: 22 });
  const Icon = lucide(badge.icon);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 70 }}>
      {new Array(34).fill(0).map((_, i) => {
        const a = random("sh" + i) * Math.PI * 2;
        const d = (0.3 + random("sd" + i)) * 620 * (1 - settle);
        const size = 18 + random("ss" + i) * 60;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              width: size,
              height: size * (0.4 + random("sr" + i)),
              background: i % 3 === 0 ? badge.to : `${badge.from}88`,
              opacity: 0.18 + (1 - settle) * 0.6,
              transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d}px) rotate(${a * 60 + t * 2}deg)`,
              clipPath: "polygon(0 0, 100% 22%, 78% 100%, 12% 76%)",
            }}
          />
        );
      })}
      <div
        style={{
          width: 150,
          height: 150,
          borderRadius: 46,
          background: `linear-gradient(150deg, ${badge.from}, ${badge.to})`,
          display: "grid",
          placeItems: "center",
          transform: `scale(${settle}) rotate(${(1 - settle) * 90}deg)`,
          boxShadow: `0 40px 120px ${badge.from}66`,
        }}
      >
        <Icon size={82} color={BG} strokeWidth={2.1} />
      </div>
      <div style={{ marginTop: 36, filter: `blur(${(1 - settle) * 14}px)`, opacity: settle }}>
        <KineticTitle text={badge.title} from={badge.from} to={badge.to} start={start + 8} size={badge.title.length > 16 ? 62 : 86} />
      </div>
      <p
        style={{
          fontFamily: body,
          fontSize: 32,
          color: "#C7CDDA",
          marginTop: 12,
          maxWidth: 820,
          textAlign: "center",
          opacity: sub,
        }}
      >
        {badge.subtitle}
      </p>
    </AbsoluteFill>
  );
};

/** Curtain: tricolour panels sweep across and pull back to expose the title. */
export const RevealCurtain: React.FC<{ badge: BadgeSpec; start?: number }> = ({ badge, start = REVEAL }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < start - 2) return null;
  const t = frame - start;
  const close = clampIn(frame, start, start + 12);
  const open = clampIn(frame, start + 16, start + 40);
  const sub = spring({ frame: t - 34, fps, config: { damping: 200 }, durationInFrames: 22 });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 70 }}>
      <div style={{ textAlign: "center", opacity: open }}>
        <p
          style={{
            fontFamily: body,
            fontWeight: 700,
            letterSpacing: 12,
            textTransform: "uppercase",
            fontSize: 22,
            color: badge.to,
            margin: 0,
          }}
        >
          {badge.kind === "streak" ? "Serija tęsiasi" : "Naujas pasiekimas"}
        </p>
        <div style={{ marginTop: 18 }}>
          <KineticTitle text={badge.title} from={badge.from} to={badge.to} start={start + 18} size={badge.title.length > 16 ? 68 : 92} />
        </div>
        <p style={{ fontFamily: body, fontSize: 32, color: "#C7CDDA", marginTop: 10, opacity: sub }}>{badge.subtitle}</p>
      </div>

      {[LT_YELLOW, LT_GREEN, LT_RED].map((c, i) => (
        <div
          key={c}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: `${i * 33.34}%`,
            height: "33.34%",
            background: c,
            transformOrigin: i % 2 ? "right" : "left",
            transform: `scaleX(${close * (1 - open)})`,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

/** Flip: a thick 3D card flips over from its back side to the title face. */
export const RevealFlip: React.FC<{ badge: BadgeSpec; start?: number }> = ({ badge, start = REVEAL }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < start - 2) return null;
  const t = frame - start;
  const flip = spring({ frame: t, fps, config: { damping: 20, stiffness: 90 }, durationInFrames: 42 });
  const deg = interpolate(flip, [0, 1], [180, 0]);
  const front = deg < 90;
  const Icon = lucide(badge.icon);
  const rail = clampIn(frame, start + 40, start + 60);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", perspective: 1600 }}>
      <div
        style={{
          width: 820,
          minHeight: 420,
          borderRadius: 40,
          padding: 56,
          transform: `rotateY(${deg}deg) scale(${0.86 + flip * 0.14})`,
          transformStyle: "preserve-3d",
          background: front ? "#0A0C13ee" : `linear-gradient(150deg, ${badge.from}, ${badge.to})`,
          border: `2px solid ${badge.to}55`,
          boxShadow: `0 60px 160px ${badge.from}55`,
          display: "grid",
          placeItems: "center",
          textAlign: "center",
        }}
      >
        {front ? (
          <div>
            <Icon size={92} color={badge.to} strokeWidth={2} />
            <div style={{ marginTop: 22 }}>
              <KineticTitle text={badge.title} from={badge.from} to={badge.to} start={start + 22} size={badge.title.length > 16 ? 58 : 78} />
            </div>
            <p style={{ fontFamily: body, fontSize: 30, color: "#C7CDDA", marginTop: 14 }}>{badge.subtitle}</p>
          </div>
        ) : (
          <span style={{ fontFamily: display, fontSize: 160, color: BG, transform: "scaleX(-1)" }}>?</span>
        )}
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 40 }}>
        {[LT_YELLOW, LT_GREEN, LT_RED].map((c, i) => (
          <div key={c} style={{ height: 8, width: interpolate(rail, [0, 1], [0, [120, 80, 50][i]!]), borderRadius: 99, background: c }} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

/** Banner: a hanging fabric banner unrolls downward with the title stitched on. */
export const RevealBanner: React.FC<{ badge: BadgeSpec; start?: number }> = ({ badge, start = REVEAL }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < start - 2) return null;
  const t = frame - start;
  const drop = spring({ frame: t, fps, config: { damping: 16, stiffness: 110 }, durationInFrames: 36 });
  const sway = Math.sin(frame / 18) * 1.4;
  const sub = spring({ frame: t - 26, fps, config: { damping: 200 }, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 60 }}>
      <div style={{ width: 780, height: 14, borderRadius: 8, background: "#C7CDDA", boxShadow: "0 12px 40px #000a" }} />
      <div
        style={{
          width: 700,
          transformOrigin: "top center",
          transform: `rotate(${sway}deg) scaleY(${drop})`,
          background: `linear-gradient(180deg, ${badge.from}, ${badge.to})`,
          padding: "60px 44px 90px",
          textAlign: "center",
          clipPath: "polygon(0 0, 100% 0, 100% 92%, 50% 100%, 0 92%)",
          boxShadow: `0 60px 160px ${badge.from}55`,
        }}
      >
        <p
          style={{
            fontFamily: body,
            fontWeight: 700,
            letterSpacing: 10,
            textTransform: "uppercase",
            fontSize: 20,
            color: BG,
            opacity: 0.75,
            margin: 0,
          }}
        >
          {badge.kind === "streak" ? "Serija" : "Pasiekimas"}
        </p>
        <p
          style={{
            fontFamily: display,
            fontSize: badge.title.length > 16 ? 56 : 76,
            color: BG,
            margin: "18px 0 0",
            lineHeight: 1.05,
            opacity: drop,
          }}
        >
          {badge.title}
        </p>
        <p style={{ fontFamily: body, fontWeight: 500, fontSize: 28, color: "#0A0C13cc", marginTop: 18, opacity: sub }}>
          {badge.subtitle}
        </p>
      </div>
    </AbsoluteFill>
  );
};
