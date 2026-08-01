import React from "react";
import type { BadgeSpec } from "../badges";
import {
  BarsStory,
  ConstellationStory,
  DominoStory,
  ForgeStory,
  LiquidStory,
  OdometerStory,
  OrbitStory,
  PulseStory,
  RouteStory,
  StampsStory,
  TorchStory,
  TypeStormStory,
} from "./badge/stories";

/**
 * One 7-second film per badge. Every badge picks a different story engine AND
 * a different closing card, so no two clips look alike.
 */
export const BadgeClip: React.FC<{ badge: BadgeSpec }> = ({ badge }) => {
  switch (badge.variant) {
    case "bars":
      return <BarsStory badge={badge} />;
    case "orbit":
      return <OrbitStory badge={badge} />;
    case "typestorm":
      return <TypeStormStory badge={badge} />;
    case "domino":
      return <DominoStory badge={badge} />;
    case "torch":
      return <TorchStory badge={badge} />;
    case "stamps":
      return <StampsStory badge={badge} />;
    case "constellation":
      return <ConstellationStory badge={badge} />;
    case "odometer":
      return <OdometerStory badge={badge} />;
    case "forge":
      return <ForgeStory badge={badge} />;
    case "route":
      return <RouteStory badge={badge} />;
    case "pulse":
      return <PulseStory badge={badge} />;
    case "liquid":
    default:
      return <LiquidStory badge={badge} />;
  }
};
