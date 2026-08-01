/** Render preview stills for badge variants: bun scripts/badge-stills.mjs key:frame ... */
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition, openBrowser } from "@remotion/renderer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BADGES = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../src/badges.json"), "utf8"));
const outDir = "/tmp/badge-stills";
fs.mkdirSync(outDir, { recursive: true });

const bundled = await bundle({ entryPoint: path.resolve(__dirname, "../src/index.ts"), webpackOverride: (c) => c });
const browser = await openBrowser("chrome", {
  browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/bin/chromium",
  chromiumOptions: { args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] },
  chromeMode: "chrome-for-testing",
});

for (const arg of process.argv.slice(2)) {
  const [key, f] = arg.split(":");
  const badge = BADGES.find((b) => b.key === key);
  if (!badge) throw new Error("no badge " + key);
  const composition = await selectComposition({ serveUrl: bundled, id: "badge", puppeteerInstance: browser, inputProps: { badge } });
  const out = path.join(outDir, `${key}-${f}.png`);
  await renderStill({ composition, serveUrl: bundled, output: out, frame: parseInt(f, 10), inputProps: { badge }, puppeteerInstance: browser, overwrite: true });
  console.log("wrote", out);
}
await browser.close({ silent: false });
