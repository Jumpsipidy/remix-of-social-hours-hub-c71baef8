import { describe, expect, it } from "vitest";
import { captchaMode } from "@/lib/captcha-state";

describe("CAPTCHA configuration recovery", () => {
  it("does not replace a failed configuration request with arithmetic", () => {
    expect(captchaMode(undefined, true)).toBe("config-error");
    expect(captchaMode(null, true)).toBe("config-error");
  });
  it("renders reCAPTCHA when a public site key is configured", () => {
    expect(captchaMode("configured-public-site-key", false)).toBe("recaptcha");
  });
  it("waits for configuration before choosing a verification method", () => {
    expect(captchaMode(undefined, false)).toBe("loading");
    expect(captchaMode(null, false)).toBe("math");
  });
});