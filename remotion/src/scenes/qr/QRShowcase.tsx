import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Series,
} from "remotion";
import { loadFont as loadGrotesk } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

const { fontFamily: display } = loadGrotesk("normal", { weights: ["500", "700"], subsets: ["latin"] });
const { fontFamily: body } = loadInter("normal", { weights: ["400", "600"], subsets: ["latin"] });
const { fontFamily: mono } = loadMono("normal", { weights: ["400", "700"], subsets: ["latin"] });

const BG = "#070B14";
const PANEL = "#0F1626";
const LINE = "#1E293B";
const EMERALD = "#10B981";
const CYAN = "#06B6D4";
const AMBER = "#F59E0B";
const TEXT = "#E2E8F0";
const MUTED = "#64748B";

const qrPattern = (seed: number, size: number) => {
  const cells: boolean[] = [];
  let s = seed * 9301 + 49297;
  for (let i = 0; i < size * size; i++) {
    s = (s * 9301 + 49297) % 233280;
    cells.push(s / 233280 > 0.5);
  }
  const set = (r: number, c: number, v: boolean) => (cells[r * size + c] = v);
  const drawFinder = (r0: number, c0: number) => {
    for (let r = 0; r < 7; r++)
      for (let c = 0; c < 7; c++) {
        const edge = r === 0 || r === 6 || c === 0 || c === 6;
        const inner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        set(r0 + r, c0 + c, edge || inner);
      }
    for (let r = 1; r <= 5; r++)
      for (let c = 1; c <= 5; c++) {
        if (r === 1 || r === 5 || c === 1 || c === 5) set(r0 + r, c0 + c, false);
      }
  };
  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);
  return cells;
};

const QRCode: React.FC<{ seed: number; size: number; color?: string; bg?: string }> = ({
  seed,
  size,
  color = "#0A0F1F",
  bg = "#F8FAFC",
}) => {
  const N = 25;
  const cells = qrPattern(seed, N);
  const cell = size / N;
  return (
    <svg width={size} height={size} style={{ borderRadius: 16, overflow: "hidden", background: bg }}>
      <rect width={size} height={size} fill={bg} />
      {cells.map((on, i) =>
        on ? (
          <rect
            key={i}
            x={(i % N) * cell}
            y={Math.floor(i / N) * cell}
            width={cell + 0.5}
            height={cell + 0.5}
            fill={color}
          />
        ) : null
      )}
    </svg>
  );
};

const Grid: React.FC<{ accent?: string }> = ({ accent = EMERALD }) => {
  const frame = useCurrentFrame();
  const shift = (frame * 0.4) % 80;
  return (
    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.35 }}>
      <defs>
        <pattern id={`g-${accent}`} width="80" height="80" patternUnits="userSpaceOnUse" x={shift} y={shift}>
          <path d="M 80 0 L 0 0 0 80" fill="none" stroke={LINE} strokeWidth="1" />
        </pattern>
        <radialGradient id={`rg-${accent}`} cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.18" />
          <stop offset="60%" stopColor={CYAN} stopOpacity="0.05" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill={`url(#g-${accent})`} />
      <rect width="100%" height="100%" fill={`url(#rg-${accent})`} />
    </svg>
  );
};

// Chapter label
const Chapter: React.FC<{ n: string; label: string; color: string }> = ({ n, label, color }) => {
  const frame = useCurrentFrame();
  const t = spring({ frame, fps: 30, config: { damping: 20 } });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, opacity: t, transform: `translateX(${(1 - t) * -30}px)` }}>
      <div style={{ width: 10, height: 10, borderRadius: 10, background: color, boxShadow: `0 0 20px ${color}` }} />
      <div style={{ fontFamily: mono, fontSize: 22, color, letterSpacing: 4 }}>
        {n} · {label}
      </div>
    </div>
  );
};

// ---------- SCENE 1: Hook (LT) ----------
const SceneHook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s1 = spring({ frame: frame - 4, fps, config: { damping: 18 } });
  const s2 = spring({ frame: frame - 18, fps, config: { damping: 20 } });
  const s3 = spring({ frame: frame - 32, fps, config: { damping: 22 } });
  const line = interpolate(frame, [10, 40], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: BG, fontFamily: display, color: TEXT }}>
      <Grid />
      <AbsoluteFill style={{ padding: 120, justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, opacity: s1 }}>
          <div style={{ width: 10, height: 10, borderRadius: 10, background: EMERALD, boxShadow: `0 0 20px ${EMERALD}` }} />
          <div style={{ fontFamily: mono, fontSize: 22, color: EMERALD, letterSpacing: 4 }}>NAUJIENA · v2.6</div>
        </div>
        <div
          style={{
            fontSize: 200,
            fontWeight: 700,
            letterSpacing: -8,
            lineHeight: 0.95,
            marginTop: 30,
            opacity: s2,
            transform: `translateY(${(1 - s2) * 40}px)`,
          }}
        >
          QR įsiregistravimas.
        </div>
        <div
          style={{
            fontSize: 200,
            fontWeight: 700,
            letterSpacing: -8,
            lineHeight: 0.95,
            background: `linear-gradient(90deg, ${EMERALD}, ${CYAN})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            opacity: s3,
            transform: `translateY(${(1 - s3) * 40}px)`,
          }}
        >
          Realios valandos.
        </div>
        <div style={{ marginTop: 40, height: 2, background: `linear-gradient(90deg, ${EMERALD}, ${CYAN}, transparent)`, width: `${line * 60}%` }} />
        <div style={{ fontFamily: body, fontSize: 30, color: MUTED, marginTop: 30, opacity: interpolate(frame, [45, 65], [0, 1], { extrapolateRight: "clamp" }) }}>
          Socialinės Valandos · dalyvavimo patikros sistema
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------- SCENE 2: Rotating QR ----------
const SceneRotatingQR: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - 4, fps, config: { damping: 18 } });
  // Rotate seed every 30 frames (1s)
  const rotate = Math.floor(frame / 30) + 1;
  // Countdown from 20 to 0
  const secondsLeft = 20 - Math.floor(frame / fps);

  return (
    <AbsoluteFill style={{ background: BG, fontFamily: display, color: TEXT }}>
      <Grid />
      <div style={{ position: "absolute", top: 80, left: 100 }}>
        <Chapter n="01" label="ROTUOJANTIS QR KODAS" color={EMERALD} />
      </div>
      <AbsoluteFill style={{ padding: 100, paddingTop: 180, flexDirection: "row", alignItems: "center", gap: 100 }}>
        {/* Phone mockup */}
        <div
          style={{
            width: 520,
            height: 900,
            background: PANEL,
            borderRadius: 60,
            border: `2px solid ${LINE}`,
            padding: 30,
            transform: `translateY(${(1 - enter) * 60}px) scale(${0.9 + enter * 0.1})`,
            opacity: enter,
            boxShadow: `0 40px 120px rgba(16,185,129,0.25)`,
          }}
        >
          <div
            style={{
              background: `linear-gradient(160deg, #0B1220, #0F1B2E)`,
              borderRadius: 40,
              height: "100%",
              padding: 32,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div style={{ fontFamily: mono, fontSize: 16, color: MUTED, letterSpacing: 3 }}>SOCIALINĖS VALANDOS</div>
            <div style={{ fontSize: 32, fontWeight: 700, marginTop: 8, color: TEXT }}>Mano QR kodas</div>
            <div style={{ fontFamily: body, fontSize: 17, color: MUTED, marginTop: 6 }}>Rodyk organizacijai</div>
            <div
              key={rotate}
              style={{
                marginTop: 30,
                padding: 18,
                background: "#F8FAFC",
                borderRadius: 24,
                boxShadow: `0 0 60px ${EMERALD}55`,
                animation: undefined,
              }}
            >
              <QRCode seed={rotate} size={340} />
            </div>
            <div style={{ marginTop: 24, fontFamily: mono, fontSize: 20, color: MUTED, letterSpacing: 2 }}>
              Atnaujinama po
            </div>
            <div style={{ fontFamily: mono, fontSize: 64, fontWeight: 700, color: EMERALD, marginTop: 4 }}>
              {Math.max(0, secondsLeft)}s
            </div>
            <div
              style={{
                marginTop: "auto",
                display: "flex",
                alignItems: "center",
                gap: 10,
                color: EMERALD,
                fontFamily: mono,
                fontSize: 16,
              }}
            >
              <div style={{ width: 10, height: 10, borderRadius: 10, background: EMERALD, opacity: (Math.sin(frame / 4) + 1) / 2 }} />
              HMAC PARAŠAS · SAUGU
            </div>
          </div>
        </div>

        {/* Copy */}
        <div style={{ flex: 1, opacity: interpolate(frame, [15, 40], [0, 1], { extrapolateRight: "clamp" }) }}>
          <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: -3, lineHeight: 1 }}>
            Keičiasi
            <br />
            <span style={{ color: EMERALD }}>kas 20s.</span>
          </div>
          <div style={{ fontFamily: body, fontSize: 30, color: MUTED, marginTop: 40, lineHeight: 1.4 }}>
            Kiekvienas kodas — <span style={{ color: TEXT }}>HMAC pasirašytas</span>.<br />
            Ekrano nuotrauka pasensta iškart.
          </div>
          <div style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 14 }}>
            {["Užšifruotas mokinio ID", "Laiko žymė + galiojimo laikas", "Serveris tikrina parašą"].map((t, i) => {
              const rE = spring({ frame: frame - 40 - i * 8, fps, config: { damping: 18 } });
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, opacity: rE, transform: `translateX(${(1 - rE) * 20}px)` }}>
                  <div style={{ color: EMERALD, fontFamily: mono, fontSize: 22 }}>▸</div>
                  <div style={{ fontFamily: body, fontSize: 24, color: TEXT }}>{t}</div>
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------- SCENE 3: 6-digit fallback ----------
const SceneSixDigit: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - 4, fps, config: { damping: 18 } });
  const digits = ["8", "4", "2", "9", "1", "7"];

  return (
    <AbsoluteFill style={{ background: BG, fontFamily: display, color: TEXT }}>
      <Grid accent={CYAN} />
      <div style={{ position: "absolute", top: 80, left: 100 }}>
        <Chapter n="02" label="6 SKAITMENŲ ATSARGINIS KODAS" color={CYAN} />
      </div>
      <AbsoluteFill style={{ padding: 100, paddingTop: 200, flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
        <div style={{ fontSize: 88, fontWeight: 700, letterSpacing: -3, textAlign: "center", opacity: enter, transform: `translateY(${(1 - enter) * 30}px)` }}>
          Nėra interneto? <span style={{ color: CYAN }}>Ne problema.</span>
        </div>
        <div style={{ fontFamily: body, fontSize: 28, color: MUTED, marginTop: 20, textAlign: "center", opacity: enter }}>
          Kiekvienas mokinys turi asmeninį 6 skaitmenų kodą — veikia offline.
        </div>

        {/* Digit boxes */}
        <div style={{ display: "flex", gap: 20, marginTop: 70 }}>
          {digits.map((d, i) => {
            const pop = spring({ frame: frame - 25 - i * 6, fps, config: { damping: 12, stiffness: 180 } });
            return (
              <div
                key={i}
                style={{
                  width: 140,
                  height: 180,
                  background: PANEL,
                  border: `2px solid ${CYAN}55`,
                  borderRadius: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: mono,
                  fontSize: 100,
                  fontWeight: 700,
                  color: CYAN,
                  transform: `scale(${pop})`,
                  boxShadow: `0 0 40px ${CYAN}33`,
                }}
              >
                {d}
              </div>
            );
          })}
        </div>

        {/* Callouts */}
        <div style={{ marginTop: 70, display: "flex", gap: 40, opacity: interpolate(frame, [70, 95], [0, 1], { extrapolateRight: "clamp" }) }}>
          {[
            { title: "Priskirtas asmeniškai", desc: "Susietas su mokiniu — vagyste nepadės" },
            { title: "Veikia be interneto", desc: "Popierius, žodžiu, telefonu" },
            { title: "Vienkartinis", desc: "Panaudotas — sudega iškart" },
          ].map((c, i) => (
            <div
              key={i}
              style={{
                width: 340,
                background: PANEL,
                border: `1px solid ${LINE}`,
                borderRadius: 18,
                padding: 24,
              }}
            >
              <div style={{ fontFamily: mono, fontSize: 14, color: CYAN, letterSpacing: 3 }}>0{i + 1}</div>
              <div style={{ fontSize: 26, fontWeight: 700, marginTop: 8 }}>{c.title}</div>
              <div style={{ fontFamily: body, fontSize: 18, color: MUTED, marginTop: 8 }}>{c.desc}</div>
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------- SCENE 4: Process flow ----------
const SceneProcess: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const title = spring({ frame: frame - 4, fps, config: { damping: 18 } });

  const steps = [
    { icon: "①", title: "Mokinys rezervuoja", desc: "Pasirenka organizaciją ir laiką", color: EMERALD },
    { icon: "②", title: "Atvyksta į vietą", desc: "Rodo QR kodą arba 6 skaitmenis", color: CYAN },
    { icon: "③", title: "Organizacija skenuoja", desc: "Patvirtina dalyvavimą per sekundę", color: AMBER },
    { icon: "④", title: "Valandos suskaičiuotos", desc: "Automatiškai · su audit įrašu", color: EMERALD },
  ];

  return (
    <AbsoluteFill style={{ background: BG, fontFamily: display, color: TEXT }}>
      <Grid accent={AMBER} />
      <div style={{ position: "absolute", top: 80, left: 100 }}>
        <Chapter n="03" label="PROCESAS" color={AMBER} />
      </div>
      <AbsoluteFill style={{ padding: 100, paddingTop: 200, justifyContent: "center" }}>
        <div style={{ fontSize: 90, fontWeight: 700, letterSpacing: -3, opacity: title, transform: `translateY(${(1 - title) * 30}px)` }}>
          Keturi žingsniai. <span style={{ color: AMBER }}>Nulis apgaulės.</span>
        </div>

        <div style={{ marginTop: 70, display: "flex", gap: 30, alignItems: "stretch" }}>
          {steps.map((s, i) => {
            const e = spring({ frame: frame - 20 - i * 15, fps, config: { damping: 16 } });
            const line = interpolate(frame, [30 + i * 15, 50 + i * 15], [0, 1], { extrapolateRight: "clamp" });
            return (
              <React.Fragment key={i}>
                <div
                  style={{
                    flex: 1,
                    background: PANEL,
                    border: `1px solid ${LINE}`,
                    borderRadius: 22,
                    padding: 32,
                    opacity: e,
                    transform: `translateY(${(1 - e) * 40}px)`,
                    boxShadow: `0 20px 60px ${s.color}22`,
                  }}
                >
                  <div style={{ fontSize: 70, color: s.color, fontFamily: display, lineHeight: 1 }}>{s.icon}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, marginTop: 20, lineHeight: 1.15 }}>{s.title}</div>
                  <div style={{ fontFamily: body, fontSize: 18, color: MUTED, marginTop: 10 }}>{s.desc}</div>
                </div>
                {i < steps.length - 1 && (
                  <div style={{ display: "flex", alignItems: "center", width: 40 }}>
                    <div style={{ height: 3, background: `linear-gradient(90deg, ${s.color}, ${steps[i + 1].color})`, width: `${line * 100}%`, borderRadius: 3, boxShadow: `0 0 10px ${s.color}` }} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div
          style={{
            marginTop: 70,
            fontFamily: body,
            fontSize: 28,
            color: MUTED,
            textAlign: "center",
            opacity: interpolate(frame, [130, 160], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          Kiekvienas žingsnis — užrašomas audit žurnale. Mokykla mato viską.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------- Handoff / Outro tag ----------
const SceneHandoff: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({ frame: frame - 4, fps, config: { damping: 20 } });
  const pulse = (Math.sin(frame / 6) + 1) / 2;

  return (
    <AbsoluteFill style={{ background: BG, fontFamily: display, color: TEXT }}>
      <Grid />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 30, opacity: t, transform: `scale(${0.9 + t * 0.1})` }}>
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: 24,
              background: `linear-gradient(135deg, ${EMERALD}, ${CYAN})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 60,
              boxShadow: `0 0 ${40 + pulse * 40}px ${EMERALD}`,
            }}
          >
            ✓
          </div>
          <div style={{ fontSize: 110, fontWeight: 700, letterSpacing: -4 }}>Socialinės Valandos</div>
        </div>
        <div
          style={{
            fontSize: 40,
            marginTop: 40,
            color: MUTED,
            fontFamily: body,
            opacity: interpolate(frame, [15, 40], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          Realus dalyvavimas. Realios valandos.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const QRShowcase: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Series>
        <Series.Sequence durationInFrames={80}><SceneHook /></Series.Sequence>
        <Series.Sequence durationInFrames={150}><SceneRotatingQR /></Series.Sequence>
        <Series.Sequence durationInFrames={150}><SceneSixDigit /></Series.Sequence>
        <Series.Sequence durationInFrames={180}><SceneProcess /></Series.Sequence>
        <Series.Sequence durationInFrames={70}><SceneHandoff /></Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
