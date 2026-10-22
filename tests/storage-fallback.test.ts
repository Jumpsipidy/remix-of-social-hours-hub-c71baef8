import { describe, expect, it, vi } from "vitest";

describe("storage fallback", () => {
  it("replaces a localStorage that throws on every call", async () => {
    const broken = { getItem: () => { throw new Error("NS_ERROR_FAILURE"); }, setItem: () => { throw new Error("NS_ERROR_FAILURE"); }, removeItem: () => {} };
    Object.defineProperty(window, "localStorage", { configurable: true, get: () => broken });
    vi.resetModules();
    const { installStorageFallback } = await import("../src/lib/storage-fallback");
    expect(installStorageFallback()).toBe("native"); // already swapped on import
    window.localStorage.setItem("sb-key", "session");
    expect(window.localStorage.getItem("sb-key")).toBe("session");
  });
});
