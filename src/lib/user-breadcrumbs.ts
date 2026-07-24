// Lightweight user-action breadcrumb trail + session replay.
// Rolling buffer of the last N interactions; attached to every error report so
// we can reproduce the click-path that led to a crash even when the student
// never opens the bug widget.
//
// Session replay: adds scroll/visibility/network-fail/viewport events with
// relative timestamps so the admin can watch the user's last ~60s before crash.

export type Breadcrumb = {
  t: number; // epoch ms
  kind: "click" | "nav" | "input" | "key" | "net" | "rage" | "custom" | "scroll" | "visibility" | "resize" | "fetch-fail";
  label: string;
  path?: string;
  extra?: Record<string, unknown>;
};

const MAX = 60;
const buf: Breadcrumb[] = [];

export function pushBreadcrumb(b: Omit<Breadcrumb, "t">) {
  buf.push({ t: Date.now(), ...b });
  if (buf.length > MAX) buf.splice(0, buf.length - MAX);
}

export function getBreadcrumbs(): Breadcrumb[] {
  return buf.slice();
}

/**
 * Session replay: returns breadcrumbs from the last `windowMs` ms with
 * relative timestamps (delta from oldest). Suitable for admin timeline UI.
 */
export function getSessionReplay(windowMs = 60_000): Array<Breadcrumb & { dt: number }> {
  const cutoff = Date.now() - windowMs;
  const recent = buf.filter((b) => b.t >= cutoff);
  if (recent.length === 0) return [];
  const t0 = recent[0].t;
  return recent.map((b) => ({ ...b, dt: b.t - t0 }));
}

export function clearBreadcrumbs() {
  buf.length = 0;
}

// ---- Rage click detection -----------------------------------------------
type RageState = { key: string; count: number; firstAt: number };
let rage: RageState | null = null;
const RAGE_WINDOW_MS = 1200;
const RAGE_THRESHOLD = 4;

function targetKey(el: Element | null): string {
  if (!el) return "unknown";
  const tag = el.tagName?.toLowerCase() ?? "?";
  const id = (el as HTMLElement).id ? `#${(el as HTMLElement).id}` : "";
  const cls =
    typeof (el as HTMLElement).className === "string"
      ? "." + (el as HTMLElement).className.split(/\s+/).slice(0, 2).join(".")
      : "";
  return `${tag}${id}${cls}`;
}

function targetLabel(el: Element | null): string {
  if (!el) return "";
  const aria = el.getAttribute?.("aria-label");
  if (aria) return aria;
  const txt = (el as HTMLElement).innerText?.trim().slice(0, 60);
  return txt || targetKey(el);
}

let installed = false;
export function installBreadcrumbs(onRage?: (info: { key: string; label: string; count: number }) => void) {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener(
    "click",
    (e) => {
      const el = e.target as Element | null;
      const key = targetKey(el);
      const label = targetLabel(el);
      pushBreadcrumb({
        kind: "click",
        label,
        extra: { key, x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY },
        path: location.pathname,
      });

      // Ignore rage-click detection inside dialogs / cookie banner / non-interactive text —
      // users often click through descriptive text and that's not a broken button.
      const insideDialog = !!el?.closest?.('[role="dialog"], [aria-modal="true"]');
      const isInteractive = !!el?.closest?.('button, a, [role="button"], input, select, textarea, label');
      if (insideDialog || !isInteractive) {
        rage = null;
        return;
      }

      const now = Date.now();
      if (rage && rage.key === key && now - rage.firstAt < RAGE_WINDOW_MS) {
        rage.count += 1;
        if (rage.count === RAGE_THRESHOLD) {
          pushBreadcrumb({ kind: "rage", label: `rage-click: ${label}`, path: location.pathname });
          try {
            onRage?.({ key, label, count: rage.count });
          } catch {
            /* ignore */
          }
        }
      } else {
        rage = { key, count: 1, firstAt: now };
      }
    },
    { capture: true, passive: true },
  );


  window.addEventListener(
    "focusin",
    (e) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      const tag = el.tagName?.toLowerCase();
      if (tag !== "input" && tag !== "textarea" && tag !== "select") return;
      const name = el.getAttribute("name") || el.getAttribute("placeholder") || el.id || tag;
      pushBreadcrumb({ kind: "input", label: `focus ${name}`, path: location.pathname });
    },
    { capture: true, passive: true },
  );

  // Scroll — throttled to once per 400ms; capture y%
  let scrollTimer: number | null = null;
  window.addEventListener(
    "scroll",
    () => {
      if (scrollTimer !== null) return;
      scrollTimer = window.setTimeout(() => {
        scrollTimer = null;
        const h = document.documentElement.scrollHeight - window.innerHeight;
        const pct = h > 0 ? Math.round((window.scrollY / h) * 100) : 0;
        pushBreadcrumb({ kind: "scroll", label: `scroll ${pct}%`, extra: { y: window.scrollY, pct } });
      }, 400);
    },
    { passive: true },
  );

  // Viewport resize
  let resizeTimer: number | null = null;
  window.addEventListener("resize", () => {
    if (resizeTimer !== null) window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      pushBreadcrumb({
        kind: "resize",
        label: `${window.innerWidth}×${window.innerHeight}`,
        extra: { w: window.innerWidth, h: window.innerHeight },
      });
    }, 300);
  });

  // Visibility change (tab away / back)
  document.addEventListener("visibilitychange", () => {
    pushBreadcrumb({
      kind: "visibility",
      label: document.hidden ? "hidden" : "visible",
    });
  });

  // Network failure interception (fetch)
  const origFetch = window.fetch.bind(window);
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const started = performance.now();
    try {
      const res = await origFetch(...args);
      if (!res.ok && res.status >= 500) {
        const url = typeof args[0] === "string" ? args[0] : (args[0] as Request).url;
        pushBreadcrumb({
          kind: "fetch-fail",
          label: `${res.status} ${new URL(url, location.href).pathname}`,
          extra: { status: res.status, ms: Math.round(performance.now() - started) },
        });
      }
      return res;
    } catch (err) {
      const url = typeof args[0] === "string" ? args[0] : (args[0] as Request).url;
      pushBreadcrumb({
        kind: "fetch-fail",
        label: `network err ${new URL(url, location.href).pathname}`,
        extra: { error: (err as Error).message?.slice(0, 100) },
      });
      throw err;
    }
  };

  let lastPath = location.pathname;
  const check = () => {
    if (location.pathname !== lastPath) {
      pushBreadcrumb({ kind: "nav", label: `${lastPath} → ${location.pathname}`, path: location.pathname });
      lastPath = location.pathname;
    }
  };
  window.addEventListener("popstate", check);
  const origPush = history.pushState;
  const origReplace = history.replaceState;
  history.pushState = function (...args: Parameters<typeof origPush>) {
    const r = origPush.apply(this, args);
    setTimeout(check, 0);
    return r;
  };
  history.replaceState = function (...args: Parameters<typeof origReplace>) {
    const r = origReplace.apply(this, args);
    setTimeout(check, 0);
    return r;
  };

  // ---- Silent bug detection ---------------------------------------------
  // A "silent bug" = user clicks a submit/action button, but nothing observable
  // happens: no URL change, no successful POST/PUT/PATCH within 3s. Common
  // symptoms: disabled handler, stale closure, invalid form silently rejected.
  // We log these as custom breadcrumbs so admins can spot broken CTAs even
  // when nothing throws.
  let netActivityAt = 0;
  const origFetch2 = window.fetch;
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const method = (args[1]?.method ?? (args[0] instanceof Request ? args[0].method : "GET")).toUpperCase();
    if (method !== "GET" && method !== "HEAD") netActivityAt = Date.now();
    return origFetch2(...args);
  };

  const isActionEl = (el: Element | null): boolean => {
    if (!el) return false;
    const tag = el.tagName?.toLowerCase();
    if (tag === "button") return true;
    const role = el.getAttribute("role");
    if (role === "button") return true;
    if (tag === "input" && (el as HTMLInputElement).type === "submit") return true;
    return false;
  };

  window.addEventListener(
    "click",
    (e) => {
      const el = e.target as Element | null;
      if (!isActionEl(el) && !isActionEl(el?.closest("button, [role=button]") ?? null)) return;
      const label = targetLabel(el);
      // Skip likely-nav buttons (hamburger, tab, back). Only track things
      // that look like actions.
      if (/close|menu|open|back|toggle|tab/i.test(label)) return;
      const startedAt = Date.now();
      const startPath = location.pathname;
      const startHash = location.hash;
      window.setTimeout(() => {
        const pathChanged = location.pathname !== startPath || location.hash !== startHash;
        const netSince = netActivityAt >= startedAt;
        // Look at recent breadcrumbs for toast/dialog/error signals
        const recentNoise = buf.slice(-8).some(
          (b) =>
            b.t >= startedAt &&
            (b.kind === "fetch-fail" ||
              /toast|dialog|modal|error|success/i.test(b.label ?? "")),
        );
        if (!pathChanged && !netSince && !recentNoise) {
          pushBreadcrumb({
            kind: "custom",
            label: `⚠️ silent-click: "${label}" (no nav, no POST, no toast)`,
            path: location.pathname,
            extra: { silent: true, waitedMs: 3000 },
          });
        }
      }, 3000);
    },
    { capture: true, passive: true },
  );
}
