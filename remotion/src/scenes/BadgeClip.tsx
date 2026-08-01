import React from "react";
import type { BadgeSpec } from "../badges";
import { HoursStory } from "./badge/HoursStory";
import { OrgStory } from "./badge/OrgStory";
import { SocialStory } from "./badge/SocialStory";
import { StreakStory } from "./badge/StreakStory";
import { TaskStory } from "./badge/TaskStory";

/**
 * One 7-second film per badge. The `variant` on the badge picks a completely
 * different story — no two categories share a template.
 */
export const BadgeClip: React.FC<{ badge: BadgeSpec }> = ({ badge }) => {
  switch (badge.variant) {
    case "streak":
      return <StreakStory badge={badge} />;
    case "orgs":
      return <OrgStory badge={badge} />;
    case "social":
      return <SocialStory badge={badge} />;
    case "tasks":
      return <TaskStory badge={badge} />;
    case "hours":
    default:
      return <HoursStory badge={badge} />;
  }
};
