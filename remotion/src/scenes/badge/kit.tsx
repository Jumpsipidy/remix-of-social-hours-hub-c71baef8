import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, random } from "remotion";
import { loadFont as loadDisplay } from "@remotion/google-fonts/Sora";
import { loadFont as loadBody } from "@remotion/google-fonts/Manrope";
import * as Icons from "lucide-react";
import { LT_GREEN, LT_RED, LT_YELLOW, type BadgeSpec } from "../../badges";

export const display = loadDisplay("normal", { weights: ["800"], subsets: ["latin", "latin-ext"] }).fontFamily;
export const body = loadBody("normal", { weights: ["500", "700"], subsets: ["latin", "latin-ext"] }).fontFamily;

export const BG = "#07080C";
/** Frame the story hands over to the badge reveal. */
export const REVEAL = 118;

export const lucide = (name: string) =>
  (Icons as unknown as Record<string, React.FC<{ size?: number; color?: string; strokeWidth?: number }>>)[name] ??
  Icons.Trophy;

export const clampIn = (frame: number, a: number, b: number) =>
  interpolate(frame, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

/* ── shared backdrop: each variant passes a different mood ─────────────── */
export const Backdrop: React.FC<{
  badge: BadgeSpec;
  mood?: "grid" | "dots" | "rings" | "beams" | "paper";
}> = ({ badge, mood = "grid" }) => {
  const frame = useCurrentFrame();
  const texture: React.CSSProperties =
    mood === "dots"
      ? {
          backgroundImage: `radial-gradient(${badge.to}55 2px, transparent 2px)`,
          backgroundSize: "46px 46px",
          transform: `translateY(${(frame * 0.35) % 46}px)`,
          opacity: 0.3,
        }
      : mood === "rings"
        ? {
            backgroundImage: `repeating-radial-gradient(circle at 50% 46%, ${badge.to}22 0 2px, transparent 2px 78px)`,
            transform: `scale(${1 + Math.sin(frame / 40) * 0.06})`,
            opacity: 0.7,
          }
        : mood === "beams"
          ? {
              backgroundImage: `repeating-linear-gradient(115deg, ${badge.from}18 0 3px, transparent 3px 90px)`,
              transform: `translateX(${(frame * 1.1) % 90}px) scale(1.4)`,
              opacity: 0.55,
            }
          : mood === "paper"
            ? {
                backgroundImage: `linear-gradient(${badge.to}22 1px, transparent 1px)`,
                backgroundSize: "100% 54px",
                transform: `translateY(${(frame * 0.5) % 54}px)`,
                opacity: 0.4,
              }
            : {
                backgroundImage: `linear-gradient(${badge.to}44 1px, transparent 1px), linear-gradient(90deg, ${badge.to}44 1px, transparent 1px)`,
                backgroundSize: "62px 62px",
                transform: `translateY(${(frame * 0.6) % 62}px) scale(1.2)`,
                opacity: 0.22,
              };

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          background: `radial-gradient(48% 42% at 50% 38%, ${badge.from}38, transparent 70%), radial-gradient(72% 48% at 50% 106%, ${badge.to}22, transparent 72%)`,
          transform: `scale(${1 + Math.sin(frame / 36) * 0.05})`,
        }}
      />
      <AbsoluteFill
        style={{
          ...texture,
          maskImage: "radial-gradient(76% 66% at 50% 46%, #000 15%, transparent 82%)",
          WebkitMaskImage: "radial-gradient(76% 66% at 50% 46%, #000 15%, transparent 82%)",
        }}
      />
    </AbsoluteFill>
  );
};

export const Vignette: React.FC = () => {
  const { width } = useVideoConfig();
  return <AbsoluteFill style={{ boxShadow: `inset 0 0 ${width * 0.32}px ${width * 0.05}px #000000aa` }} />;
};

/* ── impact flash ──────────────────────────────────────────────────────── */
export const Flash: React.FC<{ at: number; strength?: number }> = ({ at, strength = 0.5 }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [at, at + 3, at + 15], [0, strength, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return <AbsoluteFill style={{ background: "#FFFFFF", opacity: o }} />;
};

export const Shockwave: React.FC<{ color: string; at: number; y?: number; size?: number }> = ({
  color,
  at,
  y = 0,
  size = 320,
}) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const t = clampIn(frame, at, at + 26);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          position: "absolute",
          top: `calc(50% + ${y}px)`,
          width: size,
          height: size,
          marginTop: -size / 2,
          borderRadius: "50%",
          border: `${14 * (1 - t)}px solid ${color}`,
          opacity: (1 - t) * 0.9,
          transform: `scale(${0.4 + t * 3.2})`,
        }}
      />
    </AbsoluteFill>
  );
};

/* ── confetti burst ────────────────────────────────────────────────────── */
export const Confetti: React.FC<{ from: string; to: string; at: number; count?: number; originY?: number }> = ({
  from,
  to,
  at,
  count = 64,
  originY = 0.4,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  return (
    <AbsoluteFill>
      {new Array(count).fill(0).map((_, i) => {
        const s = `c${i}`;
        const ang = random(s + "a") * Math.PI * 2;
        const dist = (0.3 + random(s + "r") * 0.7) * width * 0.6;
        const delay = at + random(s + "d") * 18;
        const p = spring({ frame: frame - delay, fps, config: { damping: 200 }, durationInFrames: 58 });
        const fall = interpolate(frame - delay, [0, 110], [0, height * 0.9], { extrapolateLeft: "clamp" });
        const op = interpolate(frame - delay, [0, 6, 70, 108], [0, 1, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const glint = i % 3 === 0;
        const c = [from, to, "#FFFFFF", LT_GREEN][i % 4]!;
        const size = glint ? 6 + random(s + "w") * 8 : 5 + random(s + "w") * 5;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: width / 2,
              top: height * originY,
              width: size,
              height: glint ? size : size * 3.4,
              borderRadius: glint ? "50%" : 2,
              background: c,
              boxShadow: glint ? `0 0 ${size * 2.4}px ${c}` : "none",
              opacity: op,
              transform: `translate(${Math.cos(ang) * dist * p}px, ${Math.sin(ang) * dist * p * 0.8 + fall}px) rotate(${(frame - delay) * (3 + random(s + "rr") * 9)}deg)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/* ── kinetic word-by-word title ────────────────────────────────────────── */
export const KineticTitle: React.FC<{ text: string; from: string; to: string; start: number; size: number }> = ({
  text,
  from,
  to,
  start,
  size,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0 22px", maxWidth: 940 }}>
      {text.split(" ").map((w, i) => {
        const s = spring({
          frame: frame - start - i * 4,
          fps,
          config: { damping: 18, stiffness: 160 },
          durationInFrames: 30,
        });
        return (
          <span key={i} style={{ overflow: "hidden", display: "inline-block", paddingBottom: 10 }}>
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

/* ── the closing card every story hands off to ─────────────────────────── */
export const RevealCard: React.FC<{ badge: BadgeSpec; start?: number; medal?: boolean }> = ({
  badge,
  start = REVEAL,
  medal = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const Icon = lucide(badge.icon);

  const pop = spring({ frame: frame - start, fps, config: { damping: 11, stiffness: 230 } });
  const kicker = spring({ frame: frame - start - 8, fps, config: { damping: 200 }, durationInFrames: 18 });
  const subIn = spring({ frame: frame - start - 30, fps, config: { damping: 200 }, durationInFrames: 24 });
  const railIn = clampIn(frame, start + 38, start + 60);
  const float = Math.sin(frame / 22) * 8;
  const shine = interpolate(frame, [start + 10, start + 44], [-140, 150], { extrapolateRight: "clamp" });

  if (frame < start - 2) return null;

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 70, textAlign: "center" }}>
      {medal && (
        <div
          style={{
            position: "relative",
            width: 232,
            height: 232,
            marginBottom: 46,
            transform: `translateY(${float}px) scale(${interpolate(pop, [0, 1], [0.15, 1])}) rotate(${interpolate(pop, [0, 1], [-50, 0])}deg)`,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: -14,
              borderRadius: 78,
              background: `conic-gradient(from ${frame * 3}deg, ${badge.from}, ${badge.to}, ${LT_GREEN}, ${badge.from})`,
              filter: "blur(14px)",
              opacity: 0.85,
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 66,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: `linear-gradient(150deg, ${badge.from}, ${badge.to})`,
              boxShadow: `0 46px 130px ${badge.from}55, inset 0 -10px 40px #00000033`,
            }}
          >
            {badge.big ? (
              <span style={{ fontFamily: display, fontSize: badge.big.length > 1 ? 116 : 146, color: BG, lineHeight: 1 }}>
                {badge.big}
              </span>
            ) : (
              <Icon size={116} color={BG} strokeWidth={2.1} />
            )}
            <div
              style={{
                position: "absolute",
                top: -70,
                left: shine,
                width: 80,
                height: 400,
                background: "linear-gradient(90deg, transparent, #ffffff88, transparent)",
                transform: "rotate(18deg)",
              }}
            />
          </div>
        </div>
      )}

      <p
        style={{
          fontFamily: body,
          fontWeight: 700,
          letterSpacing: 12,
          textTransform: "uppercase",
          fontSize: 23,
          color: badge.to,
          margin: 0,
          opacity: kicker,
          transform: `translateY(${(1 - kicker) * 18}px)`,
        }}
      >
        {badge.kind === "streak" ? "Serija tęsiasi" : "Naujas pasiekimas"}
      </p>

      <div style={{ marginTop: 14 }}>
        <KineticTitle
          text={badge.title}
          from={badge.from}
          to={badge.to}
          start={start + 12}
          size={badge.title.length > 20 ? 66 : badge.title.length > 13 ? 80 : 98}
        />
      </div>

      <p
        style={{
          fontFamily: body,
          fontWeight: 500,
          fontSize: 34,
          color: "#C7CDDA",
          marginTop: 6,
          maxWidth: 860,
          opacity: subIn,
          transform: `translateY(${(1 - subIn) * 18}px)`,
        }}
      >
        {badge.subtitle}
      </p>

      <div style={{ display: "flex", gap: 10, marginTop: 42 }}>
        {[LT_YELLOW, LT_GREEN, LT_RED].map((c, i) => (
          <div
            key={c}
            style={{
              height: 8,
              width: interpolate(railIn, [0, 1], [0, [120, 80, 50][i]!]),
              borderRadius: 99,
              background: c,
              opacity: 0.9,
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

/* ── mock app window used by the "website" stories ─────────────────────── */
export const AppWindow: React.FC<{
  badge: BadgeSpec;
  title: string;
  width?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ badge, title, width = 760, children, style }) => (
  <div
    style={{
      width,
      borderRadius: 30,
      overflow: "hidden",
      background: "#0C0F16",
      border: "1px solid rgba(255,255,255,0.09)",
      boxShadow: `0 60px 150px #000000cc, 0 0 0 1px ${badge.to}18`,
      ...style,
    }}
  >
    <div
      style={{
        height: 62,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "0 24px",
        background: "linear-gradient(180deg, #131826, #0C0F16)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <span style={{ width: 13, height: 13, borderRadius: 8, background: "#ff5f57" }} />
      <span style={{ width: 13, height: 13, borderRadius: 8, background: "#febc2e" }} />
      <span style={{ width: 13, height: 13, borderRadius: 8, background: "#28c840" }} />
      <span
        style={{
          marginLeft: 18,
          fontFamily: body,
          fontWeight: 700,
          fontSize: 19,
          color: "#8B94A8",
          letterSpacing: 0.4,
        }}
      >
        {title}
      </span>
    </div>
    <div style={{ padding: 30 }}>{children}</div>
  </div>
);

/* ── mouse pointer with click ripple ───────────────────────────────────── */
export const Pointer: React.FC<{
  path: Array<{ frame: number; x: number; y: number; click?: boolean }>;
  hideAt?: number;
}> = ({ path, hideAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const first = path[0]!;
  if (frame < first.frame - 8) return null;
  if (hideAt !== undefined && frame > hideAt) return null;

  let x = first.x;
  let y = first.y;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i]!;
    const b = path[i + 1]!;
    if (frame >= a.frame && frame <= b.frame) {
      const t = (frame - a.frame) / Math.max(1, b.frame - a.frame);
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      x = a.x + (b.x - a.x) * e;
      y = a.y + (b.y - a.y) * e;
      break;
    }
    if (frame > b.frame) {
      x = b.x;
      y = b.y;
    }
  }

  const clicked = path.find((p) => p.click && frame >= p.frame && frame <= p.frame + 20);
  const age = clicked ? frame - clicked.frame : -1;
  const press = age >= 0 && age < 6 ? 0.86 : 1;
  const appear = spring({ frame: frame - first.frame + 8, fps, config: { damping: 16 } });

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `scale(${appear * press})`,
        transformOrigin: "top left",
        zIndex: 60,
        filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.7))",
      }}
    >
      {age >= 0 && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 78,
            height: 78,
            marginLeft: -39,
            marginTop: -39,
            borderRadius: "50%",
            border: `3px solid ${LT_YELLOW}`,
            transform: `scale(${interpolate(age, [0, 20], [0.2, 2.2])})`,
            opacity: interpolate(age, [0, 20], [0.8, 0]),
          }}
        />
      )}
      <svg width="46" height="54" viewBox="0 0 24 28">
        <path
          d="M2 2 L2 22 L7 17 L10.5 25 L13.5 24 L10 16 L17 16 Z"
          fill="#ffffff"
          stroke="#0a0d1c"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
