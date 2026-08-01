import React from "react";
import { AbsoluteFill, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { LT_GREEN, LT_RED, LT_YELLOW, type BadgeSpec } from "../../badges";
import { Backdrop, BG, body, clampIn, Confetti, display, Flash, lucide, REVEAL, Shockwave, Vignette } from "./kit";
import { Reveal } from "./reveals";

/* Shared shell so every story fades out into its own reveal style. */
const Story: React.FC<{
  badge: BadgeSpec;
  mood?: "grid" | "dots" | "rings" | "beams" | "paper";
  outAt?: number;
  confetti?: boolean;
  children: React.ReactNode;
}> = ({ badge, mood = "grid", outAt = 100, confetti = true, children }) => {
  const frame = useCurrentFrame();
  const out = 1 - clampIn(frame, outAt, outAt + 18);
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Backdrop badge={badge} mood={mood} />
      <AbsoluteFill style={{ opacity: out }}>{children}</AbsoluteFill>
      <Shockwave color={badge.to} at={outAt} size={380} />
      {confetti && <Confetti from={badge.from} to={badge.to} at={outAt + 2} originY={0.45} />}
      <Flash at={outAt} strength={0.5} />
      <Reveal badge={badge} start={REVEAL} />
      <Vignette />
    </AbsoluteFill>
  );
};

const Caption: React.FC<{ text: string; color: string; at?: number; bottom?: number }> = ({
  text,
  color,
  at = 6,
  bottom = 118,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - at, fps, config: { damping: 200 }, durationInFrames: 20 });
  return (
    <div
      style={{
        position: "absolute",
        bottom,
        width: "100%",
        textAlign: "center",
        fontFamily: body,
        fontWeight: 700,
        fontSize: 27,
        letterSpacing: 9,
        textTransform: "uppercase",
        color,
        opacity: s,
        transform: `translateY(${(1 - s) * 20}px)`,
      }}
    >
      {text}
    </div>
  );
};

const useCount = (to: number, from = 0, start = 20, dur = 66) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [start, start + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const eased = 1 - Math.pow(1 - t, 3);
  return Math.round(from + (to - from) * eased);
};

/* ═══ 1. LIQUID — a glass beaker fills with light, bubbles rise ═════════ */
export const LiquidStory: React.FC<{ badge: BadgeSpec }> = ({ badge }) => {
  const frame = useCurrentFrame();
  const fill = interpolate(frame, [16, 92], [0, Math.max(0.42, Math.min(0.95, badge.progress ?? 0.9))], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const n = useCount(badge.count ?? 1, 0, 18, 72);
  const W = 420;
  const H = 560;
  return (
    <Story badge={badge} mood="dots">
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            width: W,
            height: H,
            borderRadius: 60,
            border: `6px solid ${badge.to}55`,
            position: "relative",
            overflow: "hidden",
            background: "#FFFFFF06",
            boxShadow: `0 0 90px ${badge.from}33 inset`,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: H * fill,
              background: `linear-gradient(180deg, ${badge.to}, ${badge.from})`,
              boxShadow: `0 -20px 70px ${badge.to}88`,
            }}
          />
          {/* wave crest */}
          <div
            style={{
              position: "absolute",
              left: -40,
              right: -40,
              bottom: H * fill - 22,
              height: 44,
              borderRadius: "50%",
              background: badge.to,
              transform: `translateX(${Math.sin(frame / 8) * 26}px) scaleY(${0.7 + Math.sin(frame / 6) * 0.25})`,
              opacity: fill > 0.01 ? 0.95 : 0,
            }}
          />
          {new Array(16).fill(0).map((_, i) => {
            const sp = 0.9 + random("b" + i) * 2.1;
            const y = (H - ((frame * sp * 4 + random("o" + i) * H) % (H * fill + 1))) as number;
            if (fill < 0.05) return null;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: 40 + random("x" + i) * (W - 90),
                  top: y,
                  width: 8 + random("s" + i) * 16,
                  height: 8 + random("s" + i) * 16,
                  borderRadius: "50%",
                  background: "#FFFFFF55",
                }}
              />
            );
          })}
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
            <span style={{ fontFamily: display, fontSize: 150, color: "#FFFFFF", mixBlendMode: "overlay" }}>{n}</span>
          </div>
        </div>
      </AbsoluteFill>
      <Caption text={`${badge.unit ?? ""} pripildyta`} color={badge.to} />
    </Story>
  );
};

/* ═══ 2. BARS — a skyline of bars grows to a record high ═══════════════ */
export const BarsStory: React.FC<{ badge: BadgeSpec }> = ({ badge }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bars = 9;
  const n = useCount(badge.count ?? 10, 0, 22, 64);
  return (
    <Story badge={badge} mood="grid">
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 250 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 22, height: 480 }}>
          {new Array(bars).fill(0).map((_, i) => {
            const target = 0.18 + Math.pow((i + 1) / bars, 1.7) * 0.82;
            const s = spring({ frame: frame - 12 - i * 6, fps, config: { damping: 15, stiffness: 120 } });
            const last = i === bars - 1;
            return (
              <div
                key={i}
                style={{
                  width: 74,
                  height: 480 * target * s,
                  borderRadius: 18,
                  background: last ? `linear-gradient(180deg, ${badge.to}, ${badge.from})` : `${badge.to}2E`,
                  border: last ? "none" : `1px solid ${badge.to}44`,
                  boxShadow: last ? `0 0 70px ${badge.to}77` : "none",
                }}
              />
            );
          })}
        </div>
        <div style={{ width: 900, height: 3, background: `${badge.to}44`, marginTop: 26 }} />
        <span style={{ fontFamily: display, fontSize: 132, color: "#F2F5FF", marginTop: 18 }}>
          {n}
          <span style={{ fontSize: 46, color: badge.to, marginLeft: 12, fontFamily: body }}>{badge.unit}</span>
        </span>
      </AbsoluteFill>
      <Caption text="Naujas rekordas" color={badge.to} bottom={90} />
    </Story>
  );
};

/* ═══ 3. ORBIT — particles spiral in and collapse into a core ══════════ */
export const OrbitStory: React.FC<{ badge: BadgeSpec }> = ({ badge }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const core = spring({ frame: frame - 70, fps, config: { damping: 10, stiffness: 200 } });
  const n = useCount(badge.count ?? 100, 0, 24, 66);
  return (
    <Story badge={badge} mood="rings">
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        {new Array(3).fill(0).map((_, r) => (
          <div
            key={r}
            style={{
              position: "absolute",
              width: 400 + r * 190,
              height: 400 + r * 190,
              borderRadius: "50%",
              border: `2px solid ${badge.to}${r === 0 ? "66" : "26"}`,
              transform: `rotate(${frame * (r % 2 ? -1 : 1) * 0.6}deg) scale(${1 - core * 0.35})`,
            }}
          />
        ))}
        {new Array(34).fill(0).map((_, i) => {
          const ring = i % 3;
          const rad = (200 + ring * 95) * (1 - core * 0.86);
          const a = random("pa" + i) * Math.PI * 2 + frame * (0.02 + ring * 0.008);
          const app = clampIn(frame, 6 + i, 26 + i);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                width: 12 + random("ps" + i) * 12,
                height: 12 + random("ps" + i) * 12,
                borderRadius: "50%",
                background: [badge.from, badge.to, "#fff"][i % 3],
                boxShadow: `0 0 24px ${badge.to}`,
                opacity: app * (1 - core * 0.9),
                transform: `translate(${Math.cos(a) * rad}px, ${Math.sin(a) * rad * 0.9}px)`,
              }}
            />
          );
        })}
        <div
          style={{
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: `radial-gradient(circle at 40% 35%, ${badge.to}, ${badge.from})`,
            display: "grid",
            placeItems: "center",
            transform: `scale(${0.35 + core * 0.65})`,
            boxShadow: `0 0 140px ${badge.to}88`,
          }}
        >
          <span style={{ fontFamily: display, fontSize: 108, color: BG }}>
            {n}
            {badge.unit === "%" ? "%" : ""}
          </span>
        </div>
      </AbsoluteFill>
      <Caption text="Tikslo trauka" color={badge.to} />
    </Story>
  );
};

/* ═══ 4. TYPESTORM — pure kinetic typography, words fly through space ══ */
export const TypeStormStory: React.FC<{ badge: BadgeSpec }> = ({ badge }) => {
  const frame = useCurrentFrame();
  const words = ["SAVANORYSTĖ", "VALANDOS", "BENDRUOMENĖ", "TU", "PADEDI", "KITIEMS", "KARTU"];
  return (
    <Story badge={badge} mood="beams" confetti={false}>
      <AbsoluteFill style={{ overflow: "hidden" }}>
        {new Array(14).fill(0).map((_, i) => {
          const w = words[i % words.length]!;
          const row = i;
          const speed = 2 + random("sp" + i) * 5;
          const dir = i % 2 ? 1 : -1;
          const x = ((frame * speed * dir + random("of" + i) * 2000) % 2400) - 1200;
          const y = -60 + row * 90;
          const hot = i % 4 === 0;
          return (
            <span
              key={i}
              style={{
                position: "absolute",
                left: x,
                top: y,
                whiteSpace: "nowrap",
                fontFamily: display,
                fontSize: 92,
                color: hot ? badge.to : "transparent",
                WebkitTextStroke: hot ? "none" : `2px ${badge.to}33`,
                opacity: hot ? 0.9 : 1,
              }}
            >
              {w} · {w} · {w}
            </span>
          );
        })}
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div
            style={{
              padding: "34px 60px",
              background: BG,
              border: `3px solid ${badge.to}`,
              transform: `rotate(${Math.sin(frame / 30) * 1.6}deg) scale(${clampIn(frame, 8, 30)})`,
              boxShadow: `0 40px 130px #000`,
            }}
          >
            <span style={{ fontFamily: display, fontSize: 132, color: badge.to }}>
              {badge.count}
              <span style={{ fontSize: 44, fontFamily: body, marginLeft: 10 }}>{badge.unit}</span>
            </span>
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
    </Story>
  );
};

/* ═══ 5. DOMINO — a chain of tiles topples, each a day of the streak ══ */
export const DominoStory: React.FC<{ badge: BadgeSpec }> = ({ badge }) => {
  const frame = useCurrentFrame();
  const total = Math.min(badge.count ?? 7, 12);
  const step = 68 / total;
  return (
    <Story badge={badge} mood="paper">
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 26, perspective: 900 }}>
          {new Array(total).fill(0).map((_, i) => {
            const at = 14 + i * step;
            const t = clampIn(frame, at, at + 12);
            const rot = t * 62;
            const h = 250 - (i % 3) * 12;
            return (
              <div
                key={i}
                style={{
                  width: 56,
                  height: h,
                  borderRadius: 12,
                  transformOrigin: "bottom left",
                  transform: `rotate(${rot}deg)`,
                  background: t > 0.5 ? `linear-gradient(180deg, ${badge.to}, ${badge.from})` : "#FFFFFF12",
                  border: `1px solid ${badge.to}44`,
                  boxShadow: t > 0.5 ? `0 0 40px ${badge.to}55` : "none",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <span style={{ fontFamily: body, fontWeight: 700, fontSize: 22, color: t > 0.5 ? BG : "#5C6478" }}>
                  {i + 1}
                </span>
              </div>
            );
          })}
        </div>
        <div
          style={{
            marginTop: 60,
            fontFamily: display,
            fontSize: 190,
            color: "transparent",
            WebkitTextStroke: `3px ${badge.to}`,
            transform: `scale(${interpolate(clampIn(frame, 74, 96), [0, 1], [1.4, 1])})`,
            opacity: clampIn(frame, 74, 92),
          }}
        >
          {badge.big ?? badge.count}
        </div>
      </AbsoluteFill>
      <Caption text="Grandinė nenutrūko" color={badge.to} bottom={80} />
    </Story>
  );
};

/* ═══ 6. TORCH — flames ignite along a rising ladder ═══════════════════ */
export const TorchStory: React.FC<{ badge: BadgeSpec }> = ({ badge }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const Flame = lucide("Flame");
  const total = Math.min(badge.count ?? 7, 10);
  return (
    <Story badge={badge} mood="beams">
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        {new Array(total).fill(0).map((_, i) => {
          const at = 12 + i * (72 / total);
          const s = spring({ frame: frame - at, fps, config: { damping: 11, stiffness: 240 } });
          const angle = (i / total) * Math.PI * 2 - Math.PI / 2;
          const rad = 300;
          const flick = 1 + Math.sin(frame / 5 + i) * 0.09;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                transform: `translate(${Math.cos(angle) * rad}px, ${Math.sin(angle) * rad}px) scale(${s * flick})`,
                filter: `drop-shadow(0 0 26px ${badge.to})`,
              }}
            >
              <Flame size={104} color={badge.to} strokeWidth={2.1} />
            </div>
          );
        })}
        <div
          style={{
            width: 300,
            height: 300,
            borderRadius: "50%",
            border: `4px dashed ${badge.to}55`,
            display: "grid",
            placeItems: "center",
            transform: `rotate(${frame * 0.4}deg)`,
          }}
        >
          <span
            style={{
              fontFamily: display,
              fontSize: 150,
              color: badge.to,
              transform: `rotate(${-frame * 0.4}deg)`,
              textShadow: `0 0 60px ${badge.to}`,
            }}
          >
            {badge.big ?? badge.count}
          </span>
        </div>
      </AbsoluteFill>
      <Caption text="Liepsna neužgeso" color={badge.to} />
    </Story>
  );
};

/* ═══ 7. STAMPS — passport-style stamps slam onto a page ══════════════ */
export const StampsStory: React.FC<{ badge: BadgeSpec }> = ({ badge }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const total = Math.min(badge.count ?? 3, 6);
  const cols = total <= 3 ? total : 3;
  return (
    <Story badge={badge} mood="paper">
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            width: 780,
            padding: 50,
            borderRadius: 20,
            background: "#0C0F16",
            border: `1px solid ${badge.to}22`,
            boxShadow: "0 60px 150px #000c",
          }}
        >
          <p style={{ fontFamily: body, fontWeight: 700, letterSpacing: 8, fontSize: 22, color: "#7C8598", margin: 0 }}>
            SAVANORIO PASAS
          </p>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 30, marginTop: 34 }}>
            {new Array(total).fill(0).map((_, i) => {
              const at = 18 + i * 20;
              const s = spring({ frame: frame - at, fps, config: { damping: 12, stiffness: 300 }, durationInFrames: 22 });
              const rot = (random("r" + i) - 0.5) * 24;
              const c = [LT_GREEN, LT_YELLOW, LT_RED][i % 3]!;
              return (
                <div
                  key={i}
                  style={{
                    height: 190,
                    borderRadius: 14,
                    border: `5px solid ${c}`,
                    display: "grid",
                    placeItems: "center",
                    transform: `scale(${interpolate(s, [0, 1], [2.4, 1])}) rotate(${rot * s}deg)`,
                    opacity: s,
                    color: c,
                    fontFamily: display,
                    fontSize: 30,
                    textAlign: "center",
                    padding: 10,
                  }}
                >
                  ORG #{i + 1}
                  <br />
                  ✓
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
      <Caption text="Antspaudai surinkti" color={badge.to} bottom={80} />
    </Story>
  );
};

/* ═══ 8. CONSTELLATION — stars connect into a shape ═══════════════════ */
export const ConstellationStory: React.FC<{ badge: BadgeSpec }> = ({ badge }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const nodes = Math.max(3, Math.min(badge.count ?? 5, 8));
  const pts = new Array(nodes).fill(0).map((_, i) => {
    const a = (i / nodes) * Math.PI * 2 - Math.PI / 2;
    const r = 280 + random("cr" + i) * 60;
    return { x: 540 + Math.cos(a) * r, y: 500 + Math.sin(a) * r * 0.85 };
  });
  return (
    <Story badge={badge} mood="dots">
      <AbsoluteFill>
        <svg width={1080} height={1080} style={{ position: "absolute" }}>
          {pts.map((p, i) => {
            const q = pts[(i + 1) % nodes]!;
            const t = clampIn(frame, 26 + i * 9, 26 + i * 9 + 14);
            return (
              <line
                key={i}
                x1={p.x}
                y1={p.y}
                x2={p.x + (q.x - p.x) * t}
                y2={p.y + (q.y - p.y) * t}
                stroke={badge.to}
                strokeWidth={3}
                opacity={0.8}
              />
            );
          })}
        </svg>
        {pts.map((p, i) => {
          const s = spring({ frame: frame - 10 - i * 7, fps, config: { damping: 11, stiffness: 260 } });
          const pulse = 1 + Math.sin(frame / 8 + i) * 0.07;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: p.x - 46,
                top: p.y - 46,
                width: 92,
                height: 92,
                borderRadius: "50%",
                background: `linear-gradient(150deg, ${badge.from}, ${badge.to})`,
                display: "grid",
                placeItems: "center",
                transform: `scale(${s * pulse})`,
                boxShadow: `0 0 50px ${badge.to}88`,
                fontFamily: display,
                fontSize: 34,
                color: BG,
              }}
            >
              {String.fromCharCode(65 + i)}
            </div>
          );
        })}
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <span
            style={{
              fontFamily: display,
              fontSize: 132,
              color: "#F2F5FF",
              opacity: clampIn(frame, 70, 88),
              textShadow: `0 0 70px ${badge.to}`,
            }}
          >
            {badge.count}
          </span>
        </AbsoluteFill>
      </AbsoluteFill>
      <Caption text="Ryšys užmegztas" color={badge.to} />
    </Story>
  );
};

/* ═══ 9. ODOMETER — rolling digits slam to the final number ═══════════ */
export const OdometerStory: React.FC<{ badge: BadgeSpec }> = ({ badge }) => {
  const frame = useCurrentFrame();
  const target = String(badge.count ?? 10);
  return (
    <Story badge={badge} mood="grid">
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 30 }}>
        <div style={{ display: "flex", gap: 18 }}>
          {target.split("").map((d, i) => {
            const lock = 30 + i * 22;
            const settled = frame >= lock;
            const roll = interpolate(frame, [8, lock], [0, 42 + i * 7], { extrapolateLeft: "clamp" });
            const digit = settled ? d : String(Math.floor(roll * 3 + i) % 10);
            return (
              <div
                key={i}
                style={{
                  width: 200,
                  height: 280,
                  borderRadius: 26,
                  background: settled ? `linear-gradient(160deg, ${badge.from}, ${badge.to})` : "#11151F",
                  border: `2px solid ${badge.to}44`,
                  display: "grid",
                  placeItems: "center",
                  transform: `scale(${settled ? 1 + Math.max(0, 0.14 - (frame - lock) * 0.02) : 1})`,
                  boxShadow: settled ? `0 0 70px ${badge.to}55` : "none",
                  overflow: "hidden",
                }}
              >
                <span style={{ fontFamily: display, fontSize: 168, color: settled ? BG : "#8B94A8" }}>{digit}</span>
              </div>
            );
          })}
        </div>
        <span style={{ fontFamily: body, fontWeight: 700, fontSize: 34, letterSpacing: 8, color: badge.to }}>
          {(badge.unit ?? "").toUpperCase()}
        </span>
      </AbsoluteFill>
      <Caption text="Skaitiklis sustojo" color="#8B94A8" bottom={90} />
    </Story>
  );
};

/* ═══ 10. FORGE — sparks weld a medal together ════════════════════════ */
export const ForgeStory: React.FC<{ badge: BadgeSpec }> = ({ badge }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const Icon = lucide(badge.icon);
  const weld = clampIn(frame, 10, 70);
  const cool = clampIn(frame, 70, 98);
  return (
    <Story badge={badge} mood="rings">
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        {new Array(40).fill(0).map((_, i) => {
          const a = random("fa" + i) * Math.PI * 2;
          const life = (frame + i * 3) % 34;
          const p = life / 34;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                width: 5,
                height: 5,
                borderRadius: 3,
                background: i % 3 ? LT_YELLOW : "#fff",
                opacity: (1 - p) * (1 - cool),
                transform: `translate(${Math.cos(a) * 340 * p}px, ${Math.sin(a) * 340 * p + p * p * 180}px)`,
                boxShadow: `0 0 12px ${LT_YELLOW}`,
              }}
            />
          );
        })}
        {new Array(8).fill(0).map((_, i) => {
          const s = spring({ frame: frame - 8 - i * 7, fps, config: { damping: 14, stiffness: 170 } });
          const a = (i / 8) * Math.PI * 2;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                width: 120,
                height: 120,
                borderRadius: 22,
                background: `linear-gradient(150deg, ${badge.from}, ${badge.to})`,
                opacity: s * 0.9,
                transform: `translate(${Math.cos(a) * 250 * (1 - s)}px, ${Math.sin(a) * 250 * (1 - s)}px) rotate(${(1 - s) * 180 + 45}deg) scale(${0.5 + s * 0.5})`,
              }}
            />
          );
        })}
        <div
          style={{
            width: 320,
            height: 320,
            borderRadius: 100,
            display: "grid",
            placeItems: "center",
            background: `linear-gradient(150deg, ${badge.from}, ${badge.to})`,
            filter: `brightness(${1 + (1 - cool) * 1.6}) saturate(${0.4 + cool * 0.6})`,
            boxShadow: `0 0 ${120 * (1 - cool) + 40}px ${LT_YELLOW}`,
            transform: `scale(${0.6 + weld * 0.4})`,
          }}
        >
          <Icon size={150} color={BG} strokeWidth={2} />
        </div>
      </AbsoluteFill>
      <Caption text="Nukaltas apdovanojimas" color={LT_YELLOW} />
    </Story>
  );
};

/* ═══ 11. ROUTE — a path draws across a stylised map ══════════════════ */
export const RouteStory: React.FC<{ badge: BadgeSpec }> = ({ badge }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const stops = Math.max(2, Math.min(badge.count ?? 3, 6));
  const path = new Array(stops).fill(0).map((_, i) => ({
    x: 180 + (i * (720 / Math.max(1, stops - 1))),
    y: 620 - Math.sin(i * 1.3) * 220,
  }));
  const draw = clampIn(frame, 16, 84);
  const seg = draw * (stops - 1);
  return (
    <Story badge={badge} mood="grid">
      <AbsoluteFill>
        <svg width={1080} height={1080} style={{ position: "absolute" }}>
          <polyline
            points={path.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke={`${badge.to}22`}
            strokeWidth={10}
            strokeDasharray="18 16"
          />
          {path.slice(0, -1).map((p, i) => {
            const q = path[i + 1]!;
            const t = Math.max(0, Math.min(1, seg - i));
            return (
              <line
                key={i}
                x1={p.x}
                y1={p.y}
                x2={p.x + (q.x - p.x) * t}
                y2={p.y + (q.y - p.y) * t}
                stroke={badge.to}
                strokeWidth={10}
                strokeLinecap="round"
              />
            );
          })}
        </svg>
        {path.map((p, i) => {
          const at = 16 + (i / Math.max(1, stops - 1)) * 68;
          const s = spring({ frame: frame - at, fps, config: { damping: 10, stiffness: 260 } });
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: p.x - 40,
                top: p.y - 96,
                width: 80,
                height: 80,
                borderRadius: "50% 50% 50% 4px",
                transform: `rotate(45deg) scale(${s})`,
                background: `linear-gradient(150deg, ${badge.from}, ${badge.to})`,
                boxShadow: `0 20px 50px ${badge.from}66`,
              }}
            />
          );
        })}
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 120 }}>
          <span style={{ fontFamily: display, fontSize: 120, color: "#F2F5FF" }}>
            {Math.min(stops, Math.floor(seg) + 1)}
            <span style={{ fontFamily: body, fontSize: 40, color: badge.to, marginLeft: 14 }}>{badge.unit}</span>
          </span>
        </AbsoluteFill>
      </AbsoluteFill>
      <Caption text="Maršrutas nueitas" color={badge.to} bottom={80} />
    </Story>
  );
};

/* ═══ 12. HEARTBEAT — an ECG line races and bursts into hearts ════════ */
export const PulseStory: React.FC<{ badge: BadgeSpec }> = ({ badge }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const Heart = lucide("Heart");
  const prog = clampIn(frame, 10, 86);
  const w = 1080;
  const pts: string[] = [];
  for (let x = 0; x <= w * prog; x += 6) {
    const t = x / w;
    const spike = Math.exp(-Math.pow((t % 0.25) - 0.12, 2) / 0.0006);
    pts.push(`${x},${540 - spike * 200 + Math.sin(x / 18) * 8}`);
  }
  return (
    <Story badge={badge} mood="dots">
      <AbsoluteFill>
        <svg width={w} height={1080} style={{ position: "absolute" }}>
          <polyline points={pts.join(" ")} fill="none" stroke={badge.to} strokeWidth={8} strokeLinecap="round" />
        </svg>
        {new Array(Math.max(2, Math.min(badge.count ?? 4, 6))).fill(0).map((_, i) => {
          const at = 20 + i * 14;
          const s = spring({ frame: frame - at, fps, config: { damping: 9, stiffness: 220 } });
          const rise = interpolate(frame - at, [0, 80], [0, -220], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 120 + i * 150,
                top: 470 + rise,
                transform: `scale(${s}) rotate(${Math.sin(frame / 12 + i) * 8}deg)`,
                filter: `drop-shadow(0 0 26px ${badge.to})`,
                opacity: s,
              }}
            >
              <Heart size={96} color={badge.to} strokeWidth={2.2} fill={badge.to} />
            </div>
          );
        })}
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 220 }}>
          <span style={{ fontFamily: display, fontSize: 128, color: "#F2F5FF", opacity: clampIn(frame, 62, 84) }}>
            {badge.count} <span style={{ fontFamily: body, fontSize: 40, color: badge.to }}>{badge.unit}</span>
          </span>
        </AbsoluteFill>
      </AbsoluteFill>
      <Caption text="Kartu smagiau" color={badge.to} bottom={110} />
    </Story>
  );
};
