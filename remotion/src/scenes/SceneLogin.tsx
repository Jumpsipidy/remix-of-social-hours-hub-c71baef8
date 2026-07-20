import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { COLORS, Cursor, Heart } from "../ui/primitives";

// Recreated login page — matches file-21: big serif left, glass card right.
export const SceneLogin: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({ frame: frame - 5, fps, config: { damping: 20 } });
  const line1W = interpolate(frame, [15, 45], [0, 100], { extrapolateRight: "clamp" });
  const line2W = interpolate(frame, [40, 70], [0, 100], { extrapolateRight: "clamp" });

  // Typing email
  const emailFull = "lukas@mokykla.lt";
  const emailChars = Math.max(0, Math.min(emailFull.length, Math.floor((frame - 60) / 3)));
  const emailText = emailFull.slice(0, emailChars);

  // Password dots
  const dots = Math.max(0, Math.min(8, Math.floor((frame - 130) / 4)));

  // Cursor path: outside → email input → password input → button
  type P = { f: number; x: number; y: number };
  const path: P[] = [
    { f: 20,  x: 1900, y: 400 },
    { f: 55,  x: 1300, y: 500 }, // email
    { f: 120, x: 1300, y: 620 }, // password
    { f: 175, x: 1300, y: 780 }, // button
  ];
  const seg = path.findIndex((p, i) => frame < p.f || i === path.length - 1);
  const from = path[Math.max(0, seg - 1)];
  const to = path[seg];
  const t = interpolate(frame, [from.f, Math.max(from.f + 1, to.f)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ease = 1 - Math.pow(1 - t, 3);
  const cursorX = from.x + (to.x - from.x) * ease;
  const cursorY = from.y + (to.y - from.y) * ease;

  const clickBtn = frame > 175 && frame < 190;
  const btnGlow = spring({ frame: frame - 175, fps, config: { damping: 12 } });
  const successOp = interpolate(frame, [185, 205], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ opacity: enter }}>
      {/* subtle grid + orbs */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(60% 50% at 20% 30%, rgba(103,232,249,0.10), transparent 60%), radial-gradient(60% 50% at 80% 80%, rgba(139,92,246,0.14), transparent 60%)",
      }}/>

      {/* Logo top-left */}
      <div style={{ position: "absolute", left: 130, top: 90, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 46, height: 46, borderRadius: 999, background: "linear-gradient(135deg,#67e8f9,#22b8d4)",
          display: "flex", alignItems: "center", justifyContent: "center" }}><Heart size={22}/></div>
        <div style={{ fontWeight: 800, fontSize: 26, letterSpacing: -0.3 }}>
          <span style={{ color: "#fff" }}>Socialinės </span><span style={{ color: COLORS.cyan }}>Valandos</span>
        </div>
      </div>

      {/* Left: hero copy */}
      <div style={{ position: "absolute", left: 130, top: 220, width: 720 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 999,
          background: "rgba(103,232,249,0.10)", border: `1px solid ${COLORS.cyan}55`,
          color: COLORS.cyan, fontWeight: 700, fontSize: 13, letterSpacing: 1 }}>
          <div style={{ width: 8, height: 8, borderRadius: 999, background: COLORS.cyan }}/> BETA · LIVE
        </div>
        <div style={{
          marginTop: 32, fontFamily: "'Instrument Serif', serif", fontSize: 110, lineHeight: 1.05,
          color: "#fff", letterSpacing: -2, clipPath: `inset(0 ${100 - line1W}% 0 0)`,
        }}>Prisijunk ir</div>
        <div style={{
          fontFamily: "'Instrument Serif', serif", fontSize: 110, lineHeight: 1.05,
          color: "#fff", letterSpacing: -2, marginTop: 4,
          clipPath: `inset(0 ${100 - line2W}% 0 0)`,
        }}>su <span style={{fontStyle:"italic", color: COLORS.cyan}}>stiliumi.</span></div>
        <div style={{ marginTop: 36, fontSize: 20, color: COLORS.muted, lineHeight: 1.5, maxWidth: 560,
          opacity: interpolate(frame, [75, 100], [0, 1], { extrapolateRight: "clamp" }) }}>
          Vienas prisijungimas — visos rolės. Sistema pati nukreipia tave į teisingą skydą.
        </div>
      </div>

      {/* Right: login card */}
      <div style={{
        position: "absolute", right: 130, top: 240, width: 520,
        borderRadius: 26, padding: 40,
        background: "linear-gradient(180deg, rgba(15,20,36,0.85), rgba(11,15,26,0.9))",
        border: `1px solid ${COLORS.borderStrong}`,
        boxShadow: "0 40px 100px rgba(0,0,0,0.6), 0 0 60px rgba(103,232,249,0.08)",
        backdropFilter: "blur(10px)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 44, color: "#fff", letterSpacing: -1 }}>Prisijungti</div>
            <div style={{ fontSize: 14, color: COLORS.muted, marginTop: 4 }}>Sistema pati nukreips pagal rolę.</div>
          </div>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(103,232,249,0.14)",
            display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.cyan, fontSize: 20 }}>✦</div>
        </div>

        {/* OAuth buttons */}
        <div style={{ display: "flex", gap: 12, marginTop: 22 }}>
          {["Google", "Discord"].map((p, i) => (
            <div key={p} style={{
              flex: 1, height: 52, borderRadius: 14,
              background: "#0a0d1c", border: `1px solid ${COLORS.borderStrong}`,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              color: "#fff", fontWeight: 600, fontSize: 15,
            }}>
              <div style={{ width: 18, height: 18, borderRadius: 4,
                background: i === 0 ? "linear-gradient(135deg,#ea4335,#fbbc05,#34a853,#4285f4)" : "#5865f2" }}/>
              {p}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "22px 0 18px" }}>
          <div style={{ flex: 1, height: 1, background: COLORS.border }}/>
          <div style={{ fontSize: 11, color: COLORS.muted, letterSpacing: 2 }}>ARBA EL. PAŠTU</div>
          <div style={{ flex: 1, height: 1, background: COLORS.border }}/>
        </div>

        {/* Email */}
        <div style={{ fontSize: 12, color: COLORS.muted, letterSpacing: 1.5, fontWeight: 700 }}>EL. PAŠTAS</div>
        <div style={{
          marginTop: 6, height: 52, borderRadius: 12, background: "#0a0d1c",
          border: `1px solid ${frame > 55 && frame < 120 ? COLORS.cyan : COLORS.border}`,
          display: "flex", alignItems: "center", padding: "0 16px", gap: 10, fontSize: 15,
          transition: "none",
          boxShadow: frame > 55 && frame < 120 ? `0 0 0 3px rgba(103,232,249,0.15)` : "none",
        }}>
          <span style={{ color: COLORS.muted }}>✉</span>
          <span style={{ color: "#fff" }}>{emailText}</span>
          {emailChars < emailFull.length && frame > 55 && frame < 120 && (
            <span style={{ width: 2, height: 18, background: COLORS.cyan, opacity: Math.floor(frame / 8) % 2 }}/>
          )}
        </div>

        {/* Password */}
        <div style={{ fontSize: 12, color: COLORS.muted, letterSpacing: 1.5, fontWeight: 700, marginTop: 18 }}>SLAPTAŽODIS</div>
        <div style={{
          marginTop: 6, height: 52, borderRadius: 12, background: "#0a0d1c",
          border: `1px solid ${frame > 120 && frame < 175 ? COLORS.cyan : COLORS.border}`,
          display: "flex", alignItems: "center", padding: "0 16px", gap: 10, fontSize: 22, letterSpacing: 6,
          boxShadow: frame > 120 && frame < 175 ? `0 0 0 3px rgba(103,232,249,0.15)` : "none",
        }}>
          <span style={{ color: COLORS.muted, fontSize: 14 }}>🔒</span>
          <span style={{ color: "#fff" }}>{"•".repeat(dots)}</span>
        </div>

        {/* Button */}
        <div style={{
          marginTop: 26, height: 58, borderRadius: 14,
          background: "linear-gradient(135deg,#67e8f9,#22b8d4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#0a0d1c", fontWeight: 800, fontSize: 17,
          transform: `scale(${clickBtn ? 0.97 : 1})`,
          boxShadow: `0 20px 40px rgba(103,232,249,${0.25 + btnGlow * 0.3})`,
        }}>
          Prisijungti  →
        </div>

        <div style={{ marginTop: 20, textAlign: "center", fontSize: 14, color: COLORS.muted }}>
          Neturi paskyros? <span style={{ color: COLORS.cyan, fontWeight: 700 }}>Registruokis</span>
        </div>
      </div>

      {/* Click ripple on button */}
      {clickBtn && (
        <div style={{
          position: "absolute", left: cursorX - 40, top: cursorY - 40, width: 80, height: 80,
          borderRadius: 999, border: `2px solid ${COLORS.cyan}`, opacity: interpolate(frame, [175, 190], [1, 0]),
          transform: `scale(${interpolate(frame, [175, 190], [0.5, 1.6])})`,
        }}/>
      )}

      {/* Success toast */}
      <div style={{
        position: "absolute", top: 60, right: 60, opacity: successOp,
        padding: "14px 20px", borderRadius: 14,
        background: "rgba(34,211,153,0.15)", border: "1px solid rgba(52,211,153,0.5)",
        color: COLORS.green, fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", gap: 10,
      }}>✓ Prisijungimas sėkmingas</div>

      <Cursor x={cursorX} y={cursorY} clicking={clickBtn} />
    </AbsoluteFill>
  );
};
