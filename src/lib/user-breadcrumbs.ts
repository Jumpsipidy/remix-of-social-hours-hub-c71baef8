// Lightweight user-action breadcrumb trail.
// Rolling buffer of the last N interactions; attached to every error report so
// we can reproduce the click-path that led to a crash even when the student
// never opens the bug widget.

export type Breadcrumb = {
  t: number; // epoch ms
  kind: "click" | "nav" | "input" | "key" | "net" | "rage" | "custom";
  label: string;
  path?: string;
  extra?: Record<string, unknown>;
};

const MAX = 25;
const buf: Breadcrumb[] = [];

export function pushBreadcrumb(b: Omit<Breadcrumb, "t">) {
  buf.push({ t: Date.now(), ...b });
  if (buf.length > MAX) buf.splice(0, buf.length - MAX);
}

export function getBreadcrumbs(): Breadcrumb[] {
  return buf.slice();
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
      pushBreadcrumb({ kind: "click", label, extra: { key }, path: location.pathname });

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
}
