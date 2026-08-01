/**
 * Every celebration clip that gets rendered to MP4.
 * Keys match the app: achievement keys from src/lib/achievements.ts
 * plus streak milestones (streak-3 … streak-30).
 *
 * `variant` decides WHICH story animation plays — each variant is a totally
 * different 7 second mini-film, not a re-skin of the same template.
 */
export type BadgeVariant =
  | "liquid"
  | "bars"
  | "orbit"
  | "typestorm"
  | "domino"
  | "torch"
  | "stamps"
  | "constellation"
  | "odometer"
  | "forge"
  | "route"
  | "pulse"
  | "ladder"
  | "sunrise"
  | "polaroid"
  | "vinyl"
  | "seed"
  | "mosaic"
  | "rocket"
  | "clockwork"
  | "ribbon"
  | "scoreboard";

/** How the final title card lands — varied so no two clips end the same way. */
export type BadgeReveal = "medal" | "stamp" | "ticker" | "plain" | "shatter" | "curtain" | "flip" | "banner";

export type BadgeSpec = {
  key: string;
  kind: "achievement" | "streak";
  title: string;
  subtitle: string;
  /** lucide-react icon name */
  icon: string;
  /** hero glyph shown behind the icon for streaks */
  big?: string;
  /** accent pair */
  from: string;
  to: string;
  /** which story animation to play */
  variant: BadgeVariant;
  /** the number the story counts to (hours, days, orgs, friends, tasks) */
  count?: number;
  /** unit shown next to the counter */
  unit?: string;
  /** hours variant: how full the goal ring gets (1 = 100%) */
  progress?: number;
  /** closing card style */
  reveal?: BadgeReveal;
};

export const LT_YELLOW = "#F5C542";
export const LT_GREEN = "#1E9E63";
export const LT_RED = "#C8452A";

type Extra = Partial<Pick<BadgeSpec, "count" | "unit" | "progress" | "big" | "reveal">>;

const A = (
  key: string,
  title: string,
  subtitle: string,
  icon: string,
  variant: BadgeVariant,
  extra: Extra = {},
  from = LT_GREEN,
  to = LT_YELLOW,
): BadgeSpec => ({ key, kind: "achievement", title, subtitle, icon, variant, from, to, ...extra });

export const BADGES: BadgeSpec[] = [
  /* Every badge gets its OWN story engine + its own closing card style.
     No two clips share the same combination. */

  A("first_hour", "Pirmoji valanda", "Užbaigei pirmąją socialinę valandą.", "Star", "liquid", { count: 1, unit: "val.", progress: 0.14, reveal: "medal" }),
  A("five_hours", "5 valandos", "Surinkai 5 valandas.", "Sparkles", "bars", { count: 5, unit: "val.", reveal: "ticker" }),
  A("ten_hours", "10 valandų", "Dviženklis skaičius!", "Trophy", "odometer", { count: 10, unit: "valandos", reveal: "stamp" }, LT_YELLOW, LT_RED),
  A("half_way", "Pusiaukelė", "Įveikei 50% metinio tikslo.", "Rocket", "clockwork", { count: 50, unit: "%", progress: 0.5, reveal: "curtain" }),
  A("goal_reached", "Tikslas pasiektas", "100% metinių valandų — nuostabu!", "Award", "forge", { count: 100, unit: "%", reveal: "shatter" }, LT_YELLOW, LT_RED),
  A("overachiever", "Perviršininkas", "150% nuo tikslo. Nesustabdomas.", "Medal", "rocket", { count: 150, unit: "%", reveal: "flip" }, LT_RED, LT_YELLOW),

  A("three_orgs", "3 organizacijos", "Savanoriavai trijose vietose.", "Building2", "stamps", { count: 3, unit: "org.", reveal: "banner" }),
  A("five_orgs", "5 organizacijos", "Tikras keliautojas — 5 organizacijos.", "Target", "route", { count: 5, unit: "org.", reveal: "ticker" }),

  A("streak_2", "2 sav. iš eilės", "Dvi savaites paeiliui su valandomis.", "Flame", "domino", { count: 14, unit: "d.", big: "2", reveal: "plain" }, LT_RED, LT_YELLOW),
  A("streak_4", "Mėnesio ritmas", "4 savaitės iš eilės.", "Flame", "torch", { count: 28, unit: "d.", big: "4", reveal: "curtain" }, LT_RED, LT_YELLOW),

  A("social_starter", "Pirmasis draugas", "Susiradai bent vieną draugą.", "Heart", "pulse", { count: 1, unit: "draugas", reveal: "medal" }, LT_RED, LT_YELLOW),
  A("squad", "Klasės būrys", "5 draugai mokykloje.", "Users", "constellation", { count: 5, unit: "draugai", reveal: "banner" }),
  A("team_player", "Komandinis žaidėjas", "Prisijungei prie grupinės rezervacijos.", "Users", "polaroid", { count: 4, unit: "komanda", reveal: "flip" }),

  A("ten_tasks", "10 užbaigtų vizitų", "Užbaigei 10 skirtingų užduočių.", "Calendar", "typestorm", { count: 10, unit: "vizitai", reveal: "stamp" }),

  A("login_streak_3", "3 dienos iš eilės", "Prisijungei 3 dienas paeiliui.", "Flame", "seed", { count: 3, unit: "d.", big: "3", reveal: "medal" }, LT_RED, LT_YELLOW),
  A("login_streak_7", "Savaitė be pertraukų", "7 dienos iš eilės. Įprotis!", "Flame", "ladder", { count: 7, unit: "d.", big: "7", reveal: "shatter" }, LT_RED, LT_YELLOW),
  A("login_streak_14", "2 savaitės iš eilės", "14 dienų — retas žvėris.", "Flame", "mosaic", { count: 14, unit: "d.", big: "14", reveal: "ticker" }, LT_RED, LT_YELLOW),
  A("login_streak_30", "Mėnuo iš eilės", "30 dienų. Tu jau legenda.", "Trophy", "sunrise", { count: 30, unit: "d.", big: "30", reveal: "banner" }, LT_YELLOW, LT_RED),

  { key: "streak-3", kind: "streak", title: "3 dienos", subtitle: "Serija įsibėgėja", icon: "Flame", big: "3", from: LT_YELLOW, to: LT_RED, variant: "vinyl", count: 3, unit: "dienos", reveal: "plain" },
  { key: "streak-7", kind: "streak", title: "7 dienos", subtitle: "Visa savaitė iš eilės", icon: "Flame", big: "7", from: LT_YELLOW, to: LT_RED, variant: "scoreboard", count: 7, unit: "d.", reveal: "flip" },
  { key: "streak-14", kind: "streak", title: "14 dienų", subtitle: "Dvi savaitės nesustojant", icon: "Flame", big: "14", from: LT_YELLOW, to: LT_RED, variant: "ribbon", count: 6, unit: "d.", reveal: "curtain" },
  { key: "streak-30", kind: "streak", title: "30 dienų", subtitle: "Mėnuo be pertraukų", icon: "Trophy", big: "30", from: LT_YELLOW, to: LT_RED, variant: "orbit", count: 30, unit: "d.", reveal: "shatter" },
];
