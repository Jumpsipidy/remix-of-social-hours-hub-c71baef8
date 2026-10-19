import { describe, expect, it } from "vitest";
import { classAssignment, registrationComplete, signupHours } from "@/lib/signup-rules";
import { parseConsent } from "@/lib/consent";
describe("class signup rules", () => {
  const row = { school_id: "school-one", class_year: "8", class_letter: "B", is_active: true };
  it("assigns 8B from the code", () => expect(classAssignment(row, "school-one")).toEqual({ schoolId: "school-one", classYear: "8", classLetter: "B" }));
  it("rejects another school", () => expect(classAssignment(row, "school-two")).toBeNull());
  it("rejects inactive codes", () => expect(classAssignment({ ...row, is_active: false }, "school-one")).toBeNull());
  it("requires the class letter before completing setup", () => expect(registrationComplete({ school_id: "one", class_year: "8", class_letter: null })).toBe(false));
  it("preserves the 20-hour lower-class rule", () => expect(signupHours("7", 8)).toBe(20));
});
describe("cookie consent", () => {
  const now = 100000;
  const record = { version: 1, timestamp: now, categories: { necessary: true, analytics: false, marketing: false } };
  it("keeps rejection across reload", () => expect(parseConsent(JSON.stringify(record), now)?.categories.analytics).toBe(false));
  it("rejects future consent", () => expect(parseConsent(JSON.stringify({ ...record, timestamp: now + 1 }), now)).toBeNull());
  it("rejects malformed consent", () => expect(parseConsent(JSON.stringify({ ...record, categories: { necessary: true, analytics: "yes" } }), now)).toBeNull());
});