import { describe, expect, it } from "vitest";
import { readThemePreference, saveThemePreference, THEME_KEY } from "@/lib/theme-preference";

function deviceStorage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}
describe("device-level theme preferences", () => {
  it("starts the first device visit in dark mode and asks once", () => {
    expect(readThemePreference(deviceStorage())).toEqual({ theme: "dark", ask: true });
  });
  it("keeps a chosen white theme on the same device without repeating the question", () => {
    const storage = deviceStorage();
    saveThemePreference(storage, "light");
    expect(readThemePreference(storage)).toEqual({ theme: "light", ask: false });
  });
  it("dismissal keeps the default black theme and does not ask on a return visit", () => {
    const storage = deviceStorage();
    saveThemePreference(storage, "dark");
    expect(readThemePreference(storage)).toEqual({ theme: "dark", ask: false });
  });
  it("preserves a pre-existing light preference", () => {
    const storage = deviceStorage();
    storage.setItem(THEME_KEY, "1");
    expect(readThemePreference(storage)).toEqual({ theme: "light", ask: false });
  });
});