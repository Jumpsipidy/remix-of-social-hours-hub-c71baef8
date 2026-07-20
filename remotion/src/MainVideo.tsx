import { AbsoluteFill, Sequence, useCurrentFrame, interpolate } from "remotion";
import { loadFont as loadInstrumentSerif } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { AmbientBg } from "./ui/primitives";
import { SceneOpening } from "./scenes/SceneOpening";
import { SceneTagline } from "./scenes/SceneTagline";
import { SceneStats } from "./scenes/SceneStats";
import { SceneOpportunities } from "./scenes/SceneOpportunities";
import { SceneProgress } from "./scenes/SceneProgress";
import { SceneCertificate } from "./scenes/SceneCertificate";
import { SceneOutro } from "./scenes/SceneOutro";

loadInstrumentSerif();
loadInter();

const Vignette: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30, 1710, 1740], [0, 1, 1, 0]);
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        opacity,
        background:
          "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.6) 100%)",
      }}
    />
  );
};

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ fontFamily: "Inter, sans-serif", color: "#e6edf7", background: "#05060d" }}>
      <AbsoluteFill><AmbientBg /></AbsoluteFill>
      <Sequence from={0} durationInFrames={150}><SceneOpening /></Sequence>
      <Sequence from={150} durationInFrames={150}><SceneTagline /></Sequence>
      <Sequence from={300} durationInFrames={240}><SceneStats /></Sequence>
      <Sequence from={540} durationInFrames={300}><SceneOpportunities /></Sequence>
      <Sequence from={840} durationInFrames={300}><SceneProgress /></Sequence>
      <Sequence from={1140} durationInFrames={300}><SceneCertificate /></Sequence>
      <Sequence from={1440} durationInFrames={300}><SceneOutro /></Sequence>
      <Vignette />
    </AbsoluteFill>
  );
};
