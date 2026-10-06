export type SiteTheme = "dark" | "light";
export const THEME_KEY = "sv_school_eyes_v1";
export const THEME_PROMPT_KEY = "sv_theme_choice_seen_v1";

export function readThemePreference(storage: Pick<Storage, "getItem">) {
  const saved = storage.getItem(THEME_KEY);
  return {
    theme: saved === "1" ? "light" as const : "dark" as const,
    // Existing explicit choices also count as a completed first visit.
    ask: saved === null && storage.getItem(THEME_PROMPT_KEY) !== "1",
  };
}

export function saveThemePreference(storage: Pick<Storage, "setItem">, theme: SiteTheme) {
  storage.setItem(THEME_KEY, theme === "light" ? "1" : "0");
  storage.setItem(THEME_PROMPT_KEY, "1");
}