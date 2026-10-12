// Best-effort screenshot of what the user was looking at when an error hit.
// Runs only in the browser, is heavily throttled, size-capped and never throws.
// The result is a JPEG data URL stored in activity_log.meta.screenshot so the
// admin error dashboard can show the exact screen the user saw.

const MIN_INTERVAL_MS = 20_000; // never capture more often than this
const TIMEOUT_MS = 3_000;
const MAX_BYTES = 90_000; // keep the JSONB row small

let lastCapture = 0;
let inFlight: Promise<string | null> | null = null;

function tooBig(dataUrl: string) {
  return dataUrl.length * 0.75 > MAX_BYTES;
}

async function shrink(dataUrl: string, maxWidth: number, quality: number): Promise<string> {
  return await new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxWidth / (img.width || maxWidth));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round((img.width || maxWidth) * scale);
        canvas.height = Math.round((img.height || maxWidth) * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(dataUrl);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Capture the current viewport. Returns a JPEG data URL or null.
 * Safe to call from anywhere — swallows every failure.
 */
export async function captureScreenshot(opts: { force?: boolean } = {}): Promise<string | null> {
  if (typeof window === "undefined" || typeof document === "undefined") return null;
  if (document.visibilityState === "hidden") return null;
  const now = Date.now();
  if (!opts.force && now - lastCapture < MIN_INTERVAL_MS) return null;
  if (inFlight) return await inFlight;
  lastCapture = now;

  inFlight = (async () => {
    try {
      const { toJpeg } = await import("html-to-image");
      const node = document.body;
      const width = Math.min(window.innerWidth, 1280);
      const height = Math.min(window.innerHeight, 1600);

      const shot = await Promise.race([
        toJpeg(node, {
          quality: 0.62,
          backgroundColor: getComputedStyle(document.documentElement).getPropertyValue("--background").trim(),
          imagePlaceholder: "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=",
          cacheBust: false,
          // Cross-origin stylesheets throw on sheet.cssRules; font embedding
          // is what triggers that read, so skip it entirely.
          skipFonts: true,
          width,
          height,
          pixelRatio: 1,
          // Skip anything that can't be inlined (iframes, canvases w/ CORS, videos)
          filter: (el) => {
            const tag = (el as HTMLElement)?.tagName?.toLowerCase?.();
            if (tag === "iframe" || tag === "video" || tag === "script" || tag === "noscript") return false;
            if ((el as HTMLElement)?.dataset?.noScreenshot === "true") return false;
            return true;
          },
          style: { transform: "none" },
        }),
        new Promise<null>((r) => setTimeout(() => r(null), opts.force ? 10_000 : TIMEOUT_MS)),
      ]);

      if (!shot || typeof shot !== "string" || !shot.startsWith("data:image")) return null;

      let out = shot;
      if (tooBig(out)) out = await shrink(out, 900, 0.5);
      if (tooBig(out)) out = await shrink(out, 640, 0.42);
      if (tooBig(out)) return null;
      return out;
    } catch {
      return null;
    } finally {
      inFlight = null;
    }
  })();

  return await inFlight;
}

/** Convert a user-selected image to the same bounded JPEG used in reports. */
export async function prepareReportImage(file: File): Promise<string | null> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) return null;
  const url = URL.createObjectURL(file);
  try {
    let image = await shrink(url, 1280, 0.65);
    if (!image.startsWith("data:image/jpeg;base64,")) return null;
    if (tooBig(image)) image = await shrink(image, 900, 0.5);
    if (tooBig(image)) image = await shrink(image, 640, 0.42);
    return tooBig(image) ? null : image;
  } finally { URL.revokeObjectURL(url); }
}
