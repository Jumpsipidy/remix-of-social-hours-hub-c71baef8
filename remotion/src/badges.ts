/**
 * Every celebration clip that gets rendered to MP4.
 * Keys match the app: achievement keys from src/lib/achievements.ts
 * plus streak milestones (streak-3 … streak-30).
 */
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
};

export const LT_YELLOW = "#F5C542";
export const LT_GREEN = "#1E9E63";
export const LT_RED = "#C8452A";

const A = (key: string, title: string, subtitle: string, icon: string, from = LT_GREEN, to = LT_YELLOW): BadgeSpec => ({
  key, kind: "achievement", title, subtitle, icon, from, to,
});

export const BADGES: BadgeSpec[] = [
  A("first_hour", "Pirmoji valanda", "Užbaigei pirmąją socialinę valandą.", "Star"),
  A("five_hours", "5 valandos", "Surinkai 5 valandas.", "Sparkles"),
  A("ten_hours", "10 valandų", "Dviženklis skaičius!", "Trophy", LT_YELLOW, LT_RED),
  A("half_way", "Pusiaukelė", "Įveikei 50% metinio tikslo.", "Rocket"),
  A("goal_reached", "Tikslas pasiektas", "100% metinių valandų — nuostabu!", "Award", LT_YELLOW, LT_RED),
  A("overachiever", "Perviršininkas", "150% nuo tikslo. Nesustabdomas.", "Medal", LT_RED, LT_YELLOW),
  A("three_orgs", "3 organizacijos", "Savanoriavai trijose vietose.", "Building2"),
  A("five_orgs", "5 organizacijos", "Tikras keliautojas — 5 organizacijos.", "Target"),
  A("streak_2", "2 sav. iš eilės", "Dvi savaites paeiliui su valandomis.", "Flame", LT_RED, LT_YELLOW),
  A("streak_4", "Mėnesio ritmas", "4 savaitės iš eilės.", "Flame", LT_RED, LT_YELLOW),
  A("social_starter", "Pirmasis draugas", "Susiradai bent vieną draugą.", "Heart", LT_RED, LT_YELLOW),
  A("squad", "Klasės būrys", "5 draugai mokykloje.", "Users"),
  A("team_player", "Komandinis žaidėjas", "Prisijungei prie grupinės rezervacijos.", "Users"),
  A("ten_tasks", "10 užbaigtų vizitų", "Užbaigei 10 skirtingų užduočių.", "Calendar"),
  A("login_streak_3", "3 dienos iš eilės", "Prisijungei 3 dienas paeiliui.", "Flame", LT_RED, LT_YELLOW),
  A("login_streak_7", "Savaitė be pertraukų", "7 dienos iš eilės. Įprotis!", "Flame", LT_RED, LT_YELLOW),
  A("login_streak_14", "2 savaitės iš eilės", "14 dienų — retas žvėris.", "Flame", LT_RED, LT_YELLOW),
  A("login_streak_30", "Mėnuo iš eilės", "30 dienų. Tu jau legenda.", "Trophy", LT_YELLOW, LT_RED),
  { key: "streak-3", kind: "streak", title: "3 dienos", subtitle: "Serija įsibėgėja", icon: "Flame", big: "3", from: LT_YELLOW, to: LT_RED },
  { key: "streak-7", kind: "streak", title: "7 dienos", subtitle: "Visa savaitė iš eilės", icon: "Flame", big: "7", from: LT_YELLOW, to: LT_RED },
  { key: "streak-14", kind: "streak", title: "14 dienų", subtitle: "Dvi savaitės nesustojant", icon: "Flame", big: "14", from: LT_YELLOW, to: LT_RED },
  { key: "streak-30", kind: "streak", title: "30 dienų", subtitle: "Mėnuo be pertraukų", icon: "Flame", big: "30", from: LT_YELLOW, to: LT_RED },
];
