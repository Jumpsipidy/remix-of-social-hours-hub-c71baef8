export type SiteTheme = "dark" | "light";
export const THEME_KEY = "sv_school_eyes_v1";
export const THEME_PROMPT_KEY = "sv_theme_choice_seen_v1";
/** Fired when the first-device theme chooser closes, so other first-visit prompts can follow it. */
export const THEME_CHOICE_DONE_EVENT = "sv:theme-choice-done";
export const ACCENT_KEY = "sv_theme_accent_v1";

export function normalizeAccent(value: number) {
  return Number.isFinite(value) ? Math.max(-100, Math.min(100, value)) : 0;
}

export function readAccentPreference(storage: Pick<Storage, "getItem">) {
  return normalizeAccent(Number(storage.getItem(ACCENT_KEY) ?? "0"));
}

export function saveAccentPreference(storage: Pick<Storage, "setItem">, value: number) {
  storage.setItem(ACCENT_KEY, String(normalizeAccent(value)));
}

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

export function resetThemePreference(storage: Pick<Storage, "setItem">) {
  saveThemePreference(storage, "dark");
  saveAccentPreference(storage, 0);
}
export const ELEGANT_KEY = "sv_theme_elegant_v1";
export function readElegantPreference(storage: Pick<Storage, "getItem">) {
  return storage.getItem(ELEGANT_KEY) === "1";
}
export function saveElegantPreference(storage: Pick<Storage, "setItem">, on: boolean) {
  storage.setItem(ELEGANT_KEY, on ? "1" : "0");
}
