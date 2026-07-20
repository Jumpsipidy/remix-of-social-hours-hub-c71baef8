import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig } from "remotion";
import { AmbientBg, COLORS, interp } from "../ui/primitives";

const ROWS = [
  { d: "2026-07-14", h: 2, o: "Raudonojo Kryžiaus draugija" },
  { d: "2026-07-10", h: 3, o: "Panevėžio senelių namai" },
  { d: "2026-07-06", h: 4, o: "Miesto biblioteka" },
  { d: "2026-07-02", h: 2, o: "Gyvūnų prieglauda Letenėlė" },
  { d: "2026-06-28", h: 3, o: "Aplinkosaugos klubas" },
  { d: "2026-06-24", h: 2, o: "Vaikų dienos centras" },
  { d: "2026-06-20", h: 4, o: "Raudonojo Kryžiaus draugija" },
  { d: "2026-06-16", h: 3, o: "Panevėžio senelių namai" },
];

export const SceneCertificate: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const paperIn = spring({ frame, fps, config: { damping: 18 } });
  const rise = interp(frame, [0, 60], [40, 0]);

  const stampIn = spring({ frame: frame - 180, fps, config: { damping: 8, stiffness: 100 } });
  const stampRot = interp(frame, [180, 220], [-30, -12]);

  const qrPulse = 1 + Math.sin(frame / 6) * 0.03;

  return (
    <AbsoluteFill>
      <AmbientBg />

      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 60,
          transform: `translate(-50%, ${rise}px) scale(${0.9 + paperIn * 0.1})`,
          opacity: paperIn,
          width: 720,
          height: 960,
          background: "linear-gradient(180deg, #fdfcf7, #f5f2ea)",
          borderRadius: 8,
          boxShadow: "0 60px 120px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.1)",
          padding: 48,
          color: "#1a1a1a",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <div style={{ textAlign: "center", color: "#666", fontSize: 11, letterSpacing: 2, fontWeight: 600 }}>
          SOCIALINĖS VALANDOS · socialinesvalandos.lt
        </div>
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 68, color: "#0a0d1c", letterSpacing: -1 }}>
            Sertifikatas
          </div>
          <div style={{ color: "#666", fontSize: 15, fontStyle: "italic", marginTop: 4 }}>
            apie atliktas socialines valandas
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 40, color: "#333", fontSize: 15 }}>
          Šis dokumentas patvirtina, kad
        </div>
        <div style={{ textAlign: "center", fontFamily: "'Instrument Serif', serif", fontSize: 48, color: "#0a0d1c", marginTop: 8 }}>
          Jonas Petraitis
        </div>
        <div style={{ textAlign: "center", color: "#666", fontSize: 15, marginTop: 4 }}>
          11B · Šeduvos gimnazija
        </div>
        <div style={{ textAlign: "center", marginTop: 22, color: "#333", fontSize: 15 }}>
          atliko <b>23 val.</b> socialinės veiklos <br />
          <span style={{ color: "#666" }}>iš reikalaujamų 20 val.</span>
        </div>

        {/* Table */}
        <div style={{ marginTop: 30, borderTop: "2px solid #0a0d1c" }}>
          <div style={{ display: "grid", gridTemplateColumns: "120px 60px 1fr", padding: "10px 4px", color: "#666", fontSize: 11, letterSpacing: 1, fontWeight: 700, borderBottom: "1px solid #ddd" }}>
            <div>REZERVACIJŲ IŠKLOTINĖ</div>
            <div>VAL.</div>
            <div>ORGANIZACIJA</div>
          </div>
          {ROWS.map((r, i) => {
            const rowFrame = 40 + i * 12;
            const rowIn = interp(frame, [rowFrame, rowFrame + 18], [0, 1]);
            return (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "120px 60px 1fr",
                  padding: "9px 4px",
                  fontSize: 13,
                  color: "#0a0d1c",
                  borderBottom: "1px solid #eee",
                  opacity: rowIn,
                  transform: `translateX(${(1 - rowIn) * -15}px)`,
                }}
              >
                <div>{r.d}</div>
                <div>{r.h}</div>
                <div>{r.o}</div>
              </div>
            );
          })}
        </div>

        {/* footer with QR */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 30 }}>
          <div style={{ maxWidth: 400, fontSize: 10, color: "#666", lineHeight: 1.5 }}>
            <div style={{ fontWeight: 700, color: "#0a0d1c", fontSize: 11, letterSpacing: 1 }}>ELEKTRONINIS PARAŠAS · eIDAS Nr. 910/2014</div>
            <div style={{ marginTop: 6 }}>Šis sertifikatas pasirašytas elektroniniu ir verifikuojamas realiu laiku.</div>
            <div style={{ marginTop: 8, fontWeight: 700, color: "#0a0d1c" }}>Verifikacijos kodas: DBG-L4UR-CNBM-ORQ8</div>
          </div>
          <div style={{ transform: `scale(${qrPulse})` }}>
            <div style={{ width: 110, height: 110, background: "#fff", border: "6px solid #0a0d1c", padding: 6 }}>
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  backgroundImage:
                    "radial-gradient(circle, #0a0d1c 30%, transparent 30%)",
                  backgroundSize: "10px 10px",
                }}
              />
            </div>
            <div style={{ textAlign: "center", color: "#666", fontSize: 9, marginTop: 4, letterSpacing: 1 }}>Nuskaityk QR</div>
          </div>
        </div>

        {/* Stamp */}
        {stampIn > 0.01 && (
          <div
            style={{
              position: "absolute",
              right: 60,
              top: 240,
              transform: `rotate(${stampRot}deg) scale(${stampIn})`,
              opacity: 0.85,
            }}
          >
            <div
              style={{
                border: "5px solid #22b8d4",
                color: "#22b8d4",
                borderRadius: 12,
                padding: "12px 22px",
                fontFamily: "Inter, sans-serif",
                fontWeight: 900,
                letterSpacing: 3,
                fontSize: 26,
                textAlign: "center",
                textShadow: "0 0 2px rgba(34,184,212,0.4)",
              }}
            >
              VERIFIKUOTA
              <div style={{ fontSize: 10, letterSpacing: 2, fontWeight: 700, marginTop: 4 }}>
                2026 · SOCIALINĖS VALANDOS
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom brand line */}
      <div
        style={{
          position: "absolute",
          bottom: 40,
          left: 0,
          right: 0,
          textAlign: "center",
          color: COLORS.muted,
          fontSize: 14,
          letterSpacing: 4,
          fontWeight: 600,
          opacity: interp(frame, [240, 280], [0, 1]),
        }}
      >
        SOCIALINĖS VALANDOS · socialinesvalandos.lt
      </div>
    </AbsoluteFill>
  );
};
