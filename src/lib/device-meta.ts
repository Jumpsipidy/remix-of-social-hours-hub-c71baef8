/**
 * Lightweight device / session fingerprint for analytics.
 * All values derived from browser APIs; no external calls, no PII beyond UA.
 */

const SID_KEY = "sv_session_id";
const VID_KEY = "sv_visitor_id";

export function sessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    const cur = sessionStorage.getItem(SID_KEY);
    if (cur) return cur;
    const id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(SID_KEY, id);
    return id;
  } catch {
    return "ephemeral";
  }
}

/**
 * Persistent per-device/browser visitor id (localStorage). Survives across
 * tabs, sessions and reloads — used to deduplicate "who clicked on my site"
 * so the same person from the same browser is counted once.
 */
export function visitorId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    const cur = localStorage.getItem(VID_KEY);
    if (cur) return cur;
    const id = `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
    localStorage.setItem(VID_KEY, id);
    return id;
  } catch {
    return "ephemeral";
  }
}


function parseUA(ua: string): { device: string; browser: string; os: string } {
  const u = ua.toLowerCase();
  let device = "desktop";
  if (/ipad|tablet|playbook|silk|(android(?!.*mobi))/i.test(ua)) device = "tablet";
  else if (/mobi|iphone|ipod|blackberry|windows phone/i.test(ua)) device = "mobile";

  let browser = "other";
  if (u.includes("edg/")) browser = "Edge";
  else if (u.includes("opr/") || u.includes("opera")) browser = "Opera";
  else if (u.includes("firefox")) browser = "Firefox";
  else if (u.includes("chrome") && !u.includes("edg")) browser = "Chrome";
  else if (u.includes("safari") && !u.includes("chrome")) browser = "Safari";

  let os = "other";
  if (u.includes("windows")) os = "Windows";
  else if (u.includes("mac os") || u.includes("macintosh")) os = "macOS";
  else if (u.includes("android")) os = "Android";
  else if (u.includes("iphone") || u.includes("ipad") || u.includes("ios")) os = "iOS";
  else if (u.includes("linux")) os = "Linux";

  return { device, browser, os };
}

export function deviceMeta(extra?: Record<string, unknown>): Record<string, unknown> {
  if (typeof window === "undefined") return { ...extra };
  const ua = navigator.userAgent || "";
  const { device, browser, os } = parseUA(ua);
  let ref_host = "";
  try {
    if (document.referrer) {
      const u = new URL(document.referrer);
      if (u.host !== window.location.host) ref_host = u.host;
    }
  } catch { /* noop */ }

  // Mobile-specific enrichment: PWA standalone, orientation, connection, touch
  type NetInfo = { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean };
  const nav = navigator as Navigator & {
    connection?: NetInfo;
    mozConnection?: NetInfo;
    webkitConnection?: NetInfo;
    deviceMemory?: number;
    maxTouchPoints?: number;
  };
  const conn: NetInfo | undefined = nav.connection || nav.mozConnection || nav.webkitConnection;
  const isStandalone =
    (typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches) ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  let orientation = "";
  try {
    orientation = (screen.orientation?.type) || (window.innerWidth > window.innerHeight ? "landscape" : "portrait");
  } catch { /* noop */ }

  return {
    session_id: sessionId(),
    visitor_id: visitorId(),
    ua: ua.slice(0, 220),
    device,
    browser,
    os,
    lang: (navigator.language || "").slice(0, 12),
    screen: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
    vp: `${window.innerWidth}x${window.innerHeight}`,
    dpr: window.devicePixelRatio || 1,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    ref_host,
    // Mobile context
    orientation,
    touch_points: nav.maxTouchPoints ?? 0,
    standalone: isStandalone,
    online: navigator.onLine,
    net_type: conn?.effectiveType || "",
    net_downlink: conn?.downlink ?? null,
    net_rtt: conn?.rtt ?? null,
    save_data: conn?.saveData ?? false,
    device_memory: nav.deviceMemory ?? null,
    // Deploy tag — set at build time from vite.config.ts. Lets Error Center
    // tie a bug to the exact commit / build that introduced it.
    commit_sha: (import.meta as { env?: { VITE_COMMIT_SHA?: string } }).env?.VITE_COMMIT_SHA || "unknown",
    build_time: (import.meta as { env?: { VITE_BUILD_TIME?: string } }).env?.VITE_BUILD_TIME || "",
    ...extra,
  };
}
