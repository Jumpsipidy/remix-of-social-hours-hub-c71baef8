import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";
import { QRShowcase } from "./scenes/qr/QRShowcase";
import { PDFShowcase } from "./scenes/pdf/PDFShowcase";
import { BadgeClip } from "./scenes/BadgeClip";
import { BADGES } from "./badges";

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
    <Composition
      id="pdf-cert"
      component={PDFShowcase}
      durationInFrames={780}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="badge"
      component={BadgeClip}
      durationInFrames={132}
      fps={30}
      width={1080}
      height={1080}
      defaultProps={{ badge: BADGES[0]! }}
    />
  </>
);
