/**
 * Smoke tests — imports every route & server-function module.
 *
 * If any module has a syntax error, missing import, or top-level throw the
 * test fails, catching build regressions before Vite's slower prod build.
 *
 * Also verifies critical exports exist for login / reservations / hours flows.
 */
import { describe, expect, it } from "vitest";

// Vite (used by vitest) supports import.meta.glob for bulk module discovery.
const routeMods = import.meta.glob("../src/routes/**/*.tsx");
const fnMods = import.meta.glob("../src/lib/*.functions.ts");
const libMods = import.meta.glob("../src/lib/*.ts");

describe("route modules load", () => {
  for (const path in routeMods) {
    it(`imports ${path}`, async () => {
      const mod = await routeMods[path]();
      expect(mod).toBeTruthy();
    });
  }
});

describe("server-function modules load", () => {
  for (const path in fnMods) {
    it(`imports ${path}`, async () => {
      const mod = await fnMods[path]();
      expect(mod).toBeTruthy();
    });
  }
});

describe("lib modules load", () => {
  for (const path in libMods) {
    it(`imports ${path}`, async () => {
      const mod = await libMods[path]();
      expect(mod).toBeTruthy();
    });
  }
});

describe("critical flow exports exist", () => {
  it("login route exports Route", async () => {
    const mod: any = await import("../src/routes/login");
    expect(mod.Route).toBeDefined();
  });
  it("student (hours) route exports Route", async () => {
    const mod: any = await import("../src/routes/student");
    expect(mod.Route).toBeDefined();
  });
  it("reservation dialog component is exported", async () => {
    const mod: any = await import("../src/components/reservation-dialog");
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });
  it("custom reservation dialog is exported", async () => {
    const mod: any = await import("../src/components/custom-reservation-dialog");
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });
  it("auth hook exports useAuth + AuthProvider", async () => {
    const mod: any = await import("../src/hooks/use-auth");
    expect(mod.useAuth).toBeDefined();
    expect(mod.AuthProvider).toBeDefined();
  });
  it("error-log exports installGlobalErrorLogging + logSupabaseError", async () => {
    const mod: any = await import("../src/lib/error-log");
    expect(mod.installGlobalErrorLogging).toBeInstanceOf(Function);
    expect(mod.logSupabaseError).toBeInstanceOf(Function);
    expect(mod.logClientError).toBeInstanceOf(Function);
  });
});
