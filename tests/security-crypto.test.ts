import { describe, expect, it } from "vitest";
import { isAllowedRecaptchaHostname } from "@/lib/security-crypto.server";

describe("isAllowedRecaptchaHostname", () => {
  it("accepts the production domains and local dev", () => {
    expect(isAllowedRecaptchaHostname("socialinesvalandos.dev")).toBe(true);
    expect(isAllowedRecaptchaHostname("WWW.SOCIALINESVALANDOS.DEV")).toBe(true);
    expect(isAllowedRecaptchaHostname("localhost")).toBe(true);
  });

  it("rejects foreign domains and a missing hostname", () => {
    expect(isAllowedRecaptchaHostname("evil.com")).toBe(false);
    expect(isAllowedRecaptchaHostname("socialinesvalandos.dev.evil.com")).toBe(false);
    expect(isAllowedRecaptchaHostname(undefined)).toBe(false);
  });
});
