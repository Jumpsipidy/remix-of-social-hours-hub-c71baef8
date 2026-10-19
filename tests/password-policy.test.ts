import { describe, it, expect } from "vitest";
import { passwordProblem } from "../src/lib/password-policy";

describe("password policy", () => {
  it("rejects passwords shorter than 10", () => expect(passwordProblem("abc12345")).not.toBeNull());
  it("requires letters and digits", () => expect(passwordProblem("abcdefghijkl")).not.toBeNull());
  it("rejects email name inside password", () => expect(passwordProblem("jonas12345xy", "jonas@x.lt")).not.toBeNull());
  it("accepts a strong password", () => expect(passwordProblem("Kriau5e-Medis-77")).toBeNull());
});
