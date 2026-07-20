import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

export const SceneIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const badgeIn = spring({ frame, fps, config: { damping: 20 } });
  const titleIn = spring({ frame: frame - 10, fps, config: { damping: 22 } });
  const subIn = spring({ frame: frame - 28, fps, config: { damping: 22 } });
  const exitScale = interpolate(frame, [120, 150], [1, 0.9], { extrapolateRight: "clamp" });
  const exitOpacity = interpolate(frame, [120, 150], [1, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        opacity: exitOpacity,
        transform: `scale(${exitScale})`,
      }}
    >
      <div
        style={{
          transform: `translateY(${(1 - badgeIn) * 20}px)`,
          opacity: badgeIn,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 22px",
          borderRadius: 999,
          background: "rgba(96,165,250,0.12)",
          border: "1px solid rgba(96,165,250,0.35)",
          fontSize: 14,
          letterSpacing: 3,
          color: "#7dd3fc",
          fontWeight: 500,
          marginBottom: 34,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            background: "#22d3ee",
            boxShadow: "0 0 12px #22d3ee",
          }}
        />
        LIETUVOS MOKSLEIVIAMS · NEMOKAMAI
      </div>

      <div
        style={{
          fontFamily: "Instrument Serif, serif",
          fontSize: 172,
          lineHeight: 1,
          textAlign: "center",
          transform: `translateY(${(1 - titleIn) * 30}px)`,
          opacity: titleIn,
        }}
      >
        <span style={{ color: "#f4f7ff" }}>Socialinės </span>
        <span
          style={{
            background: "linear-gradient(120deg, #60a5fa, #22d3ee 55%, #a78bfa)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontStyle: "italic",
          }}
        >
          Valandos
        </span>
      </div>

      <div
        style={{
          marginTop: 30,
          fontSize: 28,
          color: "#9aa7c2",
          transform: `translateY(${(1 - subIn) * 20}px)`,
          opacity: subIn,
          letterSpacing: 0.3,
        }}
      >
        Savanoriauk. Rink valandas. Gauk sertifikatą.
      </div>
    </AbsoluteFill>
  );
};
