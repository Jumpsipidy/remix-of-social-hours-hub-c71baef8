// Minimal browser-ish shims so route/component modules can be imported in Node.
import { vi } from "vitest";

// jsdom is heavy — provide the tiny surface our modules touch at import time.
(globalThis as any).window ??= globalThis;
(globalThis as any).document ??= {
  documentElement: { classList: { add() {}, remove() {} } },
  addEventListener() {},
  removeEventListener() {},
  createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }),
};
(globalThis as any).navigator ??= { userAgent: "node-test", language: "lt-LT" };
(globalThis as any).localStorage ??= {
  getItem: () => null,
  setItem() {},
  removeItem() {},
};
(globalThis as any).sessionStorage ??= (globalThis as any).localStorage;
(globalThis as any).matchMedia ??= () => ({
  matches: false, addEventListener() {}, removeEventListener() {},
});

// Silence expected console noise from module-scope logs during import
vi.spyOn(console, "warn").mockImplementation(() => {});
