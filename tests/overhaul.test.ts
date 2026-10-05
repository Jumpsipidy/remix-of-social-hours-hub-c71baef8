import { describe, it, expect } from "vitest";
import { cityOf, CITIES } from "@/lib/cities";
import { humanMotionScore } from "@/lib/bot-signals";

describe("cities", () => {
  it("only 3 supported cities", () => expect(CITIES).toEqual(["Šeduva", "Radviliškis", "Šiauliai"]));
  it("explicit city wins", () => expect(cityOf({ city: "Šiauliai", location: "Šeduva" })).toBe("Šiauliai"));
  it("parses city from location without diacritics", () => {
    expect(cityOf({ location: "Seduvos biblioteka" })).toBe("Šeduva");
    expect(cityOf({ address: "Vaižganto g. 5, Radviliškis" })).toBe("Radviliškis");
    expect(cityOf({ location: "Vilnius" })).toBeNull();
  });
  it("rejects unknown explicit city", () => expect(cityOf({ city: "Kaunas" })).toBeNull());
});

describe("bot gate motion check", () => {
  it("perfectly still, perfectly timed input fails", () => {
    const pts = Array.from({ length: 20 }, (_, i) => ({ x: 10, y: 10, t: i * 16 }));
    expect(humanMotionScore(pts)).toBe(0);
  });
  it("jittery irregular input passes", () => {
    const pts = [0, 13, 31, 44, 70, 85, 120].map((t, i) => ({ x: 10 + (i % 3), y: 10 + (i % 2), t }));
    expect(humanMotionScore(pts)).toBeGreaterThanOrEqual(1);
  });
});
