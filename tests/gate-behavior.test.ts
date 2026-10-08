import { describe, it, expect } from "vitest";
import { gateBehaviorFailures, type GateBehavior } from "@/lib/gate-behavior";

const mouse: GateBehavior = { holdMs: 1600, pointerType: "mouse", trusted: true, inputMode: "pointer", samples: [{ x: 10, y: 10, t: 0 }, { x: 15, y: 12, t: 400 }] };
describe("Soci Guard hold validation", () => {
  it("accepts a 1600ms hold with mouse movement", () => expect(gateBehaviorFailures(mouse, 2000)).toEqual([]));
  it("does not trust fabricated jitter totals without real samples", () => expect(gateBehaviorFailures({ ...mouse, samples: [{ x: 10, y: 10, t: 0 }] }, 2000)).toContain("no_motion"));
  it("allows still touch input", () => expect(gateBehaviorFailures({ ...mouse, pointerType: "touch", samples: [{ x: 10, y: 10, t: 0 }] }, 2000)).toEqual([]));
  it("allows keyboard input without motion", () => expect(gateBehaviorFailures({ ...mouse, inputMode: "keyboard", pointerType: "", samples: [] }, 2000)).toEqual([]));
  it("rejects untrusted script events", () => expect(gateBehaviorFailures({ ...mouse, trusted: false }, 2000)).toContain("synthetic_event"));
  it("rejects future challenge timestamps", () => expect(gateBehaviorFailures(mouse, -2000)).toContain("too_fast"));
  it("rejects samples outside the actual hold", () => expect(gateBehaviorFailures({ ...mouse, samples: [{ x: 1, y: 2, t: 10000 }] }, 2000)).toContain("invalid_motion"));
  it("rejects reversed sample times", () => expect(gateBehaviorFailures({ ...mouse, samples: [{ x: 1, y: 2, t: 400 }, { x: 5, y: 6, t: 100 }] }, 2000)).toContain("invalid_motion"));
  it("rejects holds shorter than 1500ms", () => expect(gateBehaviorFailures({ ...mouse, holdMs: 1499 }, 2000)).toContain("short_hold"));
  it("expires a challenge after five minutes", () => expect(gateBehaviorFailures(mouse, 300001)).toContain("expired"));
});