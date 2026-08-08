import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig, type Plugin } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Nitro emits to `.output/`, but Lovable's post-build dist check (and some
// static hosts) expect a `dist/` folder. Mirror the built assets there.
function mirrorOutputToDist(): Plugin {
  return {
    name: "mirror-output-to-dist",
    apply: "build",
    closeBundle() {
      try {
        if (!existsSync(".output/public")) return;
        mkdirSync("dist", { recursive: true });
        cpSync(".output/public", "dist", { recursive: true });
      } catch {
        // never fail the build because of the mirror
      }
    },
  };
}


const SUPABASE_PROJECT_ID = "bacqlmhfokfnmoexijkj";
const SUPABASE_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co`;
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_JjZsJZZp5yP5NQBNVwCoaw_5iIQMN0_";

// Deploy tag — injected into every error report so we can tell exactly which
// build introduced a bug. Falls back to build timestamp when git is unavailable
// (e.g. inside the Lovable sandbox during preview).
let COMMIT_SHA = process.env.VERCEL_GIT_COMMIT_SHA || process.env.COMMIT_SHA || "";
try {
  if (!COMMIT_SHA) COMMIT_SHA = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
} catch { COMMIT_SHA = ""; }
if (!COMMIT_SHA) COMMIT_SHA = "dev-" + Date.now().toString(36).slice(-6);
const BUILD_TIME = new Date().toISOString();

process.env.SUPABASE_PROJECT_ID = SUPABASE_PROJECT_ID;
process.env.SUPABASE_URL = SUPABASE_URL;
process.env.SUPABASE_PUBLISHABLE_KEY = SUPABASE_PUBLISHABLE_KEY;
process.env.VITE_SUPABASE_PROJECT_ID = SUPABASE_PROJECT_ID;
process.env.VITE_SUPABASE_URL = SUPABASE_URL;
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = SUPABASE_PUBLISHABLE_KEY;

export default defineConfig({
  define: {
    "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(SUPABASE_PROJECT_ID),
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(SUPABASE_URL),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(SUPABASE_PUBLISHABLE_KEY),
    "import.meta.env.VITE_COMMIT_SHA": JSON.stringify(COMMIT_SHA),
    "import.meta.env.VITE_BUILD_TIME": JSON.stringify(BUILD_TIME),
  },
  build: {
    target: "esnext",
    minify: "esbuild",
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("recharts")) return "v-charts";
          if (id.includes("framer-motion")) return "v-motion";
          if (id.includes("three")) return "v-3d";
          if (id.includes("lucide-react")) return "v-icons";
          if (id.includes("@tanstack")) return "v-router";
          if (id.includes("supabase")) return "v-db";
          return null;
        },
      },
    },
  },
  plugins: [
    tanstackStart({
      server: { entry: "server" },
      serverFns: { disableCsrfMiddlewareWarning: true },
    }),
    tailwindcss(),
    tsconfigPaths(),
    nitro(),
    viteReact(),
    mirrorOutputToDist(),
  ],
});
