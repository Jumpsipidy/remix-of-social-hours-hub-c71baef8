// Stale-deploy guard.
//
// Symptom: after a redeploy, browsers holding old HTML try to load an asset
// bundle whose hashed filename no longer exists on the CDN. The 404 response
// body starts with "{" (JSON), the browser tries to execute it as a module,
// and we see `SyntaxError: Unexpected token '{'` + React #520 hydration crash.
//
// Fix: detect that specific failure mode and hard-reload the page once with
// cache-busting. A sessionStorage flag prevents reload loops.

const RELOAD_FLAG = "__stale_deploy_reloaded_at";
const RELOAD_COOLDOWN_MS = 30_000;

export function looksLikeStaleAsset(msg: string, filename?: string): boolean {
  const m = String(msg || "");
  if (/Failed to fetch dynamically imported module/i.test(m)) return true;
  if (/Loading (chunk|CSS chunk|module) .+ failed/i.test(m)) return true;
  if (/ChunkLoadError/i.test(m)) return true;
  if (/error loading dynamically imported/i.test(m)) return true;
  // The killer signal: JS parser choked on a JSON 404 body served from /assets/*.
  if (/Unexpected token '\{'/i.test(m) || /Unexpected token '<'/i.test(m)) {
    if (filename && /\/assets\//.test(filename)) return true;
    // Even without filename: if we can see a script from /assets/ in the stack,
    // treat it as stale. Browsers vary in how they surface this.
    return true;
  }
  return false;
}

export function reloadOnce() {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_FLAG) || "0");
    if (Date.now() - last < RELOAD_COOLDOWN_MS) return;
    sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
  } catch { /* ignore */ }
  const url = new URL(window.location.href);
  url.searchParams.set("_v", Date.now().toString(36));
  window.location.replace(url.toString());
}

// A <link rel="stylesheet"> or <script> that 404s does NOT produce an error
// message — it fires a resource error event whose target is the element.
// Without this, a stale CSS reference leaves the page completely unstyled.
function isStaleResourceElement(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  const tag = el.tagName.toUpperCase();
  if (tag === "LINK") {
    const link = el as HTMLLinkElement;
    if (!/stylesheet/i.test(link.rel || "")) return false;
    return /\/assets\/|\/_build\/|\.css(\?|$)/.test(link.href || "");
  }
  if (tag === "SCRIPT") {
    return /\/assets\//.test((el as HTMLScriptElement).src || "");
  }
  return false;
}

let installed = false;
export function installStaleDeployGuard() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener(
    "error",
    (e) => {
      if (e.target && e.target !== window) {
        if (isStaleResourceElement(e.target)) reloadOnce();
        return;
      }
      if (looksLikeStaleAsset(e.message, e.filename)) reloadOnce();
    },
    true,
  );


  // Vite fires this when a lazy route chunk is missing after a new deploy.
  window.addEventListener("vite:preloadError", (e) => {
    e.preventDefault();
    reloadOnce();
  });

  window.addEventListener("unhandledrejection", (e) => {
    const r = e.reason as unknown;
    const msg = r instanceof Error ? r.message : String(r ?? "");
    if (looksLikeStaleAsset(msg)) reloadOnce();
  });
}
