/**
 * Every celebration clip that gets rendered to MP4.
 * Keys match the app: achievement keys from src/lib/achievements.ts
 * plus streak milestones (streak-3 … streak-30).
 *
 * `variant` decides WHICH story animation plays — each variant is a totally
 * different 7 second mini-film, not a re-skin of the same template.
 */
export type BadgeVariant = "hours" | "streak" | "orgs" | "social" | "tasks";

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
};

export const LT_YELLOW = "#F5C542";
export const LT_GREEN = "#1E9E63";
export const LT_RED = "#C8452A";

type Extra = Partial<Pick<BadgeSpec, "count" | "unit" | "progress" | "big">>;

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
  /* ── hours: goal ring fills, counter climbs ───────────────────────────── */
  A("first_hour", "Pirmoji valanda", "Užbaigei pirmąją socialinę valandą.", "Star", "hours", { count: 1, unit: "val.", progress: 0.1 }),
  A("five_hours", "5 valandos", "Surinkai 5 valandas.", "Sparkles", "hours", { count: 5, unit: "val.", progress: 0.25 }),
  A("ten_hours", "10 valandų", "Dviženklis skaičius!", "Trophy", "hours", { count: 10, unit: "val.", progress: 0.5 }, LT_YELLOW, LT_RED),
  A("half_way", "Pusiaukelė", "Įveikei 50% metinio tikslo.", "Rocket", "hours", { count: 50, unit: "%", progress: 0.5 }),
  A("goal_reached", "Tikslas pasiektas", "100% metinių valandų — nuostabu!", "Award", "hours", { count: 100, unit: "%", progress: 1 }, LT_YELLOW, LT_RED),
  A("overachiever", "Perviršininkas", "150% nuo tikslo. Nesustabdomas.", "Medal", "hours", { count: 150, unit: "%", progress: 1.5 }, LT_RED, LT_YELLOW),

  /* ── orgs: map pins land one by one ───────────────────────────────────── */
  A("three_orgs", "3 organizacijos", "Savanoriavai trijose vietose.", "Building2", "orgs", { count: 3, unit: "org." }),
  A("five_orgs", "5 organizacijos", "Tikras keliautojas — 5 organizacijos.", "Target", "orgs", { count: 5, unit: "org." }),

  /* ── streak: calendar lights up day by day ────────────────────────────── */
  A("streak_2", "2 sav. iš eilės", "Dvi savaites paeiliui su valandomis.", "Flame", "streak", { count: 14, unit: "d.", big: "2" }, LT_RED, LT_YELLOW),
  A("streak_4", "Mėnesio ritmas", "4 savaitės iš eilės.", "Flame", "streak", { count: 28, unit: "d.", big: "4" }, LT_RED, LT_YELLOW),

  /* ── social: friend network assembles ─────────────────────────────────── */
  A("social_starter", "Pirmasis draugas", "Susiradai bent vieną draugą.", "Heart", "social", { count: 1, unit: "draugas" }, LT_RED, LT_YELLOW),
  A("squad", "Klasės būrys", "5 draugai mokykloje.", "Users", "social", { count: 5, unit: "draugai" }),
  A("team_player", "Komandinis žaidėjas", "Prisijungei prie grupinės rezervacijos.", "Users", "social", { count: 4, unit: "komanda" }),

  /* ── tasks: cursor ticks off a checklist in the app ───────────────────── */
  A("ten_tasks", "10 užbaigtų vizitų", "Užbaigei 10 skirtingų užduočių.", "Calendar", "tasks", { count: 10, unit: "vizitai" }),

  /* ── login streaks ────────────────────────────────────────────────────── */
  A("login_streak_3", "3 dienos iš eilės", "Prisijungei 3 dienas paeiliui.", "Flame", "streak", { count: 3, unit: "d.", big: "3" }, LT_RED, LT_YELLOW),
  A("login_streak_7", "Savaitė be pertraukų", "7 dienos iš eilės. Įprotis!", "Flame", "streak", { count: 7, unit: "d.", big: "7" }, LT_RED, LT_YELLOW),
  A("login_streak_14", "2 savaitės iš eilės", "14 dienų — retas žvėris.", "Flame", "streak", { count: 14, unit: "d.", big: "14" }, LT_RED, LT_YELLOW),
  A("login_streak_30", "Mėnuo iš eilės", "30 dienų. Tu jau legenda.", "Trophy", "streak", { count: 30, unit: "d.", big: "30" }, LT_YELLOW, LT_RED),

  { key: "streak-3", kind: "streak", title: "3 dienos", subtitle: "Serija įsibėgėja", icon: "Flame", big: "3", from: LT_YELLOW, to: LT_RED, variant: "streak", count: 3, unit: "d." },
  { key: "streak-7", kind: "streak", title: "7 dienos", subtitle: "Visa savaitė iš eilės", icon: "Flame", big: "7", from: LT_YELLOW, to: LT_RED, variant: "streak", count: 7, unit: "d." },
  { key: "streak-14", kind: "streak", title: "14 dienų", subtitle: "Dvi savaitės nesustojant", icon: "Flame", big: "14", from: LT_YELLOW, to: LT_RED, variant: "streak", count: 14, unit: "d." },
  { key: "streak-30", kind: "streak", title: "30 dienų", subtitle: "Mėnuo be pertraukų", icon: "Flame", big: "30", from: LT_YELLOW, to: LT_RED, variant: "streak", count: 30, unit: "d." },
];
