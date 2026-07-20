import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { COLORS } from "../ui/primitives";

export const SceneCertificate: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleOp = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  const paperS = spring({ frame: frame - 20, fps, config: { damping: 16 } });
  const line = (d: number) => spring({ frame: frame - d, fps, config: { damping: 20 } });

  const qrIn = spring({ frame: frame - 170, fps, config: { damping: 15 } });
  const stampS = spring({ frame: frame - 210, fps, config: { damping: 8, stiffness: 130, mass: 1.2 } });
  const stampRot = interpolate(stampS, [0, 1], [-30, -12]);

  // QR grid
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
      <div style={{ position: "absolute", top: 60, left: 0, right: 0, textAlign: "center", opacity: titleOp }}>
        <div style={{ fontSize: 14, color: COLORS.orange, letterSpacing: 4, fontWeight: 700 }}>◆ GAUK SERTIFIKATĄ</div>
        <div style={{ fontSize: 66, fontFamily: "'Instrument Serif', serif", color: "#fff", marginTop: 8, letterSpacing: -1.5 }}>
          Oficialus <span style={{ fontStyle: "italic", color: COLORS.cyan }}>patvirtinimas</span>
        </div>
      </div>

      {/* Certificate paper */}
      <div style={{
        position: "absolute", left: 460, top: 260, width: 1000, height: 720,
        transform: `scale(${paperS}) rotate(${-2 + paperS * 2}deg)`,
        transformOrigin: "center",
        background: "linear-gradient(180deg, #faf6ee 0%, #f0e9d9 100%)",
        borderRadius: 12,
        boxShadow: "0 60px 120px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.1)",
        padding: 60,
        color: "#1a1a1a",
      }}>
        {/* ornate border */}
        <div style={{ position: "absolute", inset: 24, border: "2px solid #b8925a", borderRadius: 6 }}/>
        <div style={{ position: "absolute", inset: 32, border: "1px solid #b8925a55", borderRadius: 4 }}/>

        <div style={{ opacity: line(30), textAlign: "center", marginTop: 20 }}>
          <div style={{ fontSize: 13, letterSpacing: 6, color: "#8b6f3a", fontWeight: 700 }}>◆ SERTIFIKATAS ◆</div>
        </div>

        <div style={{
          textAlign: "center", marginTop: 30, fontSize: 56, fontFamily: "'Instrument Serif', serif",
          color: "#1a1a1a", opacity: line(50),
          transform: `translateY(${(1 - line(50)) * 20}px)`,
        }}>
          Savanorystės valandų
        </div>
        <div style={{
          textAlign: "center", fontSize: 56, fontStyle: "italic", fontFamily: "'Instrument Serif', serif",
          color: "#c44a20", opacity: line(60),
        }}>
          patvirtinimas
        </div>

        <div style={{ marginTop: 40, textAlign: "center", opacity: line(80) }}>
          <div style={{ fontSize: 13, letterSpacing: 3, color: "#6b6b6b" }}>ŠIS DOKUMENTAS PATVIRTINA, KAD</div>
          <div style={{ fontSize: 42, fontFamily: "'Instrument Serif', serif", marginTop: 10 }}>Jonas Petraitis</div>
        </div>

        <div style={{ marginTop: 30, textAlign: "center", opacity: line(110) }}>
          <div style={{ fontSize: 13, letterSpacing: 3, color: "#6b6b6b" }}>ATLIKO SAVANORIŠKĄ VEIKLĄ</div>
          <div style={{ fontSize: 72, fontWeight: 800, color: "#c44a20", marginTop: 10, letterSpacing: -2 }}>
            15 valandų
          </div>
        </div>

        <div style={{
          position: "absolute", left: 60, bottom: 60, opacity: line(140),
        }}>
          <div style={{ borderTop: "1px solid #333", width: 220, paddingTop: 8, fontSize: 12, color: "#555" }}>Direktoriaus parašas</div>
        </div>
        <div style={{
          position: "absolute", right: 60, bottom: 60, opacity: line(150),
        }}>
          <div style={{ borderTop: "1px solid #333", width: 220, paddingTop: 8, fontSize: 12, color: "#555", textAlign: "right" }}>2026-03-15</div>
        </div>

        {/* QR code */}
        <div style={{
          position: "absolute", right: 80, top: 80,
          width: 96, height: 96, padding: 6, background: "#fff",
          border: "1px solid #333", opacity: qrIn, transform: `scale(${qrIn})`,
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(13, 1fr)", gap: 0, width: "100%", height: "100%" }}>
            {qrPattern.flatMap((row, r) => row.split("").map((c, i) => (
              <div key={`${r}-${i}`} style={{ background: c === "1" ? "#000" : "#fff" }}/>
            )))}
          </div>
        </div>

        {/* VERIFIKUOTA stamp */}
        <div style={{
          position: "absolute", left: 640, bottom: 120,
          transform: `scale(${stampS}) rotate(${stampRot}deg)`,
          transformOrigin: "center",
          border: "5px solid #c44a20",
          borderRadius: 8,
          padding: "10px 22px",
          fontSize: 32, fontWeight: 800, color: "#c44a20",
          letterSpacing: 2, fontFamily: "Inter, sans-serif",
          background: "rgba(196,74,32,0.06)",
          opacity: 0.9,
        }}>
          ✓ VERIFIKUOTA
        </div>
      </div>
    </AbsoluteFill>
  );
};
