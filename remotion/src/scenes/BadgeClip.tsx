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
import {
  ClockworkStory,
  LadderStory,
  MosaicStory,
  PolaroidStory,
  RibbonStory,
  RocketStory,
  ScoreboardStory,
  SeedStory,
  SunriseStory,
  VinylStory,
} from "./badge/stories2";

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
    case "ladder":
      return <LadderStory badge={badge} />;
    case "sunrise":
      return <SunriseStory badge={badge} />;
    case "polaroid":
      return <PolaroidStory badge={badge} />;
    case "vinyl":
      return <VinylStory badge={badge} />;
    case "seed":
      return <SeedStory badge={badge} />;
    case "mosaic":
      return <MosaicStory badge={badge} />;
    case "rocket":
      return <RocketStory badge={badge} />;
    case "clockwork":
      return <ClockworkStory badge={badge} />;
    case "ribbon":
      return <RibbonStory badge={badge} />;
    case "scoreboard":
      return <ScoreboardStory badge={badge} />;
    case "liquid":
    default:
      return <LiquidStory badge={badge} />;
  }
};
