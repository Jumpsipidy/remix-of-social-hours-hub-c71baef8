import { describe, expect, it } from "vitest";
import { appendAccessKey, lockdownBlocks, parseLockdownState } from "@/lib/lockdown-state";

describe("Lockdown enforcement", () => {
  it("blocks a confirmed lockdown", () => expect(lockdownBlocks(true, false, false)).toBe(true));
  it("blocks an unknown status", () => expect(lockdownBlocks(null, false, false)).toBe(true));
  it("blocks after a failed status check", () => expect(lockdownBlocks(false, true, false)).toBe(true));
  it("opens only for confirmed disabled status", () => expect(lockdownBlocks(false, false, false)).toBe(false));
  it("allows verified administrative bypass", () => expect(lockdownBlocks(true, false, true)).toBe(false));
  it("rejects missing and malformed status", () => {
    expect(parseLockdownState([])).toBeNull();
    expect(parseLockdownState({ lockdown_enabled: "false" })).toBeNull();
  });
  it("reads both RPC arrays and server objects", () => {
    expect(parseLockdownState([{ lockdown_enabled: true }])?.lockdown_enabled).toBe(true);
    expect(parseLockdownState({ lockdown_enabled: false })?.lockdown_enabled).toBe(false);
  });
  it("recognizes jumpsipidy after other typing, case insensitive", () => {
    let buffer = "";
    for (const key of "abcJUMPSIPIDY") buffer = appendAccessKey(buffer, key);
    expect(buffer).toBe("jumpsipidy");
  });
});