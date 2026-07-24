// Client-side error / Supabase-error monitor.
// - Logs prominently to console (grouped, red)
// - Persists to public.activity_log with action='client.error' or 'supabase.error'
// - CRITICAL patterns are escalated via server fn → auto-lockdown + admin email
import { supabase } from "@/integrations/supabase/client";

import { deviceMeta } from "@/lib/device-meta";
import { escalateAppError } from "@/lib/error-escalation.functions";
import { getBreadcrumbs, getSessionReplay } from "@/lib/user-breadcrumbs";
import { fingerprint as computeFingerprint } from "@/lib/error-fingerprint";
import { enqueue as enqueueOutbox, startOutbox } from "@/lib/error-outbox";

const IGNORE_SUBSTRINGS = [
  "ResizeObserver loop",
  "Non-Error promise rejection captured",
  "Failed to fetch dynamically imported module",
  "AbortError",
  "cancelled",
  "ERR_BLOCKED_BY_CLIENT",
  // React hydration mismatch warnings are noisy; they're not user-facing outages.
  "Minified React error #418",
  "hydrated but some attributes",
  // WebGL context creation/loss — decorative background only, we already fall back
  "THREE.WebGLRenderer",
  "WebGL context",
  "Web page caused context loss",
  "context lost",
  // Vite HMR transient messages
  "[vite] Failed to reload",
  "[vite]",
  // Manual test errors triggered from /admin/errors "Trigger test error" button
  "[TEST]",
  // Stale-deploy noise: browser cached old HTML → hashed bundle 404s and the
  // browser tries to parse the JSON body as JS. Handled by stale-deploy-guard
  // which force-reloads. Don't log or escalate — it's a cache miss, not a bug.
  "Unexpected token '{'",
  "Unexpected token '<'",
  "Minified React error #520",
  "Minified React error #418",
  "Loading chunk",
  "Loading CSS chunk",
  "ChunkLoadError",
  // Third-party CMP (cookie-script) — non-critical, may be blocked by adblock/DNS.
  "cookie-script.com",
  "cookie-consent",
  // React dev-only HMR warning fired when Fast Refresh reruns a component
  // whose useEffect deps array size changed between edits. Not a production bug.
  "changed size between renders",
  "The final argument passed to",

];


// Patterns that indicate a serious runtime failure worth auto-lockdown.
const CRITICAL_PATTERNS = [
  /ChunkLoadError/i,
  /Loading chunk \d+ failed/i,
  /Failed to load module script/i,
  /Cannot read propert(y|ies) of (undefined|null)/i,
  /is not a function/i,
  /Maximum call stack/i,
  /out of memory/i,
];

function isCriticalMessage(msg: string): boolean {
  return CRITICAL_PATTERNS.some((rx) => rx.test(msg));
}

// Escalate rate-limit (client-side, best-effort — server also dedupes)
const escalated = new Map<string, number>();
const ESCALATE_MS = 60_000;
async function maybeEscalate(level: "critical" | "warning", message: string, stack?: string | null) {
  try {
    const key = `${level}:${message.slice(0, 120)}`;
    const now = Date.now();
    const last = escalated.get(key);
    if (last && now - last < ESCALATE_MS) return;
    escalated.set(key, now);
    let userEmail: string | undefined;
    try {
      const { data } = await supabase.auth.getUser();
      userEmail = data.user?.email ?? undefined;
    } catch { /* ignore */ }
    await escalateAppError({
      data: {
        level,
        message: message.slice(0, 500),
        stack: stack ? stack.slice(0, 2000) : undefined,
        path: typeof window !== "undefined" ? window.location.pathname : undefined,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        userEmail,
      },
    });
  } catch {
    /* never crash reporting */
  }
}

// Ring buffer + dedupe to avoid flooding the DB
const seen = new Map<string, number>();
const DEDUPE_MS = 30_000;

type ErrPayload = {
  message: string;
  stack?: string | null;
  source?: string;
  path?: string;
  extra?: Record<string, unknown>;
};

function shouldIgnore(msg: string) {
  return IGNORE_SUBSTRINGS.some((s) => msg.includes(s));
}

async function insert(action: "client.error" | "supabase.error", payload: ErrPayload) {
  const dev = deviceMeta();
  const key = `${action}:${payload.message.slice(0, 120)}`;
  const now = Date.now();
  const last = seen.get(key);
  if (last && now - last < DEDUPE_MS) return;
  seen.set(key, now);

  let uid: string | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    uid = data.user?.id ?? null;
  } catch { /* offline / no session */ }

  const fp = computeFingerprint(payload.message, payload.stack ?? null);
  const row = {
    user_id: uid,
    action,
    meta: {
      message: payload.message.slice(0, 500),
      stack: (payload.stack ?? "").slice(0, 2000),
      source: payload.source ?? "runtime",
      path: payload.path ?? (typeof window !== "undefined" ? window.location.pathname : ""),
      extra: payload.extra ?? {},
      breadcrumbs: getBreadcrumbs().slice(-15),
      replay: getSessionReplay(60_000).slice(-40),
      fingerprint: fp.id,
      fingerprint_norm: fp.norm,
      fingerprint_frame: fp.frame,
      ...dev,
    },
  };

  try {
    const { error } = await supabase.from("activity_log").insert(row as any);
    if (error) throw error;
  } catch {
    // Primary insert failed (offline / RLS / auth). Queue for retry
    // + beacon on tab close so the report ALWAYS reaches admin.
    try { enqueueOutbox(row); } catch { /* ignore */ }
  }
  // Escalate: critical → auto-lockdown + email; otherwise send warning email (server dedupes).
  const level: "critical" | "warning" = isCriticalMessage(payload.message) ? "critical" : "warning";
  void maybeEscalate(level, payload.message, payload.stack ?? null);
}


/** Public helper: wrap a Supabase call, log its `error` field if any. */
export async function logSupabaseError(
  op: string,
  result: { error: { message: string; details?: string; code?: string } | null },
) {
  if (!result?.error) return;
  const err = result.error;
  const msg = `[supabase:${op}] ${err.message}${err.code ? " (" + err.code + ")" : ""}`;
  // eslint-disable-next-line no-console
  console.error("%c[Supabase error]", "color:#f43f5e;font-weight:bold", op, err);
  if (shouldIgnore(msg)) return;
  await insert("supabase.error", {
    message: msg,
    stack: err.details ?? null,
    source: op,
  });
}

/** Public helper: log an arbitrary runtime/analytics error. */
export async function logClientError(
  err: unknown,
  opts: { source?: string; extra?: Record<string, unknown> } = {},
) {
  const message = err instanceof Error ? err.message : String(err ?? "unknown");
  const stack = err instanceof Error ? err.stack : null;
  // eslint-disable-next-line no-console
  console.error("%c[Client error]", "color:#f43f5e;font-weight:bold", opts.source ?? "manual", err);
  if (shouldIgnore(message)) return;
  await insert("client.error", { message, stack, source: opts.source, extra: opts.extra });
}

let installed = false;
export function installGlobalErrorLogging() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (e) => {
    const msg = e.message || (e.error instanceof Error ? e.error.message : "unknown");
    if (shouldIgnore(msg)) return;
    void insert("client.error", {
      message: msg,
      stack: e.error instanceof Error ? e.error.stack : null,
      source: "window.error",
      extra: { filename: e.filename, lineno: e.lineno, colno: e.colno },
    });
  });

  window.addEventListener("unhandledrejection", (e) => {
    const reason = e.reason as unknown;
    const msg = reason instanceof Error ? reason.message : String(reason ?? "unhandled rejection");
    if (shouldIgnore(msg)) return;
    void insert("client.error", {
      message: msg,
      stack: reason instanceof Error ? reason.stack : null,
      source: "unhandledrejection",
    });
  });

  // Console.error tap — copies to activity_log without breaking dev console output
  const origErr = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    origErr(...args);
    try {
      const first = args.find((a) => a instanceof Error) as Error | undefined;
      const msg = first ? first.message : args.map((a) => (typeof a === "string" ? a : "")).join(" ").trim();
      if (!msg || shouldIgnore(msg)) return;
      // Skip our own tag to avoid recursion
      if (typeof args[0] === "string" && args[0].startsWith("%c[")) return;
      void insert("client.error", {
        message: msg.slice(0, 300),
        stack: first?.stack ?? null,
        source: "console.error",
      });
    } catch {
      /* ignore */
    }
  };

  // Resource load failures (script/img/css 404 or CORS block) — capture phase,
  // because these events don't bubble. Filters preview-only noise (HMR ping).
  window.addEventListener("error", (e) => {
    const target = e.target as (HTMLElement & { src?: string; href?: string }) | null;
    if (!target || target === window as unknown as HTMLElement) return;
    const tag = target.tagName?.toLowerCase?.();
    if (!tag || !["img", "script", "link", "video", "audio", "source"].includes(tag)) return;
    const url = target.src || target.href || "";
    if (!url || url.startsWith("data:") || url.includes("vite/client")) return;
    // Stale-deploy: an old client is asking for a hashed JS/CSS chunk that no
    // longer exists after redeploy (e.g. `/assets/admin.reservations-Cx-qr5XY.js`).
    // stale-deploy-guard force-reloads to fix it — no need to escalate as a bug.
    if (/\/assets\/[^/]+-[A-Za-z0-9_-]{6,}\.(js|css|mjs)(\?|$)/.test(url)) return;
    void insert("client.error", {
      message: `[resource] ${tag} failed: ${url.slice(0, 200)}`,
      source: "resource.error",
      extra: { tag, url: url.slice(0, 500) },
    });
  }, true);

  // Fetch interception — logs network failures + 5xx responses so backend
  // outages surface even when the calling code silently ignores errors.
  if (typeof window.fetch === "function") {
    const origFetch = window.fetch.bind(window);
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const url = typeof args[0] === "string" ? args[0] : (args[0] as Request).url ?? "";
      try {
        const res = await origFetch(...args);
        if (res.status >= 500 && !url.includes("/api/public/error-beacon")) {
          void insert("client.error", {
            message: `[fetch ${res.status}] ${url.slice(0, 200)}`,
            source: "fetch.5xx",
            extra: { status: res.status, url: url.slice(0, 500) },
          });
        }
        return res;
      } catch (err) {
        // Network failure (offline, DNS, CORS preflight). Skip beacon endpoint
        // to avoid recursion, and abort signals which are usually user-driven.
        const msg = err instanceof Error ? err.message : String(err);
        if (!url.includes("/api/public/error-beacon") && !/abort/i.test(msg)) {
          void insert("client.error", {
            message: `[fetch:network] ${msg} → ${url.slice(0, 200)}`,
            stack: err instanceof Error ? err.stack : null,
            source: "fetch.network",
            extra: { url: url.slice(0, 500) },
          });
        }
        throw err;
      }
    };
  }

  // Start the retry loop + beacon-on-unload flush
  startOutbox();
}

