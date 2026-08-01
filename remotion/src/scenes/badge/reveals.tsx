import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, random } from "remotion";
import { LT_GREEN, LT_RED, LT_YELLOW, type BadgeSpec } from "../../badges";
import { BG, body, clampIn, display, KineticTitle, lucide, RevealCard, REVEAL } from "./kit";

/** Rubber-stamp slam: title crashes in at an angle with ink spray. */
export const RevealStamp: React.FC<{ badge: BadgeSpec; start?: number }> = ({ badge, start = REVEAL }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < start - 2) return null;
  const t = frame - start;
  const slam = spring({ frame: t, fps, config: { damping: 13, stiffness: 320 }, durationInFrames: 26 });
  const scale = interpolate(slam, [0, 1], [3.1, 1]);
  const rot = interpolate(slam, [0, 1], [-16, -3]);
  const sub = spring({ frame: t - 22, fps, config: { damping: 200 }, durationInFrames: 22 });
  const line = clampIn(frame, start + 26, start + 48);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 80 }}>
      {t >= 0 &&
        new Array(26).fill(0).map((_, i) => {
          const a = random("ink" + i) * Math.PI * 2;
          const d = (0.2 + random("ind" + i)) * 420;
          const p = clampIn(frame, start + 2, start + 26);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                width: 6 + random("is" + i) * 16,
                height: 6 + random("is" + i) * 16,
                borderRadius: "50%",
                background: i % 2 ? badge.to : badge.from,
                opacity: (1 - p) * 0.85,
                transform: `translate(${Math.cos(a) * d * p}px, ${Math.sin(a) * d * p}px)`,
              }}
            />
          );
        })}
      <div
        style={{
          transform: `scale(${scale}) rotate(${rot}deg)`,
          border: `9px solid ${badge.to}`,
          borderRadius: 22,
          padding: "26px 54px",
          background: "#0A0C13cc",
          boxShadow: `0 40px 120px ${badge.from}44`,
        }}
      >
        <span style={{ fontFamily: display, fontSize: badge.title.length > 16 ? 62 : 84, color: badge.to, letterSpacing: -1 }}>
          {badge.title.toUpperCase()}
        </span>
      </div>
      <p
        style={{
          fontFamily: body,
          fontWeight: 500,
          fontSize: 34,
          color: "#C7CDDA",
          marginTop: 40,
          maxWidth: 840,
          textAlign: "center",
          opacity: sub,
          transform: `translateY(${(1 - sub) * 20}px)`,
        }}
      >
        {badge.subtitle}
      </p>
      <div style={{ display: "flex", gap: 10, marginTop: 34 }}>
        {[LT_YELLOW, LT_GREEN, LT_RED].map((c, i) => (
          <div key={c} style={{ height: 8, width: interpolate(line, [0, 1], [0, [110, 74, 46][i]!]), borderRadius: 99, background: c }} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

/** Ticker reveal: full-bleed marquee band + big icon sliding from the side. */
export const RevealTicker: React.FC<{ badge: BadgeSpec; start?: number }> = ({ badge, start = REVEAL }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < start - 2) return null;
  const t = frame - start;
  const Icon = lucide(badge.icon);
  const bandIn = spring({ frame: t, fps, config: { damping: 200 }, durationInFrames: 20 });
  const iconIn = spring({ frame: t - 6, fps, config: { damping: 14, stiffness: 200 } });
  const sub = spring({ frame: t - 30, fps, config: { damping: 200 }, durationInFrames: 22 });
  const scroll = -(t * 4) % 700;

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          width: "150%",
          transform: `rotate(-4deg) scaleX(${bandIn})`,
          background: `linear-gradient(90deg, ${badge.from}, ${badge.to})`,
          padding: "18px 0",
          overflow: "hidden",
          boxShadow: `0 30px 100px ${badge.from}55`,
        }}
      >
        <div style={{ display: "flex", gap: 44, transform: `translateX(${scroll}px)`, whiteSpace: "nowrap" }}>
          {new Array(10).fill(0).map((_, i) => (
            <span key={i} style={{ fontFamily: display, fontSize: 40, color: BG, letterSpacing: 4 }}>
              {badge.kind === "streak" ? "SERIJA" : "PASIEKIMAS"} ✦
            </span>
          ))}
        </div>
      </div>

      <div
        style={{
          marginTop: 64,
        padding: "0 60px",
          display: "flex",
          alignItems: "center",
          gap: 30,
          transform: `translateX(${(1 - iconIn) * -420}px)`,
          opacity: iconIn,
        }}
      >
        <div
          style={{
            width: 128,
            height: 128,
            borderRadius: 40,
            background: `linear-gradient(150deg, ${badge.from}, ${badge.to})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `rotate(${interpolate(iconIn, [0, 1], [-40, 0])}deg)`,
          }}
        >
          <Icon size={68} color={BG} strokeWidth={2.2} />
        </div>
        <div style={{ maxWidth: 620 }}>
          <KineticTitle
            text={badge.title}
            from={badge.from}
            to={badge.to}
            start={start + 10}
            size={badge.title.length > 16 ? 48 : 64}
          />
        </div>
      </div>

      <p
        style={{
          fontFamily: body,
          fontSize: 32,
          color: "#C7CDDA",
          marginTop: 30,
          maxWidth: 820,
          textAlign: "center",
          opacity: sub,
          transform: `translateY(${(1 - sub) * 16}px)`,
        }}
      >
        {badge.subtitle}
      </p>
    </AbsoluteFill>
  );
};

export const Reveal: React.FC<{ badge: BadgeSpec; start?: number }> = ({ badge, start = REVEAL }) => {
  switch (badge.reveal) {
    case "stamp":
      return <RevealStamp badge={badge} start={start} />;
    case "ticker":
      return <RevealTicker badge={badge} start={start} />;
    case "plain":
      return <RevealCard badge={badge} start={start} medal={false} />;
    default:
      return <RevealCard badge={badge} start={start} />;
  }
};
