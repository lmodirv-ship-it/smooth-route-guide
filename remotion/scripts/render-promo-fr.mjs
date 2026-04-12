import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, openBrowser } from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log("Bundling promo-fr...");
const bundled = await bundle({
  entryPoint: path.resolve(__dirname, "../src/index-promo-fr.ts"),
  webpackOverride: (config) => config,
});

console.log("Opening browser...");
const browser = await openBrowser("chrome", {
  browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/bin/chromium",
  chromiumOptions: { args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] },
  chromeMode: "chrome-for-testing",
});

const composition = await selectComposition({
  serveUrl: bundled,
  id: "promo-fr",
  puppeteerInstance: browser,
});

console.log("Rendering 30s promo video...");
await renderMedia({
  composition,
  serveUrl: bundled,
  codec: "h264",
  outputLocation: "/mnt/documents/hn-driver-promo-fr.mp4",
  puppeteerInstance: browser,
  muted: true,
  concurrency: 1,
});

console.log("Done: /mnt/documents/hn-driver-promo-fr.mp4");
await browser.close({ silent: false });
