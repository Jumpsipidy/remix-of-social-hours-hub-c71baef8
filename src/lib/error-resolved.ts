// Tracks resolved fingerprints in localStorage. When a resolved fingerprint
// reappears in a later build (different commit_sha or after `resolvedUntilBuild`),
// the Error Center marks it as a REGRESSION 🔁 — much higher severity than a
// brand-new bug because it was already fixed once.

const KEY = "admin-errors-resolved-v1";

export type ResolvedEntry = {
  fp: string;
  resolvedAt: number;
  resolvedInBuild: string; // commit_sha at time of resolution
  note?: string;
};

function safeParse(): Record<string, ResolvedEntry> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, ResolvedEntry>) : {};
  } catch { return {}; }
}

function safeWrite(v: Record<string, ResolvedEntry>) {
  try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* ignore */ }
}

export function loadResolved(): Record<string, ResolvedEntry> {
  return safeParse();
}

export function markResolved(fp: string, currentBuild: string, note?: string) {
  const all = safeParse();
  all[fp] = { fp, resolvedAt: Date.now(), resolvedInBuild: currentBuild, note };
  safeWrite(all);
}

export function unmarkResolved(fp: string) {
  const all = safeParse();
  delete all[fp];
  safeWrite(all);
}

/**
 * A regression = fingerprint was marked resolved AND we have seen at least one
 * new occurrence AFTER `resolvedAt`. We do NOT require the build sha to differ
 * because the same commit can regress via data/env changes.
 */
export function isRegression(fp: string, latestOccurrenceMs: number): boolean {
  const all = safeParse();
  const entry = all[fp];
  if (!entry) return false;
  return latestOccurrenceMs > entry.resolvedAt + 30_000; // 30s buffer for clock skew
}
