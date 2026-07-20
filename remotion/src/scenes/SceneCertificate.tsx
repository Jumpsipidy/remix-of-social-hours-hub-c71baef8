import { AbsoluteFill, Img, staticFile, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

export const SceneCertificate: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 22 } });
  const buttonHighlight = interpolate(frame, [20, 40], [0, 1], { extrapolateRight: "clamp" });
  const clickAt = 70;
  const downloadStart = 80;
  const certAppear = 130;

  const buttonPulse = frame >= clickAt && frame <= clickAt + 20 ? 1 - (frame - clickAt) / 20 : 0;

  const downloadT = Math.max(0, Math.min(1, (frame - downloadStart) / 40));
  const certScale = spring({ frame: frame - certAppear, fps, config: { damping: 15 } });
  const certRotate = interpolate(certScale, [0, 1], [-8, 0]);

  return (
    <AbsoluteFill style={{ padding: "80px 100px" }}>
      <div style={{ opacity: enter, transform: `translateY(${(1 - enter) * 30}px)` }}>
        <div style={{ fontSize: 13, letterSpacing: 4, color: "#60a5fa", fontWeight: 600 }}>
          04 · TIKSLAS PASIEKTAS
        </div>
        <div
          style={{
            fontFamily: "Instrument Serif, serif",
            fontSize: 96,
            lineHeight: 1,
            color: "#f4f7ff",
            marginTop: 12,
          }}
        >
          Gauk savo{" "}
          <span
            style={{
              background: "linear-gradient(120deg, #60a5fa, #22d3ee, #a78bfa)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontStyle: "italic",
            }}
          >
            sertifikatą
          </span>
        </div>
        <div style={{ fontSize: 20, color: "#9aa7c2", marginTop: 14, maxWidth: 800 }}>
          Pasirašytas eIDAS · Nr. 910/2014. Su QR verifikacijos kodu — mokykla patikrina per 3 sek.
        </div>
      </div>

      {/* Certificate button mockup */}
      <div
        style={{
          marginTop: 44,
          display: "flex",
          gap: 40,
          alignItems: "center",
          opacity: interpolate(frame, [20, 45], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        <div style={{ position: "relative" }}>
          <div
            style={{
              padding: "22px 36px",
              borderRadius: 18,
              background: "linear-gradient(90deg, #60a5fa, #22d3ee)",
              color: "#0a0d1c",
              fontWeight: 700,
              fontSize: 22,
              display: "flex",
              alignItems: "center",
              gap: 14,
              boxShadow: `0 0 ${20 + buttonHighlight * 40}px rgba(96,165,250,${
                0.3 + buttonHighlight * 0.4
              })`,
              transform: `scale(${1 + buttonPulse * 0.06})`,
            }}
          >
            ↓ PDF sertifikatas (20/20 val.)
          </div>
          {buttonPulse > 0 && (
            <div
              style={{
                position: "absolute",
                inset: -10,
                borderRadius: 26,
                border: "3px solid rgba(96,165,250,0.7)",
                transform: `scale(${1 + (1 - buttonPulse) * 0.5})`,
                opacity: buttonPulse,
              }}
            />
          )}
        </div>

        {frame >= downloadStart && frame < certAppear + 20 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "16px 22px",
              borderRadius: 14,
              background: "rgba(14,20,38,0.85)",
              border: "1px solid rgba(96,165,250,0.4)",
              minWidth: 320,
            }}
          >
            <div style={{ fontSize: 22 }}>↓</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: "#f4f7ff", fontWeight: 600 }}>
                sertifikatas-SV-L4UR-CN8M-ORQ8.pdf
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: 4,
                  background: "rgba(148,163,184,0.15)",
                  marginTop: 8,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${downloadT * 100}%`,
                    height: "100%",
                    background: "linear-gradient(90deg, #60a5fa, #22d3ee)",
                  }}
                />
              </div>
            </div>
            <div style={{ fontSize: 12, color: "#7dd3fc", fontWeight: 600 }}>
              {Math.round(downloadT * 100)}%
            </div>
          </div>
        )}
      </div>

      {/* Certificate preview */}
      {frame >= certAppear && (
        <div
          style={{
            position: "absolute",
            right: 140,
            top: 240,
            transform: `perspective(2000px) rotateY(${certRotate}deg) scale(${
              0.4 + certScale * 0.6
            })`,
            transformOrigin: "top right",
            opacity: certScale,
            filter: "drop-shadow(0 40px 80px rgba(0,0,0,0.6)) drop-shadow(0 0 40px rgba(96,165,250,0.3))",
          }}
        >
          <Img
            src={staticFile("screens/certificate.png")}
            style={{
              width: 520,
              borderRadius: 8,
              display: "block",
              border: "1px solid rgba(148,163,184,0.2)",
            }}
          />
          {/* Verified stamp */}
          {frame >= certAppear + 40 && (
            <div
              style={{
                position: "absolute",
                bottom: 40,
                left: 40,
                padding: "10px 18px",
                borderRadius: 999,
                background: "linear-gradient(90deg, #22c55e, #4ade80)",
                color: "#0a0d1c",
                fontWeight: 700,
                fontSize: 14,
                transform: `scale(${spring({ frame: frame - certAppear - 40, fps, config: { damping: 12 } })})`,
                boxShadow: "0 10px 30px rgba(34,197,94,0.4)",
              }}
            >
              ✓ VERIFIKUOTA
            </div>
          )}
        </div>
      )}

      {/* Closing text */}
      <div
        style={{
          position: "absolute",
          bottom: 90,
          left: 100,
          right: 100,
          textAlign: "center",
          opacity: interpolate(frame, [280, 320, 430, 450], [0, 1, 1, 0]),
        }}
      >
        <div
          style={{
            fontFamily: "Instrument Serif, serif",
            fontSize: 68,
            color: "#f4f7ff",
            lineHeight: 1.1,
          }}
        >
          Kiekviena <span style={{ fontStyle: "italic", color: "#7dd3fc" }}>valanda</span> — žingsnis pokyčio link.
        </div>
        <div style={{ fontSize: 18, color: "#8b96ad", letterSpacing: 4, marginTop: 20 }}>
          SOCIALINESVALANDOS.LT
        </div>
      </div>
    </AbsoluteFill>
  );
};
