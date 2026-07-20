import { AbsoluteFill, Sequence, useCurrentFrame, interpolate } from "remotion";
import { loadFont as loadInstrumentSerif } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { SceneIntro } from "./scenes/SceneIntro";
import { SceneHome } from "./scenes/SceneHome";
import { SceneLogin } from "./scenes/SceneLogin";
import { SceneTasks } from "./scenes/SceneTasks";
import { SceneDashboard } from "./scenes/SceneDashboard";
import { SceneCertificate } from "./scenes/SceneCertificate";

loadInstrumentSerif();
loadInter();

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
    <AbsoluteFill style={{ fontFamily: "Inter, sans-serif", color: "#e6edf7", background: "#05060d" }}>
      <Sequence from={0} durationInFrames={90}><SceneIntro /></Sequence>
      <Sequence from={90} durationInFrames={240}><SceneHome /></Sequence>
      <Sequence from={330} durationInFrames={300}><SceneLogin /></Sequence>
      <Sequence from={630} durationInFrames={420}><SceneTasks /></Sequence>
      <Sequence from={1050} durationInFrames={450}><SceneDashboard /></Sequence>
      <Sequence from={1500} durationInFrames={300}><SceneCertificate /></Sequence>
      <Vignette />
    </AbsoluteFill>
  );
};
