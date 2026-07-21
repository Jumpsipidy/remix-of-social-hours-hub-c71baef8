import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";
import { QRShowcase } from "./scenes/qr/QRShowcase";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="main"
      component={MainVideo}
      durationInFrames={1740}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="qr-checkin"
      component={QRShowcase}
      durationInFrames={630}
      fps={30}
      width={1920}
      height={1080}
    />
  </>
);
