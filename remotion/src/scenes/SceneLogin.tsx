import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig } from "remotion";
import { AmbientBg, Logo, COLORS, Cursor, interp } from "../ui/primitives";

const EMAIL = "lukas.stankevicius@dev.local";
const PASS = "••••••••••";

export const SceneLogin: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cardIn = spring({ frame, fps, config: { damping: 20 } });
  const leftIn = spring({ frame: frame - 10, fps, config: { damping: 22 } });

  // typing
  const emailStart = 60;
  const emailChars = Math.max(0, Math.min(EMAIL.length, Math.floor((frame - emailStart) / 1.6)));
  const passStart = 140;
  const passChars = Math.max(0, Math.min(PASS.length, Math.floor((frame - passStart) / 2)));

  // cursor trajectory: idle → email field → password field → submit
  const cx = interp(frame, [30, 55, 80, 130, 160, 210, 240], [1400, 1200, 1200, 1200, 1200, 1200, 1200]);
  const cy = interp(frame, [30, 55, 80, 130, 160, 210, 240], [600, 420, 420, 520, 520, 620, 620]);
  const clicking = (frame >= 55 && frame <= 62) || (frame >= 138 && frame <= 145) || (frame >= 218 && frame <= 228);

  // submit ripple
  const submitPress = interp(frame, [218, 230], [1, 0.96]);
  const flash = interp(frame, [228, 250, 280], [0, 1, 0]);

  const outO = interp(frame, [280, 300], [1, 0]);

  return (
    <AbsoluteFill style={{ opacity: outO }}>
      <AmbientBg />
      {/* Top logo */}
      <div style={{ position: "absolute", top: 60, left: 100 }}>
        <Logo scale={1.1} />
      </div>

      {/* Left column */}
      <div
        style={{
          position: "absolute",
          top: 200,
          left: 100,
          width: 700,
          opacity: leftIn,
          transform: `translateX(${(1 - leftIn) * -30}px)`,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 16px",
            borderRadius: 999,
            background: COLORS.cyanSoft,
            color: COLORS.cyan,
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: 1.5,
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: 999, background: COLORS.cyan }} />
          BETA · LIVE
        </div>
        <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 110, lineHeight: 1.05, color: "#fff", marginTop: 30, letterSpacing: -2 }}>
          Prisijunk ir <br />
          <span style={{ color: "#fff" }}>su stiliumi.</span>
        </div>
        <div style={{ color: COLORS.muted, fontSize: 20, marginTop: 30, lineHeight: 1.5 }}>
          Vienas prisijungimas — visos rolės. Sistema pati nukreipia<br />
          tave į teisingą skydą.
        </div>
      </div>

      {/* Login card */}
      <div
        style={{
          position: "absolute",
          top: 200,
          right: 120,
          width: 520,
          padding: 40,
          borderRadius: 28,
          background: "linear-gradient(180deg, rgba(15,20,36,0.95), rgba(10,13,28,0.95))",
          border: `1px solid ${COLORS.borderStrong}`,
          boxShadow: "0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(103,232,249,0.08)",
          opacity: cardIn,
          transform: `translateY(${(1 - cardIn) * 30}px) scale(${submitPress})`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
          <div>
            <div style={{ fontFamily: "'Instrument Serif', serif", color: "#fff", fontSize: 44 }}>Prisijungti</div>
            <div style={{ color: COLORS.muted, marginTop: 6, fontSize: 15 }}>Sistema pati nukreips pagal rolę.</div>
          </div>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 12,
              background: COLORS.cyanSoft,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: COLORS.cyan,
              fontSize: 22,
            }}
          >
            ✦
          </div>
        </div>

        {/* OAuth */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 26 }}>
          {[
            { name: "Google", c: "#ea4335" },
            { name: "Discord", c: "#5865f2" },
          ].map((p) => (
            <div
              key={p.name}
              style={{
                padding: "14px 0",
                borderRadius: 12,
                background: COLORS.panel2,
                border: `1px solid ${COLORS.border}`,
                textAlign: "center",
                color: "#fff",
                fontWeight: 600,
                fontSize: 15,
              }}
            >
              <span style={{ color: p.c, marginRight: 8 }}>●</span>
              {p.name}
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", color: COLORS.muted, fontSize: 12, letterSpacing: 2, margin: "22px 0 18px" }}>
          — ARBA EL. PAŠTU —
        </div>

        {/* Email */}
        <div style={{ color: COLORS.muted, fontSize: 12, letterSpacing: 1.5, fontWeight: 600 }}>EL. PAŠTAS</div>
        <div
          style={{
            marginTop: 8,
            padding: "16px 18px",
            borderRadius: 12,
            background: "#0b1020",
            border: `1px solid ${emailChars > 0 ? COLORS.cyanDeep : COLORS.border}`,
            color: "#fff",
            fontSize: 16,
            minHeight: 22,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ color: COLORS.muted }}>✉</span>
          {EMAIL.slice(0, emailChars)}
          {emailChars < EMAIL.length && Math.floor(frame / 8) % 2 === 0 && (
            <span style={{ width: 2, height: 20, background: COLORS.cyan, display: "inline-block" }} />
          )}
        </div>

        {/* Pass */}
        <div style={{ color: COLORS.muted, fontSize: 12, letterSpacing: 1.5, fontWeight: 600, marginTop: 18 }}>SLAPTAŽODIS</div>
        <div
          style={{
            marginTop: 8,
            padding: "16px 18px",
            borderRadius: 12,
            background: "#0b1020",
            border: `1px solid ${passChars > 0 ? COLORS.cyanDeep : COLORS.border}`,
            color: "#fff",
            fontSize: 20,
            letterSpacing: 4,
            minHeight: 22,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ color: COLORS.muted, fontSize: 14 }}>🔒</span>
          {PASS.slice(0, passChars)}
        </div>

        {/* Submit */}
        <div
          style={{
            marginTop: 28,
            padding: "16px 0",
            borderRadius: 12,
            textAlign: "center",
            color: "#0a0d1c",
            background: "linear-gradient(135deg, #67e8f9, #22b8d4)",
            fontWeight: 700,
            fontSize: 17,
            boxShadow: `0 12px 30px rgba(103,232,249,${0.3 + flash * 0.5})`,
            transform: `scale(${1 - flash * 0.02})`,
          }}
        >
          Prisijungti →
        </div>

        <div style={{ textAlign: "center", color: COLORS.muted, fontSize: 14, marginTop: 18 }}>
          Neturi paskyros? <span style={{ color: COLORS.cyan, fontWeight: 600 }}>Registruokis</span>
        </div>
      </div>

      <Cursor x={cx} y={cy} clicking={clicking} />
    </AbsoluteFill>
  );
};
