// Error fingerprinting — group „the same" errors together like Sentry.
//
// A fingerprint is a short stable key derived from the error's message and
// the top of its stack trace, with volatile parts (numbers, hashes, UUIDs,
// URLs, quoted strings) removed. Two errors with the same fingerprint are
// considered the same „issue" even if their exact text differs.

const UUID_RX = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const HEX_RX = /\b0x[0-9a-f]+\b|\b[0-9a-f]{16,}\b/gi;
const NUM_RX = /\b\d{2,}\b/g;
const URL_RX = /https?:\/\/[^\s"')]+/g;
const QUOTED_RX = /(['"`])(?:\\.|(?!\1).)*\1/g;
const WS_RX = /\s+/g;

function telemetrySignature(message: string): string | null {
  const msg = message.toLowerCase();
  if (msg.includes("[ui užšalo") || msg.includes("pagrindinė gija užblokuota")) {
    return "telemetry:ui-freeze";
  }
  if (msg.includes("[lėtas api")) {
    const method = message.match(/\]\s+(GET|POST|PUT|PATCH|DELETE)\s+/i)?.[1]?.toUpperCase() ?? "REQUEST";
    const path = message.match(/\]\s+(?:GET|POST|PUT|PATCH|DELETE)\s+([^\s]+)/i)?.[1] ?? "app-api";
    const normalizedPath = path
      .replace(/\?.*$/, "")
      .replace(UUID_RX, "<uuid>")
      .replace(NUM_RX, "<n>")
      .slice(0, 120);
    return `telemetry:slow-api:${method}:${normalizedPath}`;
  }
  if (msg.includes("[ryšys dingo")) return "telemetry:offline-drop";
  return null;
}

export function normalizeMessage(raw: string | undefined | null): string {
  if (!raw) return "(no message)";
  const text = String(raw);
  const telemetry = telemetrySignature(text);
  if (telemetry) return telemetry;
  return text
    .replace(URL_RX, "<url>")
    .replace(UUID_RX, "<uuid>")
    .replace(HEX_RX, "<hex>")
    .replace(QUOTED_RX, "<str>")
    .replace(NUM_RX, "<n>")
    .replace(WS_RX, " ")
    .trim()
    .slice(0, 240);
}

/** Pull the first meaningful stack frame (function@file:line, without column). */
export function firstFrame(stack: string | undefined | null): string {
  if (!stack) return "";
  const lines = String(stack).split("\n").map((l) => l.trim()).filter(Boolean);
  // Skip the first "Error: message" header line, take first "at ..." frame
  const frame = lines.find((l) => /^(at\s|.*@)/i.test(l)) ?? lines[1] ?? "";
  return frame
    .replace(URL_RX, "<url>")
    .replace(/:\d+:\d+\)?$/g, "") // strip :line:col
    .replace(/\?[^\s)]+/g, "") // strip query strings on chunk urls
    .slice(0, 160);
}

/** Tiny non-crypto 32-bit hash — cheap, stable, base36 for compact display. */
function hash32(input: string): string {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36).padStart(7, "0");
}

export type Fingerprint = {
  /** 7-char stable id, e.g. "a3f2c19" */
  id: string;
  /** Normalized message used to compute the id */
  norm: string;
  /** First stack frame used to compute the id */
  frame: string;
};

export function fingerprint(message: string | undefined | null, stack?: string | null): Fingerprint {
  const norm = normalizeMessage(message);
  const frame = norm.startsWith("telemetry:") ? "" : firstFrame(stack ?? "");
  const id = hash32(`${norm}|${frame}`);
  return { id, norm, frame };
}

export function isTelemetryFingerprint(message: string | undefined | null): boolean {
  return normalizeMessage(message).startsWith("telemetry:");
}

/**
 * Route impact weight — errors on flows where a real user is physically waiting
 * (check-in, reserve, student dashboard) are more urgent than errors on legal
 * or marketing pages. Multiplier applied on top of raw count.
 */
export function routeWeight(path: string | undefined | null): number {
  if (!path) return 1;
  const p = path.toLowerCase();
  if (p.startsWith("/checkin") || p.startsWith("/organization/scan")) return 3.0; // student in front of org
  if (p.startsWith("/verify")) return 2.5; // certificate verification
  if (p.startsWith("/student") || p.startsWith("/tasks") || p.startsWith("/school")) return 2.0;
  if (p.startsWith("/organization") || p.startsWith("/admin")) return 1.6;
  if (p.startsWith("/login") || p.startsWith("/register") || p.startsWith("/auth")) return 1.8;
  if (p.startsWith("/privacy") || p.startsWith("/terms") || p.startsWith("/blog")) return 0.6;
  return 1;
}

/** Severity heuristic 0-100 for a group; higher = worse. */
export function severityScore(input: {
  count: number;
  users: number;
  paths: number;
  criticalCount: number;
  lastSeenMs: number;
  /** Max route weight across affected paths (see routeWeight). */
  maxRouteWeight?: number;
  /** True if fingerprint first seen after last deploy (regression). */
  isRegression?: boolean;
}): number {
  const recency = Math.max(0, 1 - Math.min(1, (Date.now() - input.lastSeenMs) / (24 * 3_600_000)));
  const weight = input.maxRouteWeight ?? 1;
  const impact = (Math.log10(1 + input.count) * 12 + input.users * 8 + input.paths * 3) * weight;
  const critical = input.criticalCount * 15;
  const regression = input.isRegression ? 18 : 0;
  return Math.min(100, Math.round(impact + critical + regression + recency * 20));
}
