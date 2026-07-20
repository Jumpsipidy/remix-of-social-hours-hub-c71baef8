import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { COLORS, Cursor } from "../ui/primitives";

// Reservation modal — recreated from file-24.
export const SceneReserve: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const modalS = spring({ frame: frame - 5, fps, config: { damping: 18, stiffness: 130 } });

  // Animated time end value 05:00 slides from 03:00 → 05:00 (hours 1 → 3)
  const endHour = Math.round(interpolate(frame - 60, [0, 60], [15, 17], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const totalH = endHour - 14;

  const msgFull = "Norėčiau padėti sodinti medžius.";
  const msgChars = Math.max(0, Math.min(msgFull.length, Math.floor((frame - 130) / 2)));
  const msgText = msgFull.slice(0, msgChars);

  // Cursor: to end-time slider → to send button
  type P = { f: number; x: number; y: number };
  const path: P[] = [
    { f: 30,  x: 1750, y: 400 },
    { f: 80,  x: 1140, y: 400 },   // end time input
    { f: 130, x: 940,  y: 720 },   // over message
    { f: 195, x: 1200, y: 900 },   // send button
  ];
  const idx = path.findIndex((p, i) => frame < p.f || i === path.length - 1);
  const from = path[Math.max(0, idx - 1)];
  const to = path[idx];
  const t = interpolate(frame, [from.f, to.f], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const e = 1 - Math.pow(1 - t, 3);
  const cx = from.x + (to.x - from.x) * e;
  const cy = from.y + (to.y - from.y) * e;

  const clicking = frame > 195 && frame < 210;
  const successS = spring({ frame: frame - 205, fps, config: { damping: 12 } });

  return (
    <AbsoluteFill>
      {/* Blurred backdrop of tasks page */}
      <div style={{ position: "absolute", inset: 0,
        background: "linear-gradient(180deg, rgba(10,13,28,0.6), rgba(5,6,13,0.85))" }}/>
      <div style={{ position: "absolute", inset: 0,
        backgroundImage: "radial-gradient(1px 1px at 20% 30%, rgba(103,232,249,0.15) 40%, transparent 60%), radial-gradient(2px 2px at 70% 60%, rgba(232,115,74,0.12) 40%, transparent 60%)",
        backgroundSize: "180px 180px" }}/>

      {/* Modal */}
      <div style={{
        position: "absolute", left: 480, top: 90, width: 960,
        borderRadius: 22, overflow: "hidden",
        background: "linear-gradient(180deg, rgba(15,20,36,0.95), rgba(11,15,26,0.95))",
        border: `1px solid ${COLORS.borderStrong}`,
        boxShadow: "0 60px 120px rgba(0,0,0,0.7)",
        transform: `scale(${modalS})`, opacity: modalS, transformOrigin: "center top",
      }}>
        {/* Header */}
        <div style={{
          padding: "26px 34px",
          background: "linear-gradient(135deg, #103a54, #0f2a44)",
          borderBottom: `1px solid ${COLORS.borderStrong}`,
          position: "relative",
        }}>
          <div style={{ fontSize: 12, letterSpacing: 3, color: COLORS.cyan, fontWeight: 800 }}>◆ PASIŪLYK SAVO REZERVACIJĄ</div>
          <div style={{ marginTop: 8, fontFamily: "'Instrument Serif', serif", fontSize: 40, color: "#fff", letterSpacing: -1 }}>Pasirink organizaciją ir laiką</div>
          <div style={{ marginTop: 4, fontSize: 14, color: "#c9d3e6cc" }}>Tavo užklausa bus išsiųsta organizacijai patvirtinimui.</div>
          <div style={{ position: "absolute", right: 24, top: 24, width: 34, height: 34, borderRadius: 999,
            background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>✕</div>
        </div>

        <div style={{ padding: 34 }}>
          {/* Org selector */}
          <div style={{ fontSize: 12, color: COLORS.muted, letterSpacing: 1.5, fontWeight: 700 }}>ORGANIZACIJA</div>
          <div style={{
            marginTop: 6, height: 54, borderRadius: 12, background: "#0a0d1c",
            border: `1px solid ${COLORS.borderStrong}`, padding: "0 16px",
            display: "flex", alignItems: "center", gap: 10, color: "#fff", fontWeight: 600,
          }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: `${COLORS.green}22`, color: COLORS.green,
              display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>Ž</div>
            Žalioji Vilnia
          </div>

          {/* Time row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 22 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#fff", fontWeight: 700, fontSize: 15 }}>
                <div style={{ width: 12, height: 12, borderRadius: 999, background: COLORS.cyan }}/> Pradžia
              </div>
              <div style={{ marginTop: 8, height: 54, borderRadius: 12, background: "#0a0d1c",
                border: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", padding: "0 16px",
                color: "#fff", fontSize: 18, fontWeight: 700, justifyContent: "space-between" }}>
                14:00 <span style={{ color: COLORS.muted }}>◷</span>
              </div>
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#fff", fontWeight: 700, fontSize: 15 }}>
                <div style={{ width: 12, height: 12, borderRadius: 999, background: COLORS.cyan }}/> Pabaiga
              </div>
              <div style={{ marginTop: 8, height: 54, borderRadius: 12, background: "#0a0d1c",
                border: `1px solid ${frame > 60 && frame < 130 ? COLORS.cyan : COLORS.border}`,
                boxShadow: frame > 60 && frame < 130 ? `0 0 0 3px rgba(103,232,249,0.15)` : "none",
                display: "flex", alignItems: "center", padding: "0 16px",
                color: "#fff", fontSize: 18, fontWeight: 700, justifyContent: "space-between" }}>
                {String(endHour).padStart(2, "0")}:00 <span style={{ color: COLORS.muted }}>◷</span>
              </div>
            </div>
          </div>

          {/* Live calculator */}
          <div style={{
            marginTop: 22, padding: 22, borderRadius: 16,
            background: "rgba(103,232,249,0.06)",
            border: `1px solid ${COLORS.cyan}44`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${COLORS.cyan}22`,
                display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.cyan, fontSize: 22 }}>✦</div>
              <div>
                <div style={{ fontSize: 11, letterSpacing: 2, color: COLORS.cyan, fontWeight: 800 }}>NUMATOMOS VALANDOS</div>
                <div style={{ fontSize: 30, color: "#fff", fontWeight: 800, marginTop: 4 }}>
                  14:00 → {String(endHour).padStart(2, "0")}:00
                  <span style={{ color: COLORS.green, marginLeft: 12 }}>= {totalH} val.</span>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 14, fontSize: 12, color: COLORS.muted, lineHeight: 1.5 }}>
              ⓘ Valandas skaičiuoja tik laiko intervalas (max. 8 val. vienai rezervacijai).
            </div>
          </div>

          {/* Message */}
          <div style={{ marginTop: 20, fontSize: 14, color: "#fff", fontWeight: 700 }}>Žinutė organizacijai <span style={{ color: COLORS.muted, fontWeight: 400 }}>(nebūtina)</span></div>
          <div style={{
            marginTop: 8, minHeight: 90, borderRadius: 12, background: "#0a0d1c",
            border: `1px solid ${frame > 130 && frame < 195 ? COLORS.cyan : COLORS.border}`,
            padding: 14, color: "#fff", fontSize: 15,
            boxShadow: frame > 130 && frame < 195 ? `0 0 0 3px rgba(103,232,249,0.15)` : "none",
          }}>
            {msgText}
            {msgChars < msgFull.length && frame > 130 && frame < 195 && (
              <span style={{ display: "inline-block", width: 2, height: 16, background: COLORS.cyan, marginLeft: 2, opacity: Math.floor(frame / 8) % 2 }}/>
            )}
            {msgChars === 0 && frame < 130 && <span style={{ color: COLORS.muted }}>Trumpai pristatyk save ar pasiūlymą...</span>}
          </div>

          {/* Footer buttons */}
          <div style={{ marginTop: 22, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ color: COLORS.muted, fontSize: 14 }}>Atšaukti</div>
            <div style={{
              padding: "14px 28px", borderRadius: 999,
              background: "linear-gradient(135deg,#67e8f9,#22b8d4)",
              color: "#0a0d1c", fontWeight: 800, fontSize: 15,
              transform: `scale(${clicking ? 0.96 : 1})`,
              boxShadow: `0 15px 40px rgba(103,232,249,0.4)`,
              display: "flex", alignItems: "center", gap: 8,
            }}>✓ Siųsti pasiūlymą</div>
          </div>
        </div>
      </div>

      {/* Success confirmation on top */}
      {frame > 210 && (
        <div style={{
          position: "absolute", left: 720, top: 400, width: 480,
          transform: `scale(${successS})`,
          padding: 26, borderRadius: 20,
          background: "linear-gradient(135deg, rgba(52,211,153,0.20), rgba(52,211,153,0.08))",
          border: `1px solid ${COLORS.green}88`,
          boxShadow: `0 30px 80px ${COLORS.green}55`,
          textAlign: "center",
        }}>
          <div style={{ width: 68, height: 68, borderRadius: 999, background: COLORS.green,
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto",
            fontSize: 36, color: "#0a0d1c", fontWeight: 900 }}>✓</div>
          <div style={{ marginTop: 14, fontSize: 24, color: "#fff", fontWeight: 800 }}>Pasiūlymas išsiųstas!</div>
          <div style={{ marginTop: 6, fontSize: 14, color: COLORS.muted }}>Organizacija netrukus patvirtins tavo rezervaciją.</div>
        </div>
      )}

      {clicking && (
        <div style={{
          position: "absolute", left: cx - 40, top: cy - 40, width: 80, height: 80, borderRadius: 999,
          border: `2px solid ${COLORS.cyan}`, opacity: interpolate(frame, [195, 210], [1, 0]),
          transform: `scale(${interpolate(frame, [195, 210], [0.5, 1.6])})`,
        }}/>
      )}

      {/* Kinetic label */}
      <div style={{
        position: "absolute", top: 20, left: 60,
        fontFamily: "'Instrument Serif', serif", fontSize: 60, color: "#fff",
        opacity: interpolate(frame, [10, 40], [0, 1], { extrapolateRight: "clamp" }),
      }}>
        <span style={{fontStyle:"italic", color: COLORS.orange}}>Rezervuok.</span>
      </div>

      <Cursor x={cx} y={cy} clicking={clicking} />
    </AbsoluteFill>
  );
};
