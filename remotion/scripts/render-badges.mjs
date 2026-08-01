/** Renders one 1080x1080 MP4 per achievement / streak milestone. */
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, openBrowser } from "@remotion/renderer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";


const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BADGES = JSON.parse(fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src/badges.json"), "utf8"));
const outDir = path.resolve(__dirname, "../out/badges");
fs.mkdirSync(outDir, { recursive: true });

const only = process.argv.slice(2);
const list = only.length ? BADGES.filter((b) => only.includes(b.key)) : BADGES;

const bundled = await bundle({ entryPoint: path.resolve(__dirname, "../src/index.ts"), webpackOverride: (c) => c });

const browser = await openBrowser("chrome", {
  browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/bin/chromium",
  chromiumOptions: { args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] },
  chromeMode: "chrome-for-testing",
});

for (const badge of list) {
  const outputLocation = path.join(outDir, `${badge.key}.mp4`);
  if (fs.existsSync(outputLocation) && !only.length) {
    console.log("skip (exists)", badge.key);
    continue;
  }
  const composition = await selectComposition({
    serveUrl: bundled,
    id: "badge",
    puppeteerInstance: browser,
    inputProps: { badge },
  });
  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: "h264",
    crf: 18,
    inputProps: { badge },
    outputLocation,
    puppeteerInstance: browser,
    muted: true,
    concurrency: 2,
  });
  console.log("rendered", badge.key);
}

await browser.close({ silent: false });
console.log("all done", list.length);
