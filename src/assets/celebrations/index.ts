/** Auto-generated: MP4 celebration clip per achievement / streak milestone. */
import c0 from "./first_hour.mp4.asset.json";
import c1 from "./five_hours.mp4.asset.json";
import c2 from "./five_orgs.mp4.asset.json";
import c3 from "./goal_reached.mp4.asset.json";
import c4 from "./half_way.mp4.asset.json";
import c5 from "./login_streak_14.mp4.asset.json";
import c6 from "./login_streak_3.mp4.asset.json";
import c7 from "./login_streak_30.mp4.asset.json";
import c8 from "./login_streak_7.mp4.asset.json";
import c9 from "./overachiever.mp4.asset.json";
import c10 from "./social_starter.mp4.asset.json";
import c11 from "./squad.mp4.asset.json";
import c12 from "./streak-14.mp4.asset.json";
import c13 from "./streak-3.mp4.asset.json";
import c14 from "./streak-30.mp4.asset.json";
import c15 from "./streak-7.mp4.asset.json";
import c16 from "./streak_2.mp4.asset.json";
import c17 from "./streak_4.mp4.asset.json";
import c18 from "./team_player.mp4.asset.json";
import c19 from "./ten_hours.mp4.asset.json";
import c20 from "./ten_tasks.mp4.asset.json";
import c21 from "./three_orgs.mp4.asset.json";

export const CLIP_URLS: Record<string, string> = {
  "first_hour": c0.url,
  "five_hours": c1.url,
  "five_orgs": c2.url,
  "goal_reached": c3.url,
  "half_way": c4.url,
  "login_streak_14": c5.url,
  "login_streak_3": c6.url,
  "login_streak_30": c7.url,
  "login_streak_7": c8.url,
  "overachiever": c9.url,
  "social_starter": c10.url,
  "squad": c11.url,
  "streak-14": c12.url,
  "streak-3": c13.url,
  "streak-30": c14.url,
  "streak-7": c15.url,
  "streak_2": c16.url,
  "streak_4": c17.url,
  "team_player": c18.url,
  "ten_hours": c19.url,
  "ten_tasks": c20.url,
  "three_orgs": c21.url,
};

export const STREAK_MILESTONES = [30, 14, 7, 3];

export function clipForStreak(days: number): string | undefined {
  const m = STREAK_MILESTONES.find((x) => days >= x);
  return m ? CLIP_URLS[`streak-${m}`] : undefined;
}
