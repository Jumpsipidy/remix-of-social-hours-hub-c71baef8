import { AbsoluteFill, Sequence, useCurrentFrame, interpolate } from "remotion";
import { loadFont as loadInstrumentSerif } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { AmbientBg } from "./ui/primitives";
import { SceneHook } from "./scenes/SceneHook";
import { SceneLogin } from "./scenes/SceneLogin";
import { SceneFind } from "./scenes/SceneFind";
import { SceneReserve } from "./scenes/SceneReserve";
import { SceneDashboard } from "./scenes/SceneDashboard";
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
        background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.6) 100%)",
      }}
    />
  );
};

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ fontFamily: "Inter, sans-serif", color: "#e6edf7", background: "#05060d" }}>
      <AbsoluteFill><AmbientBg /></AbsoluteFill>
      <Sequence from={0}    durationInFrames={150}><SceneHook /></Sequence>
      <Sequence from={150}  durationInFrames={210}><SceneLogin /></Sequence>
      <Sequence from={360}  durationInFrames={270}><SceneFind /></Sequence>
      <Sequence from={630}  durationInFrames={240}><SceneReserve /></Sequence>
      <Sequence from={870}  durationInFrames={330}><SceneDashboard /></Sequence>
      <Sequence from={1200} durationInFrames={300}><SceneCertificate /></Sequence>
      <Sequence from={1500} durationInFrames={240}><SceneOutro /></Sequence>
      <Vignette />
    </AbsoluteFill>
  );
};
