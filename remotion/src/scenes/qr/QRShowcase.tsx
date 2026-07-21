import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Series,
  Sequence,
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

// Deterministic pseudo QR grid — same seed always => same pattern
const qrPattern = (seed: number, size: number) => {
  const cells: boolean[] = [];
  let s = seed * 9301 + 49297;
  for (let i = 0; i < size * size; i++) {
    s = (s * 9301 + 49297) % 233280;
    cells.push(s / 233280 > 0.5);
  }
  // Finder patterns corners
  const set = (r: number, c: number, v: boolean) => (cells[r * size + c] = v);
  const drawFinder = (r0: number, c0: number) => {
    for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) {
      const edge = r === 0 || r === 6 || c === 0 || c === 6;
      const inner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      set(r0 + r, c0 + c, edge || inner);
    }
    // Clear ring
    for (let r = 1; r <= 5; r++) for (let c = 1; c <= 5; c++) {
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

const Grid: React.FC = () => {
  const frame = useCurrentFrame();
  const shift = (frame * 0.4) % 80;
  return (
    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.35 }}>
      <defs>
        <pattern id="g" width="80" height="80" patternUnits="userSpaceOnUse" x={shift} y={shift}>
          <path d="M 80 0 L 0 0 0 80" fill="none" stroke={LINE} strokeWidth="1" />
        </pattern>
        <radialGradient id="rg" cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor={EMERALD} stopOpacity="0.15" />
          <stop offset="60%" stopColor={CYAN} stopOpacity="0.05" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)" />
      <rect width="100%" height="100%" fill="url(#rg)" />
    </svg>
  );
};

// ---------- SCENE 1: Hook ----------
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
        <div style={{ display: "flex", alignItems: "center", gap: 18, opacity: s1, transform: `translateX(${(1 - s1) * -40}px)` }}>
          <div style={{ width: 10, height: 10, borderRadius: 10, background: EMERALD, boxShadow: `0 0 20px ${EMERALD}` }} />
          <div style={{ fontFamily: mono, fontSize: 22, color: EMERALD, letterSpacing: 4 }}>NEW · v2.6</div>
        </div>
        <div
          style={{
            fontSize: 220,
            fontWeight: 700,
            letterSpacing: -8,
            lineHeight: 0.95,
            marginTop: 30,
            opacity: s2,
            transform: `translateY(${(1 - s2) * 40}px)`,
          }}
        >
          QR check-in.
        </div>
        <div
          style={{
            fontSize: 220,
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
          Zero ghost hours.
        </div>
        <div
          style={{
            marginTop: 40,
            height: 2,
            background: `linear-gradient(90deg, ${EMERALD}, ${CYAN}, transparent)`,
            width: `${line * 60}%`,
          }}
        />
        <div style={{ fontFamily: body, fontSize: 30, color: MUTED, marginTop: 30, opacity: interpolate(frame, [45, 65], [0, 1], { extrapolateRight: "clamp" }) }}>
          Socialinės Valandos · verified attendance system
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------- SCENE 2: Problem ----------
const SceneProblem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({ frame: frame - 5, fps, config: { damping: 20 } });
  const strike = interpolate(frame, [40, 70], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: BG, fontFamily: display, color: TEXT }}>
      <Grid />
      <AbsoluteFill style={{ padding: 140, justifyContent: "center", alignItems: "flex-start" }}>
        <div style={{ fontFamily: mono, fontSize: 22, color: "#EF4444", letterSpacing: 4, opacity: t }}>
          THE PROBLEM
        </div>
        <div
          style={{
            fontSize: 130,
            fontWeight: 700,
            letterSpacing: -4,
            lineHeight: 1.02,
            marginTop: 24,
            opacity: t,
            transform: `translateX(${(1 - t) * -40}px)`,
            position: "relative",
          }}
        >
          Students claim hours
          <br /> they never worked.
          <div
            style={{
              position: "absolute",
              left: 0,
              top: "50%",
              height: 8,
              background: "#EF4444",
              width: `${strike * 100}%`,
              boxShadow: "0 0 30px #EF4444",
            }}
          />
        </div>
        <div
          style={{
            marginTop: 60,
            fontFamily: body,
            fontSize: 34,
            color: MUTED,
            opacity: interpolate(frame, [70, 95], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          → Signed papers get forged.  → Phone photos get faked.  → Admins can't verify.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------- SCENE 3: Student QR ----------
const SceneStudentQR: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - 6, fps, config: { damping: 18 } });
  const rotate = Math.floor(frame / 20); // "rotating" QR every ~0.66s

  return (
    <AbsoluteFill style={{ background: BG, fontFamily: display, color: TEXT }}>
      <Grid />
      <AbsoluteFill style={{ padding: 120, flexDirection: "row", alignItems: "center", gap: 100 }}>
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
            <div style={{ fontFamily: mono, fontSize: 18, color: MUTED, letterSpacing: 3 }}>
              SOCIALINĖS VALANDOS
            </div>
            <div style={{ fontSize: 34, fontWeight: 700, marginTop: 8, color: TEXT }}>Mano QR kodas</div>
            <div style={{ fontFamily: body, fontSize: 18, color: MUTED, marginTop: 6 }}>
              Rodyk jį organizacijai
            </div>
            <div
              style={{
                marginTop: 32,
                padding: 18,
                background: "#F8FAFC",
                borderRadius: 24,
                boxShadow: `0 0 60px ${EMERALD}55`,
              }}
            >
              <QRCode seed={rotate + 1} size={340} />
            </div>
            <div
              style={{
                marginTop: 24,
                fontFamily: mono,
                fontSize: 44,
                letterSpacing: 12,
                color: TEXT,
                fontWeight: 700,
              }}
            >
              8 4 2 · 9 1 7
            </div>
            <div style={{ fontFamily: body, fontSize: 16, color: MUTED, marginTop: 6 }}>
              Atsarginis kodas (offline)
            </div>
            <div
              style={{
                marginTop: "auto",
                display: "flex",
                alignItems: "center",
                gap: 10,
                color: EMERALD,
                fontFamily: mono,
                fontSize: 18,
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 10,
                  background: EMERALD,
                  opacity: (Math.sin(frame / 4) + 1) / 2,
                }}
              />
              ATNAUJINAMA · 20s
            </div>
          </div>
        </div>

        {/* Copy */}
        <div style={{ flex: 1, opacity: interpolate(frame, [20, 45], [0, 1], { extrapolateRight: "clamp" }) }}>
          <div style={{ fontFamily: mono, fontSize: 22, color: CYAN, letterSpacing: 4 }}>
            01 · MOKINYS
          </div>
          <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: -3, lineHeight: 1, marginTop: 20 }}>
            Rotuojantis
            <br />
            <span style={{ color: EMERALD }}>QR kodas.</span>
          </div>
          <div style={{ fontFamily: body, fontSize: 30, color: MUTED, marginTop: 40, lineHeight: 1.4 }}>
            HMAC pasirašytas. Keičiasi kas 20 sekundžių.
            <br />
            Ekrano nuotrauka nepadės.
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------- SCENE 4: Organization scans ----------
const SceneScan: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - 4, fps, config: { damping: 18 } });
  const scanY = interpolate(frame % 60, [0, 60], [0, 1]);
  const success = frame > 90;
  const successPop = spring({ frame: frame - 90, fps, config: { damping: 12 } });

  return (
    <AbsoluteFill style={{ background: BG, fontFamily: display, color: TEXT }}>
      <Grid />
      <AbsoluteFill style={{ padding: 120, flexDirection: "row", alignItems: "center", gap: 100 }}>
        {/* Copy left */}
        <div style={{ flex: 1, opacity: enter }}>
          <div style={{ fontFamily: mono, fontSize: 22, color: AMBER, letterSpacing: 4 }}>
            02 · ORGANIZACIJA
          </div>
          <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: -3, lineHeight: 1, marginTop: 20 }}>
            Skenuoja &
            <br />
            <span style={{ color: AMBER }}>patvirtina.</span>
          </div>
          <div style={{ fontFamily: body, fontSize: 30, color: MUTED, marginTop: 40, lineHeight: 1.4 }}>
            Kamera arba 6 skaitmenų kodas —
            <br /> veikia ir be interneto.
          </div>
        </div>

        {/* Scanner viewport */}
        <div
          style={{
            width: 720,
            height: 720,
            background: "#020617",
            borderRadius: 32,
            border: `2px solid ${LINE}`,
            padding: 24,
            transform: `scale(${0.9 + enter * 0.1})`,
            opacity: enter,
            boxShadow: `0 40px 120px rgba(245,158,11,0.25)`,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: TEXT, fontFamily: mono, fontSize: 18 }}>
            <span>● SCAN</span>
            <span style={{ color: MUTED }}>organization/scan</span>
          </div>

          <div
            style={{
              marginTop: 20,
              width: "100%",
              aspectRatio: "1",
              background: "linear-gradient(180deg, #0B1220, #050810)",
              borderRadius: 20,
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <div style={{ transform: `scale(${success ? 1 - successPop * 0.15 : 1})`, transition: "0.2s" }}>
              <QRCode seed={2} size={420} color="#0F172A" bg="#F8FAFC" />
            </div>

            {/* corners */}
            {[[20, 20, 1, 1], [20, 20, -1, 1], [20, 20, 1, -1], [20, 20, -1, -1]].map((c, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  width: 60,
                  height: 60,
                  borderTop: `4px solid ${success ? EMERALD : AMBER}`,
                  borderLeft: `4px solid ${success ? EMERALD : AMBER}`,
                  top: c[2] === 1 ? 40 : "auto",
                  bottom: c[2] === -1 ? 40 : "auto",
                  left: c[3] === 1 ? 40 : "auto",
                  right: c[3] === -1 ? 40 : "auto",
                  transform: `rotate(${i === 1 ? 90 : i === 2 ? -90 : i === 3 ? 180 : 0}deg)`,
                }}
              />
            ))}

            {/* scan bar */}
            {!success && (
              <div
                style={{
                  position: "absolute",
                  left: 40,
                  right: 40,
                  top: `${20 + scanY * 60}%`,
                  height: 3,
                  background: AMBER,
                  boxShadow: `0 0 30px ${AMBER}`,
                }}
              />
            )}

            {/* success overlay */}
            {success && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `${EMERALD}22`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: `scale(${successPop})`,
                }}
              >
                <div
                  style={{
                    background: EMERALD,
                    borderRadius: 999,
                    width: 200,
                    height: 200,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 120,
                    color: "#04140C",
                    fontWeight: 700,
                  }}
                >
                  ✓
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 18, fontFamily: mono, fontSize: 20, color: success ? EMERALD : MUTED }}>
            {success ? "✓ Elijas P. · 5 val. patvirtinta" : "Ieškoma kodo..."}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------- SCENE 5: Result / dashboard ----------
const SceneResult: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - 4, fps, config: { damping: 18 } });
  const bar = interpolate(frame, [20, 70], [0, 1], { extrapolateRight: "clamp" });
  const rows = [
    { name: "Elijas P.", hrs: "5.0", time: "14:32", ok: true },
    { name: "Gabija S.", hrs: "3.0", time: "14:31", ok: true },
    { name: "Matas R.", hrs: "5.0", time: "14:30", ok: true },
  ];

  return (
    <AbsoluteFill style={{ background: BG, fontFamily: display, color: TEXT }}>
      <Grid />
      <AbsoluteFill style={{ padding: 100 }}>
        <div style={{ fontFamily: mono, fontSize: 22, color: EMERALD, letterSpacing: 4, opacity: enter }}>
          03 · REZULTATAS
        </div>
        <div
          style={{
            fontSize: 90,
            fontWeight: 700,
            letterSpacing: -3,
            marginTop: 12,
            opacity: enter,
            transform: `translateY(${(1 - enter) * 40}px)`,
          }}
        >
          Valandos iškart <span style={{ color: EMERALD }}>skaičiuojamos.</span>
        </div>

        {/* Dashboard card */}
        <div
          style={{
            marginTop: 60,
            background: PANEL,
            border: `1px solid ${LINE}`,
            borderRadius: 24,
            padding: 40,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 40,
            opacity: enter,
            boxShadow: `0 40px 120px rgba(16,185,129,0.15)`,
          }}
        >
          {/* Progress */}
          <div>
            <div style={{ fontFamily: body, fontSize: 22, color: MUTED }}>Elijas P. · 8a klasė</div>
            <div style={{ fontSize: 40, fontWeight: 700, marginTop: 8 }}>Progresas</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 24 }}>
              <div style={{ fontSize: 90, fontWeight: 700, color: EMERALD }}>
                {Math.floor(interpolate(bar, [0, 1], [0, 13]))}
              </div>
              <div style={{ fontSize: 30, color: MUTED, fontFamily: body }}>/ 20 val.</div>
            </div>
            <div
              style={{
                height: 14,
                background: LINE,
                borderRadius: 999,
                marginTop: 20,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${bar * 65}%`,
                  height: "100%",
                  background: `linear-gradient(90deg, ${EMERALD}, ${CYAN})`,
                  boxShadow: `0 0 20px ${EMERALD}`,
                }}
              />
            </div>
            <div style={{ fontFamily: body, fontSize: 22, color: MUTED, marginTop: 16 }}>
              +5 val. ką tik patvirtinta ✓
            </div>
          </div>

          {/* Live feed */}
          <div>
            <div style={{ fontFamily: mono, fontSize: 18, color: MUTED, letterSpacing: 3 }}>
              GYVA · AUDIT LOG
            </div>
            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              {rows.map((r, i) => {
                const rowE = spring({ frame: frame - 30 - i * 10, fps, config: { damping: 18 } });
                return (
                  <div
                    key={i}
                    style={{
                      background: "#0A1220",
                      border: `1px solid ${LINE}`,
                      borderRadius: 14,
                      padding: "16px 20px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      opacity: rowE,
                      transform: `translateX(${(1 - rowE) * 30}px)`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 999,
                          background: `${EMERALD}22`,
                          border: `1px solid ${EMERALD}`,
                          color: EMERALD,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 18,
                        }}
                      >
                        ✓
                      </div>
                      <div>
                        <div style={{ fontSize: 22, fontWeight: 600 }}>{r.name}</div>
                        <div style={{ fontFamily: mono, fontSize: 14, color: MUTED }}>
                          QR · {r.time}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontFamily: mono, fontSize: 22, color: EMERALD, fontWeight: 700 }}>
                      +{r.hrs}h
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------- SCENE 6: Outro ----------
const SceneOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({ frame: frame - 4, fps, config: { damping: 20 } });
  const t2 = spring({ frame: frame - 20, fps, config: { damping: 20 } });
  const pulse = (Math.sin(frame / 8) + 1) / 2;

  return (
    <AbsoluteFill style={{ background: BG, fontFamily: display, color: TEXT }}>
      <Grid />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 30,
            opacity: t,
            transform: `scale(${0.9 + t * 0.1})`,
          }}
        >
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
          <div style={{ fontSize: 120, fontWeight: 700, letterSpacing: -4 }}>
            Socialinės Valandos
          </div>
        </div>
        <div
          style={{
            fontSize: 44,
            marginTop: 40,
            color: MUTED,
            fontFamily: body,
            opacity: t2,
            transform: `translateY(${(1 - t2) * 20}px)`,
          }}
        >
          Realios valandos. Realus dalyvavimas.
        </div>
        <div
          style={{
            marginTop: 60,
            fontFamily: mono,
            fontSize: 22,
            color: EMERALD,
            letterSpacing: 6,
            opacity: interpolate(frame, [40, 60], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          v2.6 · QR CHECK-IN · LIVE
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
        <Series.Sequence durationInFrames={100}><SceneProblem /></Series.Sequence>
        <Series.Sequence durationInFrames={130}><SceneStudentQR /></Series.Sequence>
        <Series.Sequence durationInFrames={140}><SceneScan /></Series.Sequence>
        <Series.Sequence durationInFrames={140}><SceneResult /></Series.Sequence>
        <Series.Sequence durationInFrames={90}><SceneOutro /></Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
