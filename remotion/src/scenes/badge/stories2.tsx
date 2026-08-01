import React from "react";
import { AbsoluteFill, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { LT_GREEN, LT_RED, LT_YELLOW, type BadgeSpec } from "../../badges";
import { BG, body, clampIn, display, lucide } from "./kit";
import { Caption, Story, useCount } from "./stories";

/* ═══ 13. LADDER — climbing steps, a figure of light rises ═════════════ */
export const LadderStory: React.FC<{ badge: BadgeSpec }> = ({ badge }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const steps = Math.max(4, Math.min(badge.count ?? 6, 8));
  const climbed = Math.min(steps, Math.floor(clampIn(frame, 14, 92) * steps));
  return (
    <Story badge={badge} mood="grid">
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 210 }}>
        <div style={{ position: "relative", width: 820, height: 560 }}>
          {new Array(steps).fill(0).map((_, i) => {
            const s = spring({ frame: frame - 10 - i * 8, fps, config: { damping: 16, stiffness: 150 } });
            const on = i < climbed;
            const w = 140 + i * 12;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: 40 + i * 92,
                  bottom: i * 68,
                  width: w,
                  height: 26,
                  borderRadius: 8,
                  transformOrigin: "left bottom",
                  transform: `scaleX(${s})`,
                  background: on ? `linear-gradient(90deg, ${badge.from}, ${badge.to})` : "#FFFFFF14",
                  boxShadow: on ? `0 0 46px ${badge.to}66` : "none",
                }}
              />
            );
          })}
          {/* the climber */}
          <div
            style={{
              position: "absolute",
              left: 40 + climbed * 92 + 30,
              bottom: climbed * 68 + 26,
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: `radial-gradient(circle at 35% 30%, #fff, ${badge.to})`,
              boxShadow: `0 0 70px ${badge.to}`,
              transform: `translateY(${Math.sin(frame / 5) * -8}px)`,
            }}
          />
        </div>
        <span style={{ fontFamily: display, fontSize: 118, color: "#F2F5FF", marginTop: 10 }}>
          {useCount(badge.count ?? steps, 0, 16, 74)}
          <span style={{ fontSize: 42, color: badge.to, marginLeft: 12, fontFamily: body }}>{badge.unit}</span>
        </span>
      </AbsoluteFill>
      <Caption text="Pakopa po pakopos" color={badge.to} bottom={92} />
    </Story>
  );
};

/* ═══ 14. SUNRISE — a sun climbs over a tricolour horizon ═════════════ */
export const SunriseStory: React.FC<{ badge: BadgeSpec }> = ({ badge }) => {
  const frame = useCurrentFrame();
  const rise = clampIn(frame, 10, 96);
  const n = useCount(badge.count ?? 1, 0, 18, 76);
  return (
    <Story badge={badge} mood="rings">
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            left: "50%",
            marginLeft: -270,
            bottom: interpolate(rise, [0, 1], [-320, 320]),
            width: 540,
            height: 540,
            borderRadius: "50%",
            background: `radial-gradient(circle at 50% 40%, #FFF6D8, ${badge.to} 55%, ${badge.from})`,
            boxShadow: `0 0 220px ${badge.to}aa`,
          }}
        />
        {new Array(3).fill(0).map((_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: i * 92,
              height: 92,
              background: [LT_RED, LT_GREEN, LT_YELLOW][i]!,
              opacity: 0.9,
              transform: `translateY(${(1 - clampIn(frame, 20 + i * 8, 48 + i * 8)) * 120}px)`,
            }}
          />
        ))}
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <span
            style={{
              fontFamily: display,
              fontSize: 200,
              color: BG,
              opacity: clampIn(frame, 46, 70),
              mixBlendMode: "overlay",
            }}
          >
            {n}
          </span>
        </AbsoluteFill>
      </AbsoluteFill>
      <Caption text="Nauja pradžia" color="#FFF6D8" bottom={310} />
    </Story>
  );
};

/* ═══ 15. POLAROID — snapshots drop and stack on a table ══════════════ */
export const PolaroidStory: React.FC<{ badge: BadgeSpec }> = ({ badge }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const total = Math.max(3, Math.min(badge.count ?? 4, 6));
  const Icon = lucide(badge.icon);
  return (
    <Story badge={badge} mood="paper">
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        {new Array(total).fill(0).map((_, i) => {
          const at = 12 + i * 16;
          const s = spring({ frame: frame - at, fps, config: { damping: 14, stiffness: 180 } });
          const rot = (random("pr" + i) - 0.5) * 28;
          const dx = (random("px" + i) - 0.5) * 420;
          const dy = (random("py" + i) - 0.5) * 260;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                width: 330,
                padding: 16,
                paddingBottom: 56,
                background: "#F4F6FB",
                borderRadius: 6,
                boxShadow: "0 40px 90px #000a",
                transform: `translate(${dx}px, ${dy}px) rotate(${rot * s}deg) scale(${interpolate(s, [0, 1], [1.9, 1])})`,
                opacity: s,
              }}
            >
              <div
                style={{
                  height: 250,
                  borderRadius: 3,
                  background: `linear-gradient(155deg, ${badge.from}, ${badge.to})`,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Icon size={92} color={BG} strokeWidth={2} />
              </div>
              <p style={{ fontFamily: body, fontWeight: 700, fontSize: 22, color: "#1B2130", margin: "14px 4px 0" }}>
                #{i + 1} · {badge.unit}
              </p>
            </div>
          );
        })}
      </AbsoluteFill>
      <Caption text="Akimirkos, kurios liko" color={badge.to} bottom={72} />
    </Story>
  );
};

/* ═══ 16. VINYL — a record spins up, the needle drops ═════════════════ */
export const VinylStory: React.FC<{ badge: BadgeSpec }> = ({ badge }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const spin = interpolate(frame, [8, 100], [0, 900], { extrapolateLeft: "clamp" });
  const armIn = spring({ frame: frame - 26, fps, config: { damping: 18 } });
  return (
    <Story badge={badge} mood="rings">
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            width: 620,
            height: 620,
            borderRadius: "50%",
            background: `repeating-radial-gradient(circle, #0F131C 0 6px, #151A26 6px 12px)`,
            transform: `rotate(${spin}deg) scale(${clampIn(frame, 4, 26)})`,
            boxShadow: `0 0 130px ${badge.from}44`,
            display: "grid",
            placeItems: "center",
          }}
        >
          <div
            style={{
              width: 230,
              height: 230,
              borderRadius: "50%",
              background: `linear-gradient(150deg, ${badge.from}, ${badge.to})`,
              display: "grid",
              placeItems: "center",
            }}
          >
            <span style={{ fontFamily: display, fontSize: 96, color: BG, transform: `rotate(${-spin}deg)` }}>
              {badge.big ?? badge.count}
            </span>
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            right: 150,
            top: 190,
            width: 26,
            height: 320,
            borderRadius: 14,
            background: "linear-gradient(180deg, #C7CDDA, #6C7488)",
            transformOrigin: "top center",
            transform: `rotate(${interpolate(armIn, [0, 1], [-38, -8])}deg)`,
            boxShadow: "0 20px 60px #000a",
          }}
        />
      </AbsoluteFill>
      <Caption text="Ritmas įsuktas" color={badge.to} bottom={86} />
    </Story>
  );
};

/* ═══ 17. SEED — a sapling sprouts and branches out ═══════════════════ */
export const SeedStory: React.FC<{ badge: BadgeSpec }> = ({ badge }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const grow = clampIn(frame, 12, 88);
  const leaves = Math.max(4, Math.min(badge.count ?? 6, 9));
  return (
    <Story badge={badge} mood="dots">
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 180 }}>
        <svg width={900} height={700}>
          <path
            d={`M450 700 C 450 ${700 - 260 * grow}, 430 ${700 - 380 * grow}, 450 ${700 - 520 * grow}`}
            stroke={badge.to}
            strokeWidth={16}
            fill="none"
            strokeLinecap="round"
          />
          {new Array(leaves).fill(0).map((_, i) => {
            const p = (i + 1) / (leaves + 1);
            const y = 700 - 520 * grow * p;
            const dir = i % 2 ? 1 : -1;
            const s = spring({ frame: frame - 20 - i * 8, fps, config: { damping: 13, stiffness: 200 } });
            return (
              <ellipse
                key={i}
                cx={450 + dir * 90 * s}
                cy={y}
                rx={70 * s}
                ry={30 * s}
                fill={i % 3 === 0 ? LT_YELLOW : LT_GREEN}
                opacity={0.9}
                transform={`rotate(${dir * 18} 450 ${y})`}
              />
            );
          })}
        </svg>
        <span style={{ fontFamily: display, fontSize: 108, color: "#F2F5FF" }}>
          {useCount(badge.count ?? leaves, 0, 20, 70)}
          <span style={{ fontSize: 40, color: badge.to, marginLeft: 12, fontFamily: body }}>{badge.unit}</span>
        </span>
      </AbsoluteFill>
      <Caption text="Auga iš tavęs" color={badge.to} bottom={82} />
    </Story>
  );
};

/* ═══ 18. MOSAIC — tiles flip over to form a giant number ═════════════ */
export const MosaicStory: React.FC<{ badge: BadgeSpec }> = ({ badge }) => {
  const frame = useCurrentFrame();
  const cols = 9;
  const rows = 9;
  return (
    <Story badge={badge} mood="grid" confetti={false}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            position: "relative",
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, 84px)`,
            gridAutoRows: 84,
            gap: 8,
            perspective: 1200,
          }}
        >
          {new Array(cols * rows).fill(0).map((_, i) => {
            const at = 8 + random("mt" + i) * 62;
            const t = clampIn(frame, at, at + 16);
            const c = [badge.from, badge.to, LT_YELLOW][i % 3]!;
            return (
              <div
                key={i}
                style={{
                  borderRadius: 10,
                  transform: `rotateY(${(1 - t) * 180}deg)`,
                  background: t > 0.5 ? c : "#FFFFFF0D",
                  opacity: t > 0.5 ? 0.85 : 1,
                  boxShadow: t > 0.5 ? `0 0 24px ${c}44` : "none",
                }}
              />
            );
          })}
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
            <span
              style={{
                fontFamily: display,
                fontSize: 300,
                color: BG,
                textShadow: `0 0 60px #000`,
                opacity: clampIn(frame, 52, 76),
              }}
            >
              {badge.big ?? badge.count}
            </span>
          </div>
        </div>
      </AbsoluteFill>
      <Caption text="Viskas susidėliojo" color={badge.to} bottom={66} />
    </Story>
  );
};

/* ═══ 19. ROCKET — countdown, ignition, liftoff ═══════════════════════ */
export const RocketStory: React.FC<{ badge: BadgeSpec }> = ({ badge }) => {
  const frame = useCurrentFrame();
  const launch = clampIn(frame, 46, 100);
  const cd = Math.max(0, 3 - Math.floor(frame / 14));
  const Icon = lucide("Rocket");
  return (
    <Story badge={badge} mood="beams">
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        {frame < 44 && (
          <span
            style={{
              position: "absolute",
              fontFamily: display,
              fontSize: 340,
              color: "transparent",
              WebkitTextStroke: `4px ${badge.to}`,
              transform: `scale(${1.4 - (frame % 14) / 34})`,
              opacity: 1 - (frame % 14) / 18,
            }}
          >
            {cd + 1}
          </span>
        )}
        <div
          style={{
            position: "absolute",
            transform: `translateY(${interpolate(launch, [0, 1], [180, -760])}px) rotate(-8deg)`,
            filter: `drop-shadow(0 0 40px ${badge.to})`,
          }}
        >
          <Icon size={220} color={badge.to} strokeWidth={1.8} />
        </div>
        {launch > 0 &&
          new Array(40).fill(0).map((_, i) => {
            const p = ((frame * (4 + random("ex" + i) * 8)) % 500) / 500;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: 540 + (random("ea" + i) - 0.5) * 200,
                  top: 620 + p * 420 - launch * 700,
                  width: 14 + random("es" + i) * 26,
                  height: 14 + random("es" + i) * 26,
                  borderRadius: "50%",
                  background: i % 2 ? LT_YELLOW : LT_RED,
                  opacity: (1 - p) * 0.7 * launch,
                  filter: "blur(3px)",
                }}
              />
            );
          })}
      </AbsoluteFill>
      <Caption text="Startas" color={badge.to} bottom={110} at={44} />
    </Story>
  );
};

/* ═══ 20. CLOCKWORK — gears turn, hands sweep a full circle ═══════════ */
export const ClockworkStory: React.FC<{ badge: BadgeSpec }> = ({ badge }) => {
  const frame = useCurrentFrame();
  const sweep = clampIn(frame, 10, 94);
  const n = useCount(badge.count ?? 10, 0, 14, 78);
  const teeth = 14;
  const Gear = ({ size, x, y, dir }: { size: number; x: number; y: number; dir: number }) => (
    <div style={{ position: "absolute", left: x, top: y, width: size, height: size, transform: `rotate(${frame * dir}deg)` }}>
      {new Array(teeth).fill(0).map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: size * 0.13,
            height: size * 0.5,
            marginLeft: -size * 0.065,
            background: `${badge.to}55`,
            transformOrigin: "center top",
            transform: `rotate(${(i / teeth) * 360}deg)`,
            borderRadius: 6,
          }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          inset: size * 0.16,
          borderRadius: "50%",
          border: `${size * 0.06}px solid ${badge.to}44`,
        }}
      />
    </div>
  );
  return (
    <Story badge={badge} mood="rings">
      <AbsoluteFill>
        <Gear size={420} x={60} y={90} dir={0.6} />
        <Gear size={300} x={720} y={640} dir={-0.9} />
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <svg width={520} height={520}>
            <circle cx={260} cy={260} r={240} stroke={`${badge.to}33`} strokeWidth={10} fill="none" />
            <circle
              cx={260}
              cy={260}
              r={240}
              stroke={badge.to}
              strokeWidth={14}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 240}
              strokeDashoffset={2 * Math.PI * 240 * (1 - sweep)}
              transform="rotate(-90 260 260)"
            />
          </svg>
          <div style={{ position: "absolute", display: "grid", placeItems: "center" }}>
            <span style={{ fontFamily: display, fontSize: 150, color: "#F2F5FF" }}>{n}</span>
            <span style={{ fontFamily: body, fontWeight: 700, fontSize: 34, color: badge.to, letterSpacing: 6 }}>
              {badge.unit}
            </span>
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
      <Caption text="Laikas, kurį atidavei" color={badge.to} bottom={72} />
    </Story>
  );
};

/* ═══ 21. RIBBON — a tricolour ribbon snakes across and ties a bow ════ */
export const RibbonStory: React.FC<{ badge: BadgeSpec }> = ({ badge }) => {
  const frame = useCurrentFrame();
  const draw = clampIn(frame, 8, 84);
  const len = 3400;
  const path =
    "M -60 760 C 240 420, 380 900, 640 560 S 980 240, 1180 420";
  return (
    <Story badge={badge} mood="beams">
      <AbsoluteFill>
        <svg width={1080} height={1080}>
          {[LT_YELLOW, LT_GREEN, LT_RED].map((c, i) => (
            <path
              key={c}
              d={path}
              stroke={c}
              strokeWidth={34}
              fill="none"
              strokeLinecap="round"
              opacity={0.92}
              transform={`translate(0 ${(i - 1) * 42})`}
              strokeDasharray={len}
              strokeDashoffset={len * (1 - clampIn(frame, 8 + i * 6, 84 + i * 6))}
            />
          ))}
        </svg>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div
            style={{
              padding: "26px 54px",
              borderRadius: 26,
              background: "#0A0C13dd",
              border: `3px solid ${badge.to}`,
              transform: `scale(${clampIn(frame, 54, 76)})`,
              boxShadow: `0 40px 120px ${badge.from}55`,
            }}
          >
            <span style={{ fontFamily: display, fontSize: 128, color: badge.to }}>
              {badge.count}
              <span style={{ fontFamily: body, fontSize: 40, marginLeft: 10, color: "#C7CDDA" }}>{badge.unit}</span>
            </span>
          </div>
        </AbsoluteFill>
        <div style={{ position: "absolute", inset: 0, opacity: draw * 0 }} />
      </AbsoluteFill>
      <Caption text="Surišta trispalve" color={badge.to} bottom={92} />
    </Story>
  );
};

/* ═══ 22. SCOREBOARD — split-flap board clacks to the final number ════ */
export const ScoreboardStory: React.FC<{ badge: BadgeSpec }> = ({ badge }) => {
  const frame = useCurrentFrame();
  const target = String(badge.count ?? 7);
  const flaps = target.split("");
  const word = "SVEIKINAM";
  return (
    <Story badge={badge} mood="paper" confetti={false}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 40 }}>
        <div style={{ display: "flex", gap: 12 }}>
          {word.split("").map((ch, i) => {
            const at = 6 + i * 5;
            const t = clampIn(frame, at, at + 14);
            const roll = String.fromCharCode(65 + Math.floor(random("w" + i + Math.floor(frame / 2)) * 26));
            return (
              <div
                key={i}
                style={{
                  width: 86,
                  height: 116,
                  borderRadius: 10,
                  background: "linear-gradient(180deg, #171C29, #0C0F16)",
                  border: "1px solid rgba(255,255,255,0.09)",
                  display: "grid",
                  placeItems: "center",
                  boxShadow: "0 20px 50px #0009",
                }}
              >
                <span style={{ fontFamily: display, fontSize: 56, color: t >= 1 ? badge.to : "#79melts" }}>
                  {t >= 1 ? ch : roll}
                </span>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {flaps.map((d, i) => {
            const at = 54 + i * 12;
            const t = clampIn(frame, at, at + 18);
            const roll = String(Math.floor(random("d" + i + Math.floor(frame / 2)) * 10));
            return (
              <div
                key={i}
                style={{
                  width: 190,
                  height: 250,
                  borderRadius: 18,
                  background: `linear-gradient(180deg, ${badge.from}, ${badge.to})`,
                  display: "grid",
                  placeItems: "center",
                  transform: `rotateX(${(1 - t) * 60}deg)`,
                  boxShadow: `0 34px 90px ${badge.from}55`,
                }}
              >
                <span style={{ fontFamily: display, fontSize: 168, color: BG }}>{t >= 1 ? d : roll}</span>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
      <Caption text={badge.unit ?? ""} color={badge.to} bottom={92} at={70} />
    </Story>
  );
};
