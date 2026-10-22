import { describe, expect, it, vi } from "vitest";
import { isCredentialRejection, isPublicStatsFunction, resolveLoginProfile } from "@/lib/login-result";

describe("post-login profile recovery", () => {
  it("keeps the existing school administrator role", async () => {
    const repair = vi.fn();
    expect(await resolveLoginProfile(async () => ({ role: "school_admin" }), repair)).toEqual({ role: "school_admin" });
    expect(repair).not.toHaveBeenCalled();
  });
  it("uses authenticated repair when the ordinary profile read fails", async () => {
    expect(await resolveLoginProfile(async () => { throw new Error("offline"); }, async () => ({ role: "organization" }))).toEqual({ role: "organization" });
  });
  it("repairs a missing profile", async () => {
    expect(await resolveLoginProfile(async () => null, async () => ({ role: "student" }))).toEqual({ role: "student" });
  });
  it("never defaults to student after both profile paths fail", async () => {
    await expect(resolveLoginProfile(async () => null, async () => null)).rejects.toThrow("paskyros duomenų");
  });
  it("rejects an unknown role", async () => {
    await expect(resolveLoginProfile(async () => ({ role: "owner" }), async () => null)).rejects.toThrow();
  });
  it("preserves repair failure for a retry", async () => {
    await expect(resolveLoginProfile(async () => null, async () => { throw new Error("unavailable"); })).rejects.toThrow("unavailable");
  });
});
describe("credential failure classification", () => {
  it("counts invalid passwords", () => {
    expect(isCredentialRejection({ code: "invalid_credentials" })).toBe(true);
  });
  it("does not count profile/network failures as invalid passwords", () => {
    expect(isCredentialRejection(new Error("NetworkError"))).toBe(false);
    expect(isCredentialRejection(new Error("Ryšys užtruko"))).toBe(false);
  });
});
describe("session-independent public counters", () => {
  it("recognizes only the public stats development function", () => {
    expect(isPublicStatsFunction(btoa(JSON.stringify({ file: "/src/lib/public-stats.functions.ts?tss-serverfn-split", export: "getPublicStats_createServerFn_handler" })))).toBe(true);
    expect(isPublicStatsFunction(btoa(JSON.stringify({ file: "/src/lib/admin.functions.ts", export: "deleteAccounts" })))).toBe(false);
  });
  it("does not trust unrecognized opaque IDs", () => {
    expect(isPublicStatsFunction("unknown-id")).toBe(false);
  });
});