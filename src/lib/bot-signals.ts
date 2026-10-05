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
  } catch {
    add(1, "probe_error");
  }
  return { score, reasons };
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
