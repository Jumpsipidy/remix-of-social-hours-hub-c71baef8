import { describe, expect, it } from "vitest";
import {
  TEACHER_TOUR_STEPS,
  TEACHER_TOUR_STORAGE_KEY,
  markTourCompleted,
  resetTour,
  tourCompleted,
} from "../src/lib/teacher-tour";

function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
  };
}

describe("teacher tour steps", () => {
  it("turi unikalius id ir nepanaikintus selektorius", () => {
    const ids = TEACHER_TOUR_STEPS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of TEACHER_TOUR_STEPS) {
      expect(s.selector.startsWith('[data-tour="')).toBe(true);
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.body.length).toBeGreaterThan(10);
    }
  });

  it("apima visus pagrindinius apžvalgos blokus", () => {
    const ids = TEACHER_TOUR_STEPS.map((s) => s.id);
    for (const required of ["nav", "hero", "quick-actions", "kpis", "chart", "upcoming", "attention", "streaks"]) {
      expect(ids).toContain(required);
    }
  });
});

describe("teacher tour storage", () => {
  it("pradžioje vedlys nebaigtas", () => {
    expect(tourCompleted(fakeStorage())).toBe(false);
  });

  it("markTourCompleted pažymi kaip baigtą", () => {
    const s = fakeStorage();
    markTourCompleted(s);
    expect(s.getItem(TEACHER_TOUR_STORAGE_KEY)).toBe("done");
    expect(tourCompleted(s)).toBe(true);
  });

  it("resetTour leidžia rodyti vedlį iš naujo", () => {
    const s = fakeStorage({ [TEACHER_TOUR_STORAGE_KEY]: "done" });
    resetTour(s);
    expect(tourCompleted(s)).toBe(false);
  });

  it("sugedusi atmintis neblokuoja vedlio", () => {
    const broken = {
      getItem: () => { throw new Error("NS_ERROR_FAILURE"); },
      setItem: () => { throw new Error("NS_ERROR_FAILURE"); },
    };
    expect(tourCompleted(broken)).toBe(false);
    expect(() => markTourCompleted(broken)).not.toThrow();
  });
});
