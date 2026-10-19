import { describe, expect, it } from "vitest";
import { lockdownSettingsSchema } from "@/lib/lockdown-rules";
describe("lockdown selection", () => {
  it("accepts critical automatic code E-5003", () => expect(lockdownSettingsSchema.safeParse({ lockdown_code: "E-5003" }).success).toBe(true));
  it("rejects unknown lockdown codes", () => expect(lockdownSettingsSchema.safeParse({ lockdown_code: "E-FAKE" }).success).toBe(false));
});