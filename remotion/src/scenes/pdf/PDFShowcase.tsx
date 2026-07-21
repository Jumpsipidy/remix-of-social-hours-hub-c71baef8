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

const { fontFamily: display } = loadGrotesk("normal", {
  weights: ["500", "700"],
  subsets: ["latin"],
});
const { fontFamily: body } = loadInter("normal", {
  weights: ["400", "600"],
  subsets: ["latin"],
});
const { fontFamily: mono } = loadMono("normal", {
  weights: ["400", "700"],
  subsets: ["latin"],
});

const BG = "#070B14";
const PANEL = "#0F1626";
const LINE = "#1E293B";
const EMERALD = "#10B981";
const CYAN = "#06B6D4";
const AMBER = "#F59E0B";
const VIOLET = "#8B5CF6";
const TEXT = "#E2E8F0";
const MUTED = "#64748B";

// --- Ambient background ---
const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 90) * 40;
  return (
    <AbsoluteFill style={{ background: BG }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(1200px 800px at ${50 + drift / 4}% ${
            30 + drift / 8
          }%, rgba(16,185,129,0.10), transparent 60%), radial-gradient(1000px 700px at ${
            60 - drift / 6
          }% 80%, rgba(139,92,246,0.10), transparent 60%)`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(148,163,184,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.06) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          transform: `translate(${drift / 3}px, ${drift / 5}px)`,
          maskImage:
            "radial-gradient(ellipse at center, black 40%, transparent 80%)",
        }}
      />
    </AbsoluteFill>
  );
};

// --- Small QR pattern for cert ---
const MiniQR: React.FC<{ size: number }> = ({ size }) => {
  const N = 21;
  const cells: boolean[] = [];
  let s = 424242;
  for (let i = 0; i < N * N; i++) {
    s = (s * 9301 + 49297) % 233280;
    cells.push(s / 233280 > 0.5);
  }
  const cs = size / N;
  return (
    <svg width={size} height={size} style={{ borderRadius: 8 }}>
      <rect width={size} height={size} fill="#F8FAFC" />
      {cells.map((v, i) => {
        if (!v) return null;
        const r = Math.floor(i / N);
        const c = i % N;
        return (
          <rect
            key={i}
            x={c * cs}
            y={r * cs}
            width={cs}
            height={cs}
            fill="#0A0F1F"
          />
        );
      })}
      {/* finders */}
      {[
        [0, 0],
        [0, N - 7],
        [N - 7, 0],
      ].map(([r, c], i) => (
        <g key={i}>
          <rect
            x={c * cs}
            y={r * cs}
            width={cs * 7}
            height={cs * 7}
            fill="#F8FAFC"
          />
          <rect
            x={c * cs}
            y={r * cs}
            width={cs * 7}
            height={cs * 7}
            fill="none"
            stroke="#0A0F1F"
            strokeWidth={cs}
          />
          <rect
            x={(c + 2) * cs}
            y={(r + 2) * cs}
            width={cs * 3}
            height={cs * 3}
            fill="#0A0F1F"
          />
        </g>
      ))}
    </svg>
  );
};

// ========== SCENE 1: HOOK ==========
const SceneHook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t1 = spring({ frame: frame - 4, fps, config: { damping: 18 } });
  const t2 = spring({ frame: frame - 16, fps, config: { damping: 18 } });
  const t3 = spring({ frame: frame - 30, fps, config: { damping: 18 } });
  const t4 = spring({ frame: frame - 44, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: 100,
      }}
    >
      <div
        style={{
          fontFamily: mono,
          fontSize: 18,
          color: EMERALD,
          letterSpacing: 6,
          textTransform: "uppercase",
          opacity: t1,
          transform: `translateY(${interpolate(t1, [0, 1], [20, 0])}px)`,
          marginBottom: 30,
        }}
      >
        SOCIALINĖS VALANDOS · ĮRODYMAS
      </div>
      <div
        style={{
          fontFamily: display,
          fontWeight: 700,
          fontSize: 132,
          color: TEXT,
          lineHeight: 1,
          textAlign: "center",
          letterSpacing: -3,
        }}
      >
        <span
          style={{
            display: "inline-block",
            opacity: t2,
            transform: `translateY(${interpolate(t2, [0, 1], [40, 0])}px)`,
          }}
        >
          Kaip{" "}
        </span>
        <span
          style={{
            display: "inline-block",
            opacity: t3,
            transform: `translateY(${interpolate(t3, [0, 1], [40, 0])}px)`,
            background: `linear-gradient(120deg, ${EMERALD}, ${CYAN})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          įrodyti
        </span>
        <br />
        <span
          style={{
            display: "inline-block",
            opacity: t4,
            transform: `translateY(${interpolate(t4, [0, 1], [40, 0])}px)`,
          }}
        >
          savo valandas?
        </span>
      </div>
      <div
        style={{
          marginTop: 40,
          fontFamily: body,
          fontSize: 26,
          color: MUTED,
          opacity: interpolate(frame, [55, 75], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        Du būdai. Nulis popierių. Šimtaprocentinis įrodymas.
      </div>
    </AbsoluteFill>
  );
};

// ========== SCENE 2: METHOD 1 - DASHBOARD ==========
const SceneMethod1: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const label = spring({ frame: frame - 2, fps, config: { damping: 18 } });
  const card = spring({ frame: frame - 10, fps, config: { damping: 18 } });
  const rows = [0, 1, 2].map((i) =>
    spring({ frame: frame - 26 - i * 8, fps, config: { damping: 20 } })
  );
  const highlight = interpolate(frame, [70, 90], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ padding: 90 }}>
      {/* Left column */}
      <div
        style={{
          position: "absolute",
          left: 90,
          top: 100,
          width: 640,
          opacity: label,
        }}
      >
        <div
          style={{
            fontFamily: mono,
            color: EMERALD,
            letterSpacing: 6,
            fontSize: 16,
            textTransform: "uppercase",
          }}
        >
          BŪDAS 01 · automatinis
        </div>
        <div
          style={{
            fontFamily: display,
            fontWeight: 700,
            color: TEXT,
            fontSize: 78,
            lineHeight: 1.05,
            marginTop: 18,
            letterSpacing: -2,
          }}
        >
          Mokyklos<br />
          <span
            style={{
              background: `linear-gradient(120deg, ${EMERALD}, ${CYAN})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            skydelyje
          </span>
        </div>
        <div
          style={{
            fontFamily: body,
            color: MUTED,
            fontSize: 22,
            marginTop: 22,
            lineHeight: 1.5,
            opacity: interpolate(frame, [18, 38], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          Kai organizacija patvirtina — valandos <span style={{ color: TEXT }}>tuoj pat</span> atsiranda
          administratoriaus skydelyje. Nereikia siųsti popieriaus, laukti pašto ar
          rankiniu būdu suvedinėti.
        </div>
      </div>

      {/* Dashboard mockup */}
      <div
        style={{
          position: "absolute",
          right: 90,
          top: 130,
          width: 900,
          height: 620,
          background: PANEL,
          border: `1px solid ${LINE}`,
          borderRadius: 24,
          padding: 30,
          opacity: card,
          transform: `translateY(${interpolate(card, [0, 1], [40, 0])}px) scale(${interpolate(card, [0, 1], [0.96, 1])})`,
          boxShadow: "0 40px 80px rgba(0,0,0,0.5)",
          overflow: "hidden",
        }}
      >
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
          <div style={{ width: 12, height: 12, borderRadius: 6, background: "#EF4444" }} />
          <div style={{ width: 12, height: 12, borderRadius: 6, background: "#F59E0B" }} />
          <div style={{ width: 12, height: 12, borderRadius: 6, background: "#10B981" }} />
          <div
            style={{
              marginLeft: 16,
              fontFamily: mono,
              fontSize: 14,
              color: MUTED,
            }}
          >
            socialinesvalandos.lt / mokykla
          </div>
        </div>
        <div
          style={{
            fontFamily: display,
            fontWeight: 700,
            fontSize: 28,
            color: TEXT,
            marginBottom: 4,
          }}
        >
          Šeduvos gimnazija
        </div>
        <div style={{ fontFamily: body, fontSize: 16, color: MUTED, marginBottom: 24 }}>
          Mokinių valandų peržiūra · realaus laiko
        </div>

        {/* KPI strip */}
        <div style={{ display: "flex", gap: 14, marginBottom: 24 }}>
          {[
            { l: "Aktyvūs mokiniai", v: "142", c: EMERALD },
            { l: "Iš viso valandų", v: "1 284", c: CYAN },
            { l: "Šią savaitę", v: "+ 96", c: AMBER },
          ].map((k, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                background: "#0A101C",
                border: `1px solid ${LINE}`,
                borderRadius: 14,
                padding: "14px 16px",
              }}
            >
              <div style={{ fontFamily: body, fontSize: 12, color: MUTED, letterSpacing: 1, textTransform: "uppercase" }}>
                {k.l}
              </div>
              <div
                style={{
                  fontFamily: display,
                  fontWeight: 700,
                  color: k.c,
                  fontSize: 30,
                  marginTop: 4,
                }}
              >
                {k.v}
              </div>
            </div>
          ))}
        </div>

        {/* Table rows */}
        {[
          { n: "Ema Kazlauskaitė", cls: "9b", h: "18 / 20", cur: 18 },
          { n: "Jonas Petraitis", cls: "7a", h: "20 / 20", cur: 20 },
          { n: "Ugnė Butkutė", cls: "10c", h: "14 / 20", cur: 14 },
        ].map((r, i) => {
          const flash = i === 1 ? highlight : 0;
          return (
            <div
              key={i}
              style={{
                opacity: rows[i],
                transform: `translateX(${interpolate(rows[i], [0, 1], [30, 0])}px)`,
                display: "flex",
                alignItems: "center",
                padding: "14px 18px",
                borderRadius: 12,
                marginBottom: 8,
                background: i === 1
                  ? `linear-gradient(90deg, rgba(16,185,129,${0.06 + flash * 0.14}), rgba(6,182,212,${0.02 + flash * 0.08}))`
                  : "#0A101C",
                border: `1px solid ${i === 1 ? `rgba(16,185,129,${0.2 + flash * 0.5})` : LINE}`,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: body, fontWeight: 600, color: TEXT, fontSize: 18 }}>{r.n}</div>
                <div style={{ fontFamily: mono, fontSize: 13, color: MUTED, marginTop: 2 }}>klasė {r.cls}</div>
              </div>
              <div style={{ width: 260, height: 8, background: LINE, borderRadius: 4, overflow: "hidden", marginRight: 20 }}>
                <div
                  style={{
                    width: `${(r.cur / 20) * 100}%`,
                    height: "100%",
                    background: `linear-gradient(90deg, ${EMERALD}, ${CYAN})`,
                  }}
                />
              </div>
              <div style={{ fontFamily: mono, fontWeight: 700, color: TEXT, fontSize: 18, width: 100, textAlign: "right" }}>
                {r.h}
              </div>
              {i === 1 && flash > 0 && (
                <div
                  style={{
                    position: "absolute",
                    right: 40,
                    fontFamily: mono,
                    fontSize: 12,
                    color: EMERALD,
                    letterSpacing: 2,
                    textTransform: "uppercase",
                    opacity: flash,
                    transform: `translateX(${interpolate(flash, [0, 1], [20, 0])}px)`,
                  }}
                >
                  ↑ atnaujinta
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ========== SCENE 3: METHOD 2 - PDF ==========
const SceneMethod2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const label = spring({ frame: frame - 2, fps, config: { damping: 18 } });
  const pdf = spring({ frame: frame - 14, fps, config: { damping: 16 } });
  const stamp = spring({ frame: frame - 55, fps, config: { damping: 10, stiffness: 120 } });
  const qr = spring({ frame: frame - 35, fps, config: { damping: 18 } });
  const linesIn = interpolate(frame, [22, 60], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ padding: 90 }}>
      {/* Right column text */}
      <div
        style={{
          position: "absolute",
          right: 90,
          top: 110,
          width: 640,
          opacity: label,
          textAlign: "right",
        }}
      >
        <div
          style={{
            fontFamily: mono,
            color: VIOLET,
            letterSpacing: 6,
            fontSize: 16,
            textTransform: "uppercase",
          }}
        >
          BŪDAS 02 · oficialu
        </div>
        <div
          style={{
            fontFamily: display,
            fontWeight: 700,
            color: TEXT,
            fontSize: 78,
            lineHeight: 1.05,
            marginTop: 18,
            letterSpacing: -2,
          }}
        >
          PDF<br />
          <span
            style={{
              background: `linear-gradient(120deg, ${VIOLET}, ${AMBER})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            sertifikatas
          </span>
        </div>
        <div
          style={{
            fontFamily: body,
            color: MUTED,
            fontSize: 22,
            marginTop: 22,
            lineHeight: 1.5,
            opacity: interpolate(frame, [18, 38], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          Vienu paspaudimu — <span style={{ color: TEXT }}>pasirašytas PDF</span> su
          QR kodu ir HMAC parašu. Tinka spausdinti, siųsti ar prisegti į
          e-dienyną.
        </div>
      </div>

      {/* PDF certificate */}
      <div
        style={{
          position: "absolute",
          left: 130,
          top: 90,
          width: 700,
          height: 900,
          background: "#F8FAFC",
          borderRadius: 8,
          padding: "60px 50px",
          opacity: pdf,
          transform: `translateY(${interpolate(pdf, [0, 1], [50, 0])}px) rotate(${interpolate(pdf, [0, 1], [-4, -2])}deg)`,
          boxShadow: "0 60px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)",
          overflow: "hidden",
        }}
      >
        {/* Cert header */}
        <div
          style={{
            fontFamily: mono,
            fontSize: 11,
            color: "#64748B",
            letterSpacing: 3,
            textTransform: "uppercase",
          }}
        >
          Socialinių valandų sertifikatas
        </div>
        <div
          style={{
            fontFamily: display,
            fontWeight: 700,
            fontSize: 44,
            color: "#0A0F1F",
            marginTop: 20,
            letterSpacing: -1.5,
            lineHeight: 1.1,
          }}
        >
          Ema Kazlauskaitė
        </div>
        <div
          style={{
            fontFamily: body,
            color: "#334155",
            fontSize: 18,
            marginTop: 8,
          }}
        >
          Šeduvos gimnazija · klasė 9b
        </div>

        <div style={{ height: 1, background: "#E2E8F0", margin: "36px 0 28px" }} />

        {/* Big hours */}
        <div
          style={{
            fontFamily: display,
            fontSize: 200,
            fontWeight: 700,
            color: "#0A0F1F",
            lineHeight: 1,
            letterSpacing: -6,
          }}
        >
          20{" "}
          <span style={{ fontSize: 60, fontWeight: 500, color: "#64748B" }}>val</span>
        </div>
        <div
          style={{
            fontFamily: body,
            color: "#334155",
            fontSize: 16,
            marginTop: 8,
          }}
        >
          Patvirtintų socialinės veiklos valandų
        </div>

        {/* Rows */}
        <div style={{ marginTop: 34 }}>
          {[
            { d: "2026-05-14", org: "Šeduvos senelių namai", h: "6 val" },
            { d: "2026-06-02", org: "Miesto biblioteka", h: "8 val" },
            { d: "2026-06-18", org: "Aplinkos švarinimas", h: "6 val" },
          ].map((r, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontFamily: mono,
                fontSize: 13,
                color: "#334155",
                padding: "8px 0",
                borderBottom: "1px dashed #E2E8F0",
                opacity: interpolate(linesIn, [i * 0.25, i * 0.25 + 0.4], [0, 1], { extrapolateRight: "clamp" }),
                transform: `translateX(${interpolate(linesIn, [i * 0.25, i * 0.25 + 0.4], [-20, 0], { extrapolateRight: "clamp" })}px)`,
              }}
            >
              <span>{r.d}</span>
              <span style={{ flex: 1, marginLeft: 16, color: "#0A0F1F" }}>{r.org}</span>
              <span style={{ fontWeight: 700, color: "#0A0F1F" }}>{r.h}</span>
            </div>
          ))}
        </div>

        {/* QR + code */}
        <div
          style={{
            position: "absolute",
            bottom: 50,
            left: 50,
            right: 50,
            display: "flex",
            alignItems: "flex-end",
            gap: 20,
          }}
        >
          <div
            style={{
              opacity: qr,
              transform: `scale(${interpolate(qr, [0, 1], [0.8, 1])})`,
            }}
          >
            <MiniQR size={130} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: mono, fontSize: 10, color: "#64748B", letterSpacing: 2, textTransform: "uppercase" }}>
              Verifikacijos kodas
            </div>
            <div style={{ fontFamily: mono, fontWeight: 700, fontSize: 20, color: "#0A0F1F", marginTop: 4 }}>
              SV-A9F2-KLM7-2X41
            </div>
            <div style={{ fontFamily: mono, fontSize: 10, color: "#64748B", marginTop: 8 }}>
              HMAC-SHA256 · pasirašyta serveryje
            </div>
          </div>
        </div>

        {/* Stamp */}
        <div
          style={{
            position: "absolute",
            top: 80,
            right: 40,
            width: 130,
            height: 130,
            borderRadius: 65,
            border: `4px solid ${EMERALD}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            transform: `rotate(-14deg) scale(${stamp})`,
            opacity: stamp,
            color: EMERALD,
            fontFamily: mono,
            fontWeight: 700,
          }}
        >
          <div style={{ fontSize: 22, letterSpacing: 2 }}>VERIFIED</div>
          <div style={{ fontSize: 10, letterSpacing: 1, marginTop: 4 }}>2026-07-21</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ========== SCENE 4: HOW TO VERIFY ==========
const SceneVerify: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const title = spring({ frame: frame - 2, fps, config: { damping: 18 } });
  const steps = [0, 1, 2].map((i) =>
    spring({ frame: frame - 18 - i * 12, fps, config: { damping: 18 } })
  );
  const check = spring({ frame: frame - 70, fps, config: { damping: 10, stiffness: 120 } });

  const stepData = [
    { n: "01", t: "Nuskaityti QR", d: "Bet kuris žmogus telefonu atidaro sertifikato QR kodą.", c: EMERALD },
    { n: "02", t: "Atidaromas verifikacijos puslapis", d: "socialinesvalandos.lt/verify/SV-A9F2-…", c: CYAN },
    { n: "03", t: "Serveris tikrina parašą", d: "HMAC atitinka → sertifikatas galiojantis, laikas rodomas.", c: VIOLET },
  ];

  return (
    <AbsoluteFill style={{ padding: 100, justifyContent: "center" }}>
      <div style={{ opacity: title, marginBottom: 60 }}>
        <div
          style={{
            fontFamily: mono,
            color: AMBER,
            letterSpacing: 6,
            fontSize: 16,
            textTransform: "uppercase",
          }}
        >
          KAIP PATIKRINTI
        </div>
        <div
          style={{
            fontFamily: display,
            fontWeight: 700,
            fontSize: 80,
            color: TEXT,
            marginTop: 14,
            letterSpacing: -2,
            lineHeight: 1,
          }}
        >
          3 žingsniai,{" "}
          <span
            style={{
              background: `linear-gradient(120deg, ${AMBER}, ${EMERALD})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            3 sekundės
          </span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 24 }}>
        {stepData.map((s, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              opacity: steps[i],
              transform: `translateY(${interpolate(steps[i], [0, 1], [40, 0])}px)`,
              background: PANEL,
              border: `1px solid ${LINE}`,
              borderRadius: 20,
              padding: 32,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -40,
                right: -20,
                fontFamily: display,
                fontWeight: 700,
                fontSize: 200,
                color: s.c,
                opacity: 0.08,
                lineHeight: 1,
              }}
            >
              {s.n}
            </div>
            <div style={{ fontFamily: mono, fontSize: 14, color: s.c, letterSpacing: 4 }}>
              {s.n}
            </div>
            <div
              style={{
                fontFamily: display,
                fontWeight: 700,
                fontSize: 32,
                color: TEXT,
                marginTop: 16,
                lineHeight: 1.15,
              }}
            >
              {s.t}
            </div>
            <div
              style={{
                fontFamily: body,
                fontSize: 17,
                color: MUTED,
                marginTop: 12,
                lineHeight: 1.5,
              }}
            >
              {s.d}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          opacity: check,
          transform: `scale(${check})`,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            background: EMERALD,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#0A0F1F",
            fontWeight: 700,
            fontSize: 26,
          }}
        >
          ✓
        </div>
        <div
          style={{
            fontFamily: display,
            fontWeight: 600,
            fontSize: 34,
            color: TEXT,
          }}
        >
          Neįmanoma suklastoti. Neįmanoma atmesti.
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ========== MAIN ==========
export const PDFShowcase: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: BG, fontFamily: body }}>
      <Backdrop />
      <Series>
        <Series.Sequence durationInFrames={120}>
          <SceneHook />
        </Series.Sequence>
        <Series.Sequence durationInFrames={220}>
          <SceneMethod1 />
        </Series.Sequence>
        <Series.Sequence durationInFrames={230}>
          <SceneMethod2 />
        </Series.Sequence>
        <Series.Sequence durationInFrames={210}>
          <SceneVerify />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
