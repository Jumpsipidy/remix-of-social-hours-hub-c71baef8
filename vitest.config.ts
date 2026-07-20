import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts"],
    // Modules touch browser globals at import; stub them.
    setupFiles: ["./tests/setup.ts"],
  },
});
