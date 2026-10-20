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
import { hoursFromCode } from "@/lib/class-codes.server";
import { formatClassCode, isCompleteClassCode } from "@/components/class-code-input";

describe("hours locked to class code", () => {
  it("uses the hours set on the class code", () => { expect(hoursFromCode("9 / I gimn.", 40)).toBe(40); });
  it("always gives 20 hours to classes 5–7", () => { expect(hoursFromCode("6", 60)).toBe(20); });
  it("falls back to 20 when the code has no hours", () => { expect(hoursFromCode("10 / II gimn.", null)).toBe(20); });
});

describe("class code formatting", () => {
  it("formats typed input to MKC-XXXXX-X", () => { expect(formatClassCode("mkc ab12c 9")).toBe("MKC-AB12C-9"); });
  it("recognises a complete code", () => { expect(isCompleteClassCode("MKC-AB12C-9")).toBe(true); expect(isCompleteClassCode("MKC-AB12")).toBe(false); });
});
