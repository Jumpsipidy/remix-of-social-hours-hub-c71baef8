import { describe, expect, it } from "vitest";
import { optionalReservationTimes } from "../src/lib/reservation-time";
describe("optional reservation times", () => {
  it("allows both times blank", () => expect(optionalReservationTimes("", "")).toEqual({ start: null, end: null }));
  it("allows start only", () => expect(optionalReservationTimes("14:00", "")).toEqual({ start: "14:00", end: null }));
  it("allows end only", () => expect(optionalReservationTimes("", "17:00")).toEqual({ start: null, end: "17:00" }));
  it("rejects reversed interval", () => expect(() => optionalReservationTimes("17:00", "14:00")).toThrow());
});
