/**
 * Client-side automation / headless browser heuristics. Returns a score and
 * the reasons. A score >= BOT_THRESHOLD triggers the "ar jūs ne robotas" gate.
 */
export const BOT_THRESHOLD = 3;

export function collectBotSignals(): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  const add = (w: number, r: string) => { score += w; reasons.push(r); };
  try {
    const nav = navigator as Navigator & { webdriver?: boolean; userAgentData?: { brands?: { brand: string }[] } };
    const ua = nav.userAgent || "";
    if (nav.webdriver) add(3, "webdriver");
    if (/HeadlessChrome|PhantomJS|Puppeteer|Playwright|Selenium|python-requests|curl|wget|bot|crawler|spider/i.test(ua) && !/Googlebot|bingbot|DuckDuckBot|YandexBot/i.test(ua)) add(3, "ua");
    if (!nav.languages || nav.languages.length === 0) add(1, "no_languages");
    if (window.outerWidth === 0 || window.outerHeight === 0) add(2, "zero_window");
    const isChromeUA = /Chrome\//.test(ua) && !/Edg\/|OPR\//.test(ua);
    if (isChromeUA && !(window as any).chrome) add(1, "no_chrome_obj");
    if (isChromeUA && !/Mobile|Android/.test(ua) && nav.plugins && nav.plugins.length === 0) add(1, "no_plugins");
    if ((nav.hardwareConcurrency ?? 4) <= 1) add(1, "single_core");
    if (screen.width < 200 || screen.height < 200) add(1, "tiny_screen");
    if ((window as any).callPhantom || (window as any)._phantom || (window as any).__nightmare || (window as any).domAutomation) add(3, "automation_globals");
    if (document.documentElement.getAttribute("webdriver") != null) add(3, "webdriver_attr");
    if (Object.keys(window).some((k) => /^(cdc_|\$cdc_|__webdriver|__selenium|__fxdriver|__playwright|__pw)/.test(k))) add(3, "driver_leftovers");
    const mobileUA = /Mobile|Android|iPhone|iPad/.test(ua);
    if (mobileUA && !("ontouchstart" in window) && (nav.maxTouchPoints ?? 0) === 0) add(2, "fake_mobile");
    if (nav.language && nav.languages?.length && !nav.languages.includes(nav.language)) add(1, "language_mismatch");
    if (!mobileUA && window.outerHeight > 0 && window.outerHeight === window.innerHeight && window.outerWidth === window.innerWidth) add(1, "no_browser_chrome");
    try {
      const gl = document.createElement("canvas").getContext("webgl") as WebGLRenderingContext | null;
      if (!gl) add(1, "no_webgl");
      else {
        const ext = gl.getExtension("WEBGL_debug_renderer_info");
        const r = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "";
        if (/SwiftShader|llvmpipe|softpipe|Mesa OffScreen/i.test(r)) add(2, "software_gpu");
      }
    } catch { /* ignore */ }
    const fnStr = Function.prototype.toString.call(navigator.permissions?.query ?? (() => {}));
    if (typeof navigator.permissions?.query === "function" && !/\[native code\]/.test(fnStr)) add(2, "tampered_api");
  } catch {
    add(1, "probe_error");
  }
  return { score, reasons };
}

/** Human-readable (LT) explanations shown on the verification screen. */
export const REASON_LABELS: Record<string, string> = {
  webdriver: "Naršyklė praneša, kad ją valdo automatizavimo įrankis",
  ua: "Naršyklės pavadinimas atitinka robotų ar skriptų įrankius",
  no_languages: "Naršyklė nenurodo jokios kalbos",
  zero_window: "Langas neturi matmenų (veikia nematomai)",
  no_chrome_obj: "Chrome naršyklė neturi įprastų savo dalių",
  no_plugins: "Kompiuterio naršyklėje nėra jokių įskiepių",
  single_core: "Įrenginys rodo tik vieną procesoriaus branduolį",
  tiny_screen: "Neįprastai mažas ekranas",
  automation_globals: "Puslapyje rasta automatizavimo įrankių pėdsakų",
  webdriver_attr: "Puslapyje rasta valdymo įrankio žymė",
  driver_leftovers: "Rasta Selenium / Playwright tvarkyklės likučių",
  fake_mobile: "Teigia esąs telefonas, bet neturi jutiklinio ekrano",
  language_mismatch: "Naršyklės kalbų nustatymai prieštarauja vienas kitam",
  no_browser_chrome: "Langas be adreso juostos ir mygtukų",
  no_webgl: "Neveikia grafikos (WebGL) palaikymas",
  software_gpu: "Grafika piešiama programiškai — būdinga serverių naršyklėms",
  tampered_api: "Pakeistos naršyklės sistemos funkcijos",
  probe_error: "Naršyklė blokavo įprastą patikrą",
  referrer: "Atėjote iš įtartinos svetainės",
  deeplink: "Tiesiogiai atidarytas jautrus puslapio adresas",
  params: "Adrese rasta įsilaužimo bandymą primenančio teksto",
  "manual-test": "Bandomoji patikra (?patikra=testas)",
  srv_no_ua: "Serveris negavo naršyklės pavadinimo",
  srv_automation_ua: "Serveris atpažino skripto ar roboto užklausą",
  srv_no_language: "Užklausoje nėra kalbos antraštės",
  srv_ua_mismatch: "Naršyklės antraštės prieštarauja jos pavadinimui",
  bad_signature: "Patikros raktas suklastotas arba iš kito įrenginio",
  expired: "Patikra užtruko per ilgai",
  too_fast: "Atsakyta greičiau, nei gali žmogus",
  bad_pow: "Įrenginys neatliko skaičiavimo užduoties",
  synthetic_event: "Paspaudimas sugeneruotas programiškai",
  short_hold: "Mygtukas laikytas per trumpai",
  wrong_order: "Paveikslėliai paspausti ne ta tvarka",
  tap_too_fast: "Paveikslėliai paspausti per greitai (ne žmogaus greičiu)",
  no_motion: "Laikydamas mygtuką šiek tiek pajudink pelę arba naudok tarpo klavišą",
  invalid_motion: "Judesio duomenys neatitiko laikymo laiko. Pradėk patikrą iš naujo",
  robotic_timing: "Judesiai per tolygūs, kaip mašinos",
};

export const reasonLabel = (r: string) => REASON_LABELS[r.replace(/^bot:/, "")] ?? r;

/** Proof-of-work: find n such that sha256(nonce:n) starts with `difficulty` zeros. */
export async function solvePow(nonce: string, difficulty: number): Promise<number> {
  const target = "0".repeat(difficulty);
  const enc = new TextEncoder();
  for (let n = 0; n < 5_000_000; n++) {
    const d = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(`${nonce}:${n}`)));
    let hex = "";
    for (let i = 0; i < Math.ceil(difficulty / 2); i++) hex += d[i].toString(16).padStart(2, "0");
    if (hex.startsWith(target)) return n;
  }
  throw new Error("pow_failed");
}

export function motionFeatures(points: { x: number; y: number; t: number }[]) {
  let jitter = 0;
  const dts = new Set<number>();
  for (let i = 1; i < points.length; i++) {
    jitter += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    dts.add(Math.round(points[i].t - points[i - 1].t));
  }
  return { jitter, distinctIntervals: dts.size, points: points.length };
}

/** Very rough "is this human motion" check for the press-and-hold challenge. */
export function humanMotionScore(points: { x: number; y: number; t: number }[]): number {
  if (points.length < 4) return 0;
  let jitter = 0;
  const dts = new Set<number>();
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    jitter += Math.hypot(dx, dy);
    dts.add(Math.round(points[i].t - points[i - 1].t));
  }
  // Humans produce some movement and irregular timing.
  return (jitter > 2 ? 1 : 0) + (dts.size > 2 ? 1 : 0);
}
