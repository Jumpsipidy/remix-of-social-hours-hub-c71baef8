import { AbsoluteFill, Sequence, useCurrentFrame, interpolate } from "remotion";
import { loadFont as loadInstrumentSerif } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { SceneIntro } from "./scenes/SceneIntro";
import { SceneLogin } from "./scenes/SceneLogin";
import { SceneTasks } from "./scenes/SceneTasks";
import { SceneDashboard } from "./scenes/SceneDashboard";
import { SceneCertificate } from "./scenes/SceneCertificate";

loadInstrumentSerif();
loadInter({ weights: ["400", "500", "600", "700"] });

const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const x1 = 30 + Math.sin(t * 0.3) * 15;
  const y1 = 30 + Math.cos(t * 0.25) * 12;
  const x2 = 70 + Math.cos(t * 0.2) * 10;
  const y2 = 70 + Math.sin(t * 0.35) * 15;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(60% 60% at ${x1}% ${y1}%, rgba(96,165,250,0.28), transparent 60%),
                     radial-gradient(55% 55% at ${x2}% ${y2}%, rgba(139,92,246,0.22), transparent 60%),
                     radial-gradient(80% 80% at 50% 120%, rgba(20,184,166,0.15), transparent 70%),
                     linear-gradient(180deg, #05060d 0%, #0a0d1c 100%)`,
      }}
    />
  );
};

const GridOverlay: React.FC = () => (
  <AbsoluteFill
    style={{
      backgroundImage:
        "linear-gradient(rgba(148,163,184,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.05) 1px, transparent 1px)",
      backgroundSize: "80px 80px",
      maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
    }}
  />
);

const Vignette: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30, 1770, 1800], [0, 1, 1, 0]);
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        opacity,
        background:
          "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)",
      }}
    />
  );
};

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ fontFamily: "Inter, sans-serif", color: "#e6edf7" }}>
      <Backdrop />
      <GridOverlay />
      <Sequence from={0} durationInFrames={150}><SceneIntro /></Sequence>
      <Sequence from={150} durationInFrames={300}><SceneLogin /></Sequence>
      <Sequence from={450} durationInFrames={450}><SceneTasks /></Sequence>
      <Sequence from={900} durationInFrames={450}><SceneDashboard /></Sequence>
      <Sequence from={1350} durationInFrames={450}><SceneCertificate /></Sequence>
      <Vignette />
    </AbsoluteFill>
  );
};
