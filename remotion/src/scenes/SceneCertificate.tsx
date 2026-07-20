import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { COLORS, Cursor } from "../ui/primitives";

// Certificate — recreated from file-25: clean white A4 with reservation table + QR.
const ROWS = [
  { date: "2026-07-14", hrs: 2, org: "Raudonojo Kryžiaus draugija" },
  { date: "2026-07-10", hrs: 3, org: "Panevėžio senelių namai" },
  { date: "2026-07-06", hrs: 4, org: "Miesto biblioteka" },
  { date: "2026-07-02", hrs: 2, org: "Gyvūnų prieglauda „Letenelė“" },
  { date: "2026-06-28", hrs: 3, org: "Aplinkosaugos klubas" },
  { date: "2026-06-24", hrs: 4, org: "Vaikų dienos centras" },
];

export const SceneCertificate: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Cursor click "PDF sertifikatas" (mocked button top-right)
  const clickBtn = frame > 15 && frame < 30;
  const paperS = spring({ frame: frame - 25, fps, config: { damping: 18, stiffness: 100 } });

  const line = (d: number) => spring({ frame: frame - d, fps, config: { damping: 20 } });
  const qrIn = spring({ frame: frame - 200, fps, config: { damping: 15 } });
  const stampS = spring({ frame: frame - 240, fps, config: { damping: 8, stiffness: 130, mass: 1.2 } });

  const qrPattern = [
    "1111111 0 1 0 1111111",
    "1000001 1 0 1 1000001",
    "1011101 0 1 1 1011101",
    "1011101 1 1 0 1011101",
    "1011101 0 0 1 1011101",
    "1000001 1 0 1 1000001",
    "1111111 1 0 1 1111111",
  ].map(r => r.replace(/ /g, ""));

  return (
    <AbsoluteFill>
      {/* Fake dashboard button being clicked */}
      <div style={{
        position: "absolute", top: 60, right: 140,
        padding: "12px 22px", borderRadius: 999,
        background: clickBtn ? "linear-gradient(135deg,#67e8f9,#22b8d4)" : "rgba(15,20,36,0.6)",
        border: `1px solid ${COLORS.borderStrong}`,
        color: clickBtn ? "#0a0d1c" : "#fff", fontWeight: 800, fontSize: 15,
        opacity: interpolate(frame, [0, 40], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
      }}>◆ Generuoti PDF sertifikatą</div>

      <Cursor x={interpolate(frame, [0, 20], [1700, 1590], { extrapolateRight: "clamp" })} y={interpolate(frame, [0, 20], [400, 78], { extrapolateRight: "clamp" })} clicking={clickBtn} />

      {/* Paper A4 - portrait */}
      <div style={{
        position: "absolute",
        left: 660, top: 40, width: 600, height: 990,
        background: "#ffffff",
        borderRadius: 6,
        boxShadow: "0 60px 140px rgba(0,0,0,0.7)",
        transform: `scale(${paperS}) translateY(${(1 - paperS) * 30}px)`,
        transformOrigin: "center top",
        color: "#111",
        padding: 40,
        fontFamily: "Inter, sans-serif",
      }}>
        <div style={{ opacity: line(35), fontSize: 10, letterSpacing: 2, color: "#777", textAlign: "center" }}>
          SOCIALINĖS VALANDOS  ·  socialinesvalandos.lt
        </div>

        <div style={{
          opacity: line(45), textAlign: "center", marginTop: 20,
          fontFamily: "'Instrument Serif', serif", fontSize: 56, color: "#111", letterSpacing: -1,
          transform: `translateY(${(1 - line(45)) * 10}px)`,
        }}>Sertifikatas</div>
        <div style={{ opacity: line(55), textAlign: "center", fontSize: 12, color: "#666", fontStyle: "italic", marginTop: 2 }}>
          apie atliktas socialines valandas
        </div>

        <div style={{ opacity: line(70), textAlign: "center", marginTop: 30, fontSize: 11, color: "#666" }}>
          Šis dokumentas patvirtina, kad
        </div>
        <div style={{
          opacity: line(80), textAlign: "center", marginTop: 8,
          fontFamily: "'Instrument Serif', serif", fontSize: 34, fontWeight: 700, color: "#111",
        }}>Jonas Petraitis</div>
        <div style={{ opacity: line(85), textAlign: "center", fontSize: 12, color: "#666", marginTop: 4 }}>
          11B  ·  Šeduvos gimnazija
        </div>

        <div style={{ opacity: line(100), textAlign: "center", marginTop: 22, fontSize: 13, color: "#111" }}>
          atliko <span style={{ fontWeight: 800, color: "#c44a20" }}>23 val.</span> socialinės veiklos
        </div>
        <div style={{ opacity: line(105), textAlign: "center", fontSize: 11, color: "#666" }}>
          iš reikalaujamų 20 val.
        </div>

        {/* Table */}
        <div style={{ marginTop: 24, opacity: line(115) }}>
          <div style={{ fontSize: 10, letterSpacing: 1.5, color: "#c44a20", fontWeight: 800, marginBottom: 6 }}>REZERVACIJŲ IŠKLOTINĖ</div>
          <div style={{ display: "grid", gridTemplateColumns: "90px 40px 1fr", gap: 4,
            padding: "8px 10px", borderBottom: "1px solid #ccc", fontSize: 10, color: "#666", fontWeight: 700 }}>
            <div>Data</div><div>Val.</div><div>Organizacija</div>
          </div>
          {ROWS.map((r, i) => {
            const rs = spring({ frame: frame - 125 - i * 8, fps, config: { damping: 20 } });
            return (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "90px 40px 1fr", gap: 4,
                padding: "6px 10px", borderBottom: "1px solid #eee",
                fontSize: 11, color: "#333",
                opacity: rs, transform: `translateY(${(1 - rs) * 6}px)`,
              }}>
                <div>{r.date}</div><div>{r.hrs}</div><div>{r.org}</div>
              </div>
            );
          })}
        </div>

        {/* Footer signature block */}
        <div style={{
          position: "absolute", left: 40, right: 40, bottom: 40,
          opacity: line(210), borderTop: "1px solid #ddd", paddingTop: 14,
          display: "flex", justifyContent: "space-between", alignItems: "flex-end",
        }}>
          <div style={{ maxWidth: 320 }}>
            <div style={{ fontSize: 10, color: "#c44a20", fontWeight: 800, letterSpacing: 1.5 }}>ELEKTRONINIS PARAŠAS  ·  eIDAS Nr. 910/2014</div>
            <div style={{ marginTop: 6, fontSize: 9, color: "#666", lineHeight: 1.5 }}>
              Šis dokumentas pasirašytas elektroniniu ir verifikuojamas realiu laiku.
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: "#111", fontWeight: 700 }}>
              Verifikacijos kodas: <span style={{ fontFamily: "monospace", color: "#c44a20" }}>DBG-L4UR-CN8M-ORQ8</span>
            </div>
            <div style={{ marginTop: 6, fontSize: 9, color: "#777" }}>
              https://socialinesvalandos.lt/verify/DBG-L4UR-CN8M-ORQ8
            </div>
          </div>
          <div style={{ opacity: qrIn, transform: `scale(${qrIn})` }}>
            <div style={{ width: 84, height: 84, padding: 4, background: "#fff", border: "1px solid #111" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(13, 1fr)", width: "100%", height: "100%" }}>
                {qrPattern.flatMap((row, r) => row.split("").map((c, i) => (
                  <div key={`${r}-${i}`} style={{ background: c === "1" ? "#000" : "#fff" }}/>
                )))}
              </div>
            </div>
            <div style={{ fontSize: 8, color: "#666", marginTop: 4, textAlign: "center" }}>Nuskaityk QR</div>
          </div>
        </div>

        {/* VERIFIKUOTA stamp */}
        <div style={{
          position: "absolute", left: 200, top: 500,
          transform: `scale(${stampS}) rotate(${interpolate(stampS, [0, 1], [-30, -14])}deg)`,
          transformOrigin: "center",
          border: "4px solid #34d399", borderRadius: 6,
          padding: "6px 16px",
          fontSize: 22, fontWeight: 900, color: "#34d399",
          letterSpacing: 2, background: "rgba(52,211,153,0.06)",
          opacity: 0.85,
        }}>✓ VERIFIKUOTA</div>
      </div>

      {/* kinetic label */}
      <div style={{
        position: "absolute", top: 160, left: 100, width: 500,
        fontFamily: "'Instrument Serif', serif",
        opacity: interpolate(frame, [50, 90], [0, 1], { extrapolateRight: "clamp" }),
      }}>
        <div style={{ fontSize: 13, color: COLORS.orange, letterSpacing: 3, fontWeight: 800, fontFamily: "Inter, sans-serif" }}>◆ TIKSLAS PASIEKTAS</div>
        <div style={{ marginTop: 14, fontSize: 84, color: "#fff", letterSpacing: -2, lineHeight: 1 }}>
          Gauk<br/>
          <span style={{ fontStyle: "italic", color: COLORS.cyan }}>sertifikatą.</span>
        </div>
        <div style={{ marginTop: 22, fontSize: 17, color: COLORS.muted, lineHeight: 1.5, fontFamily: "Inter, sans-serif", maxWidth: 400 }}>
          Automatiškai generuojamas PDF su QR verifikacija ir elektroniniu parašu.
        </div>
      </div>
    </AbsoluteFill>
  );
};
