import { describe, it, expect } from "vitest";
import { SEDUVA, SEDUVA_SUGGESTIONS, distanceKm, rankHits, shortLabel } from "@/components/address-picker";

const hit = (id: number, lat: number, lon: number, addr: Record<string, string> = {}) => ({
  place_id: id,
  display_name: `${addr.road ?? "Vieta"}, Šeduva, Radviliškio r. sav., Lietuva`,
  lat: String(lat),
  lon: String(lon),
  address: addr,
});

describe("address picker — Šeduva accuracy", () => {
  it("has Šeduva town centre coordinates", () => {
    expect(SEDUVA.lat).toBeCloseTo(55.7556, 3);
    expect(SEDUVA.lng).toBeCloseTo(23.7519, 3);
  });

  it("offers Šeduva recommendations", () => {
    expect(SEDUVA_SUGGESTIONS.length).toBeGreaterThanOrEqual(6);
    expect(SEDUVA_SUGGESTIONS.every((s) => /šeduv/i.test(s.query))).toBe(true);
  });

  it("measures distance from Šeduva", () => {
    expect(distanceKm(SEDUVA, SEDUVA)).toBeCloseTo(0, 5);
    // Radviliškis is roughly 15-20 km away
    const d = distanceKm(SEDUVA, { lat: 55.8106, lng: 23.5464 });
    expect(d).toBeGreaterThan(10);
    expect(d).toBeLessThan(30);
  });

  it("ranks results closest to Šeduva first", () => {
    const far = hit(1, 55.8106, 23.5464, { road: "Radviliškis g." });
    const near = hit(2, 55.7558, 23.752, { road: "Vaižganto g." });
    const ranked = rankHits([far, near]);
    expect(ranked[0].place_id).toBe(2);
  });

  it("de-duplicates identical labels", () => {
    const a = hit(1, 55.7558, 23.752, { road: "Vaižganto g.", house_number: "5" });
    const b = hit(2, 55.7559, 23.7521, { road: "Vaižganto g.", house_number: "5" });
    expect(rankHits([a, b])).toHaveLength(1);
  });

  it("shortens the Nominatim label", () => {
    const h = hit(1, 55.7558, 23.752, { road: "Vaižganto g.", house_number: "5", town: "Šeduva" });
    expect(shortLabel(h)).toBe("Vaižganto g. 5, Šeduva");
  });
});
