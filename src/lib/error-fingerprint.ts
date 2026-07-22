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

export function normalizeMessage(raw: string | undefined | null): string {
  if (!raw) return "(no message)";
  return String(raw)
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
  const frame = firstFrame(stack ?? "");
  const id = hash32(`${norm}|${frame}`);
  return { id, norm, frame };
}

/** Severity heuristic 0-100 for a group; higher = worse. */
export function severityScore(input: {
  count: number;
  users: number;
  paths: number;
  criticalCount: number;
  lastSeenMs: number;
}): number {
  const recency = Math.max(0, 1 - Math.min(1, (Date.now() - input.lastSeenMs) / (24 * 3_600_000)));
  const impact = Math.log10(1 + input.count) * 12 + input.users * 8 + input.paths * 3;
  const critical = input.criticalCount * 15;
  return Math.min(100, Math.round(impact + critical + recency * 20));
}
