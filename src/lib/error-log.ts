// Client-side error / Supabase-error monitor.
// - Logs prominently to console (grouped, red)
// - Persists to public.activity_log with action='client.error' or 'supabase.error'
// - CRITICAL patterns are escalated via server fn → auto-lockdown + admin email
import { supabase } from "@/integrations/supabase/client";
import { insertActivityLogRow } from "@/lib/activity-log";
import { deviceMeta } from "@/lib/device-meta";
import { escalateAppError } from "@/lib/error-escalation.functions";

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
  try {
    const dev = deviceMeta();
    const key = `${action}:${payload.message.slice(0, 120)}`;
    const now = Date.now();
    const last = seen.get(key);
    if (last && now - last < DEDUPE_MS) return;
    seen.set(key, now);

    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id ?? null;

    await insertActivityLogRow({
      user_id: uid,
      action,
      entity_type: payload.source ?? null,
      meta: {
        message: payload.message.slice(0, 500),
        stack: (payload.stack ?? "").slice(0, 2000),
        source: payload.source ?? "runtime",
        path: payload.path ?? (typeof window !== "undefined" ? window.location.pathname : ""),
        extra: payload.extra ?? {},
        ...dev,
      },
    });
    // Escalate: critical → auto-lockdown + email; otherwise send warning email (server dedupes).
    const level: "critical" | "warning" = isCriticalMessage(payload.message) ? "critical" : "warning";
    void maybeEscalate(level, payload.message, payload.stack ?? null);
  } catch {
    // swallow — never crash reporting the report
  }
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
}
